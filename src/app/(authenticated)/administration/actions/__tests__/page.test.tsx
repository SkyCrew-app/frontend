import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import AdminActionsPage from '../page';
import { GET_ADMIN_ACTIONS, GET_ADMIN_ACTION_NAMES } from '@/graphql/admin';
import { GET_USERS } from '@/graphql/user';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// Radix selects rely on pointer APIs jsdom does not have.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  created_at: '2026-10-12T14:30:00.000Z',
  actor_id: 1,
  actor_label: 'Anne Martin',
  action: 'member.role_changed',
  target_type: 'member',
  target_id: '7',
  target_label: 'Jean Dupont',
  summary: { from: 'Pilote', to: 'Instructeur' },
  ...overrides,
});

const actionsMock = (
  variables: { memberId?: number | null; action?: string | null; page?: number },
  items: ReturnType<typeof entry>[],
  total = items.length,
): MockedResponse => ({
  request: {
    query: GET_ADMIN_ACTIONS,
    variables: { memberId: null, action: null, page: 1, pageSize: 25, ...variables },
  },
  result: { data: { adminActions: { total, page: variables.page ?? 1, pageSize: 25, items } } },
});

const filtersMocks: MockedResponse[] = [
  {
    request: { query: GET_USERS },
    result: {
      data: {
        getUsers: [
          {
            id: '7',
            first_name: 'Jean',
            last_name: 'Dupont',
            email: 'jean@club.fr',
            phone_number: null,
            date_of_birth: null,
            is2FAEnabled: false,
            isEmailConfirmed: true,
            is_active: true,
            role: { id: 2, role_name: 'Pilote' },
          },
        ],
      },
    },
  },
  {
    request: { query: GET_ADMIN_ACTION_NAMES },
    result: { data: { adminActionNames: ['member.role_changed', 'balance.adjusted'] } },
  },
];

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={[...filtersMocks, ...mocks]} addTypename={false}>
      <AdminActionsPage />
    </MockedProvider>,
  );

describe('Journal des actions', () => {
  it('liste qui a fait quoi, sur quoi, avec le détail', async () => {
    renderPage([
      actionsMock({}, [
        entry(),
        entry({
          id: 2,
          action: 'balance.adjusted',
          summary: { direction: 'credit', amount: 50, method: 'cash', reason: 'Espèces au club' },
        }),
      ]),
    ]);

    expect(screen.getByRole('heading', { level: 1, name: 'Journal des actions' })).toBeInTheDocument();
    const rows = await screen.findAllByRole('row');
    // Header, then one row per action.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Anne Martin');
    expect(rows[1]).toHaveTextContent("Rôle d'un membre modifié");
    expect(rows[1]).toHaveTextContent('Membre : Jean Dupont');
    expect(rows[1]).toHaveTextContent('Pilote → Instructeur');
    expect(rows[2]).toHaveTextContent('Écriture manuelle sur un compte');
    expect(rows[2]).toHaveTextContent('Sens : crédit');
    expect(rows[2]).toHaveTextContent('Motif : Espèces au club');
    expect(screen.getByText(/1–2 sur 2 actions/)).toBeInTheDocument();
  });

  it("demande à l'API les actions d'un membre et d'un type donnés", async () => {
    const user = userEvent.setup();
    const filtered = jest.fn(() => ({
      data: { adminActions: { total: 1, page: 1, pageSize: 25, items: [entry({ id: 9 })] } },
    }));
    renderPage([
      actionsMock({}, [entry(), entry({ id: 2, action: 'balance.adjusted', summary: null })]),
      actionsMock({ memberId: 7 }, [entry()]),
      {
        request: {
          query: GET_ADMIN_ACTIONS,
          variables: { memberId: 7, action: 'member.role_changed', page: 1, pageSize: 25 },
        },
        result: filtered,
      },
    ]);
    await screen.findAllByText('Anne Martin');

    await user.click(screen.getByRole('combobox', { name: 'Membre concerné' }));
    await user.click(await screen.findByRole('option', { name: 'Dupont Jean' }));
    await user.click(screen.getByRole('combobox', { name: "Type d'action" }));
    await user.click(await screen.findByRole('option', { name: "Rôle d'un membre modifié" }));

    await waitFor(() => expect(filtered).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Effacer les filtres' })).toBeInTheDocument();
  });

  it('passe à la page suivante', async () => {
    const user = userEvent.setup();
    const secondPage = jest.fn(() => ({
      data: {
        adminActions: { total: 30, page: 2, pageSize: 25, items: [entry({ id: 26, actor_label: 'Paul Durand' })] },
      },
    }));
    renderPage([
      actionsMock({}, [entry()], 30),
      { request: { query: GET_ADMIN_ACTIONS, variables: { memberId: null, action: null, page: 2, pageSize: 25 } }, result: secondPage },
    ]);
    await screen.findAllByText('Anne Martin');

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    // The table (wide screens) and the cards (phones) both show it.
    expect((await screen.findAllByText('Paul Durand')).length).toBeGreaterThan(0);
    expect(secondPage).toHaveBeenCalledTimes(1);
  });

  it("dit qu'il n'y a encore rien quand le journal est vide", async () => {
    renderPage([actionsMock({}, [])]);

    const table = await screen.findByRole('table');
    expect(await within(table).findByText('Aucune action enregistrée')).toBeInTheDocument();
  });

  it("propose de réessayer quand le journal n'a pas pu être chargé", async () => {
    renderPage([
      {
        request: { query: GET_ADMIN_ACTIONS, variables: { memberId: null, action: null, page: 1, pageSize: 25 } },
        error: new Error('network'),
      },
    ]);

    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
