import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import MembersPage from '../page';
import { DELETE_USER, GET_USERS, RESEND_INVITATION, SET_USER_ACTIVE } from '@/graphql/user';
import { GET_ROLES } from '@/graphql/roles';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const member = (overrides: Record<string, unknown> = {}) => ({
  id: '7',
  first_name: 'Camille',
  last_name: 'Martin',
  email: 'camille@exemple.fr',
  phone_number: '0612345678',
  date_of_birth: '1990-05-12T00:00:00.000Z',
  is2FAEnabled: false,
  isEmailConfirmed: true,
  is_active: true,
  role: { id: 2, role_name: 'Pilote' },
  ...overrides,
});

const usersMock = (users: ReturnType<typeof member>[]): MockedResponse => ({
  request: { query: GET_USERS },
  result: { data: { getUsers: users } },
});
const rolesMock: MockedResponse = {
  request: { query: GET_ROLES },
  result: { data: { roles: [{ id: 2, role_name: 'Pilote' }] } },
};

// What the API answers when one of its rules refuses the request.
const refused = (message: string, statusCode: number) => ({
  errors: [new GraphQLError(message, { extensions: { originalError: { statusCode, message } } })],
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={[rolesMock, ...mocks]} addTypename={false}>
      <MembersPage />
    </MockedProvider>,
  );

const openActions = async (user: ReturnType<typeof userEvent.setup>, name = 'Camille Martin') => {
  await user.click(await screen.findByRole('button', { name: `Actions pour ${name}` }));
};

describe('Administration des membres : état du compte', () => {
  beforeEach(() => mockToast.mockClear());

  it('désactive un compte après confirmation, puis le montre désactivé', async () => {
    const user = userEvent.setup();
    const deactivated = jest.fn(() => ({ data: { setUserActive: { id: '7', is_active: false } } }));
    renderPage([
      usersMock([member()]),
      { request: { query: SET_USER_ACTIVE, variables: { id: 7, active: false } }, result: deactivated },
      usersMock([member({ is_active: false })]),
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Désactiver le compte de Camille Martin ?');
    expect(confirm).toHaveTextContent('Ses réservations, ses vols et ses factures sont conservés');
    expect(deactivated).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Désactiver' }));

    await waitFor(() => expect(deactivated).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte désactivé',
      description: 'Camille Martin ne peut plus se connecter.',
    });
    expect((await screen.findAllByText('Désactivé')).length).toBeGreaterThan(0);
  });

  it('réactive un compte désactivé sans confirmation', async () => {
    const user = userEvent.setup();
    const reactivated = jest.fn(() => ({ data: { setUserActive: { id: '7', is_active: true } } }));
    renderPage([
      usersMock([member({ is_active: false })]),
      { request: { query: SET_USER_ACTIVE, variables: { id: 7, active: true } }, result: reactivated },
      usersMock([member()]),
    ]);

    await openActions(user);
    expect(screen.queryByRole('menuitem', { name: 'Désactiver le compte' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('menuitem', { name: 'Réactiver le compte' }));

    await waitFor(() => expect(reactivated).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte réactivé',
      description: 'Camille Martin peut de nouveau se connecter.',
    });
  });

  it("affiche la raison donnée par l'API quand le dernier administrateur ne peut pas être désactivé", async () => {
    const user = userEvent.setup();
    const reason = 'Le club doit garder au moins un administrateur actif : ce compte est le dernier.';
    renderPage([
      usersMock([member()]),
      {
        request: { query: SET_USER_ACTIVE, variables: { id: 7, active: false } },
        result: refused(reason, 403),
      },
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Désactiver' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: "Le compte n'a pas pu être modifié",
        description: reason,
        variant: 'destructive',
      }),
    );
  });

  it("explique qu'un membre avec un historique se désactive au lieu de se supprimer", async () => {
    const user = userEvent.setup();
    const reason =
      'Ce membre a un historique dans le club (réservations, vols, factures…) : il ne peut pas être supprimé. Désactivez son compte à la place.';
    renderPage([
      usersMock([member()]),
      { request: { query: DELETE_USER, variables: { id: 7 } }, result: refused(reason, 409) },
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Supprimer le membre' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Supprimer Camille Martin ?');
    await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: "Le membre n'a pas pu être supprimé",
        description: reason,
        variant: 'destructive',
      }),
    );
    // The member is still listed.
    expect(screen.getByText('Camille Martin')).toBeInTheDocument();
  });

  it("renvoie l'invitation d'un membre qui n'a pas encore activé son compte", async () => {
    const user = userEvent.setup();
    const resent = jest.fn(() => ({ data: { resendInvitation: true } }));
    renderPage([
      usersMock([member({ isEmailConfirmed: false })]),
      { request: { query: RESEND_INVITATION, variables: { id: 7 } }, result: resent },
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: "Renvoyer l'invitation" }));

    await waitFor(() => expect(resent).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invitation renvoyée' }));
  });

  it("ne propose pas de renvoyer l'invitation à un compte déjà activé", async () => {
    const user = userEvent.setup();
    renderPage([usersMock([member()])]);

    await openActions(user);
    expect(await screen.findByRole('menuitem', { name: 'Désactiver le compte' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: "Renvoyer l'invitation" })).not.toBeInTheDocument();
  });
});
