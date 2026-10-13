import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import MembersPage from '../page';
import {
  DEACTIVATE_MEMBER,
  DELETE_USER,
  GET_MEMBER_COMMITMENTS,
  GET_USERS,
  RESEND_INVITATION,
  SET_USER_ACTIVE,
} from '@/graphql/user';
import { GET_ROLES } from '@/graphql/roles';
import { formatMoney } from '@/lib/format';

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

// What the API says a member still has ahead of them.
const commitmentsMock = (
  upcomingReservations: unknown[] = [],
  upcomingCourses: unknown[] = [],
  upcomingInstructionReservations: unknown[] = [],
): MockedResponse => ({
  request: { query: GET_MEMBER_COMMITMENTS, variables: { id: 7 } },
  result: {
    data: { memberCommitments: { upcomingReservations, upcomingInstructionReservations, upcomingCourses } },
  },
});
// Bookings of other members on which the member is the instructor.
const instructedBookings = [
  {
    id: 21,
    start_time: '2031-05-14T08:00:00.000Z',
    end_time: '2031-05-14T09:00:00.000Z',
    charged_amount: 120,
    aircraft: { id: 1, registration_number: 'F-GABC' },
    user: { id: 9, first_name: 'Léa', last_name: 'Petit' },
  },
  {
    id: 22,
    start_time: '2031-06-03T08:00:00.000Z',
    end_time: '2031-06-03T09:00:00.000Z',
    charged_amount: 60,
    aircraft: { id: 2, registration_number: 'F-HXYZ' },
    user: { id: 10, first_name: 'Hugo', last_name: 'Roux' },
  },
];
const twoBookings = [
  {
    id: 11,
    start_time: '2031-05-12T08:00:00.000Z',
    end_time: '2031-05-12T09:00:00.000Z',
    charged_amount: 150,
    aircraft: { id: 1, registration_number: 'F-GABC' },
  },
  {
    id: 12,
    start_time: '2031-06-02T08:00:00.000Z',
    end_time: '2031-06-02T09:00:00.000Z',
    charged_amount: 80.5,
    aircraft: { id: 2, registration_number: 'F-HXYZ' },
  },
];
const lesson = {
  id: 31,
  startTime: '2031-05-20T08:00:00.000Z',
  instructor: { id: 3, first_name: 'Paul', last_name: 'Durand' },
  student: { id: 7, first_name: 'Camille', last_name: 'Martin' },
};
const outcome = (overrides: Record<string, unknown> = {}) => ({
  user: { id: '7', is_active: false },
  upcomingReservations: 0,
  cancelledReservations: 0,
  refundedAmount: 0,
  keptReservationIds: [],
  upcomingInstructionReservations: 0,
  cancelledInstructionReservations: 0,
  refundedToStudents: 0,
  upcomingCourses: 0,
  ...overrides,
});

const openActions = async (user: ReturnType<typeof userEvent.setup>, name = 'Camille Martin') => {
  await user.click(await screen.findByRole('button', { name: `Actions pour ${name}` }));
};

describe('Administration des membres : état du compte', () => {
  beforeEach(() => mockToast.mockClear());

  // These tests used to deactivate through setUserActive, with nothing said
  // about the bookings the member still had.
  it('désactive un compte après confirmation, puis le montre désactivé', async () => {
    const user = userEvent.setup();
    const deactivated = jest.fn(() => ({ data: { deactivateMember: outcome() } }));
    renderPage([
      usersMock([member()]),
      commitmentsMock(),
      {
        request: { query: DEACTIVATE_MEMBER, variables: { id: 7, cancelUpcomingBookings: false } },
        result: deactivated,
      },
      usersMock([member({ is_active: false })]),
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Désactiver le compte de Camille Martin ?');
    expect(confirm).toHaveTextContent('Ses réservations, ses vols et ses factures sont conservés');
    expect(await within(confirm).findByText('Aucune réservation à venir.')).toBeInTheDocument();
    expect(within(confirm).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(deactivated).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Désactiver' }));

    await waitFor(() => expect(deactivated).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte désactivé',
      description: 'Camille Martin ne peut plus se connecter.',
    });
    expect((await screen.findAllByText('Désactivé')).length).toBeGreaterThan(0);
  });

  it('annonce les réservations et les cours à venir, sans rien annuler par défaut', async () => {
    const user = userEvent.setup();
    const deactivated = jest.fn(() => ({
      data: { deactivateMember: outcome({ upcomingReservations: 2, upcomingCourses: 1 }) },
    }));
    renderPage([
      usersMock([member()]),
      commitmentsMock(twoBookings, [lesson]),
      {
        request: { query: DEACTIVATE_MEMBER, variables: { id: 7, cancelUpcomingBookings: false } },
        result: deactivated,
      },
      usersMock([member({ is_active: false })]),
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));
    const confirm = await screen.findByRole('alertdialog');

    expect(await within(confirm).findByText('2 réservations à venir')).toBeInTheDocument();
    expect(confirm).toHaveTextContent('F-GABC');
    expect(confirm).toHaveTextContent('150,00 €');
    expect(confirm).toHaveTextContent('1 cours planifié');
    expect(confirm).toHaveTextContent("avec l'instructeur Paul Durand");
    const choice = within(confirm).getByRole('checkbox', {
      // The total of what the two bookings cost.
      name: `Annuler ces réservations et rembourser le membre (${formatMoney(230.5)})`,
    });
    expect(choice).not.toBeChecked();

    await user.click(within(confirm).getByRole('button', { name: 'Désactiver' }));

    await waitFor(() => expect(deactivated).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte désactivé',
      description: 'Camille Martin ne peut plus se connecter. 1 cours planifié reste à réorganiser.',
    });
  });

  it("annule et rembourse les réservations dans la même action quand l'administrateur le choisit", async () => {
    const user = userEvent.setup();
    const deactivated = jest.fn(() => ({
      data: {
        deactivateMember: outcome({
          upcomingReservations: 2,
          cancelledReservations: 1,
          refundedAmount: 150,
          keptReservationIds: [12],
        }),
      },
    }));
    renderPage([
      usersMock([member()]),
      commitmentsMock(twoBookings),
      {
        request: { query: DEACTIVATE_MEMBER, variables: { id: 7, cancelUpcomingBookings: true } },
        result: deactivated,
      },
      usersMock([member({ is_active: false })]),
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(await within(confirm).findByRole('checkbox'));
    await user.click(within(confirm).getByRole('button', { name: 'Désactiver et annuler les réservations' }));

    await waitFor(() => expect(deactivated).toHaveBeenCalledTimes(1));
    // What the API did, including the booking it could not cancel.
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte désactivé',
      description:
        `Camille Martin ne peut plus se connecter. 1 réservation annulée, ${formatMoney(150)} remboursés. 1 réservation n'a pas pu être annulée (n° 12) : traitez-la à la main.`,
    });
  });

  it("montre à part les vols qu'un instructeur devait encadrer, et prévient qu'ils restent s'ils ne sont pas annulés", async () => {
    const user = userEvent.setup();
    const deactivated = jest.fn(() => ({
      data: { deactivateMember: outcome({ upcomingInstructionReservations: 2 }) },
    }));
    renderPage([
      usersMock([member()]),
      commitmentsMock([], [], instructedBookings),
      {
        request: { query: DEACTIVATE_MEMBER, variables: { id: 7, cancelUpcomingBookings: false } },
        result: deactivated,
      },
      usersMock([member({ is_active: false })]),
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));
    const confirm = await screen.findByRole('alertdialog');

    expect(await within(confirm).findByText("2 vols à venir en tant qu'instructeur")).toBeInTheDocument();
    expect(confirm).toHaveTextContent('Aucune réservation à venir.');
    expect(confirm).toHaveTextContent("avec l'élève Léa Petit");
    expect(confirm).toHaveTextContent("avec l'élève Hugo Roux");
    // Without a booking of their own, the choice is about the students' money.
    const choice = within(confirm).getByRole('checkbox', {
      name: `Annuler ces vols d'instruction et rembourser les élèves (${formatMoney(180)})`,
    });
    expect(choice).not.toBeChecked();

    await user.click(within(confirm).getByRole('button', { name: 'Désactiver' }));

    await waitFor(() => expect(deactivated).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte désactivé',
      description:
        "Camille Martin ne peut plus se connecter. 2 vols d'instruction restent au planning sans instructeur actif : prévenez les élèves.",
    });
  });

  it("annule aussi les vols encadrés quand l'administrateur le choisit, et dit ce que les élèves récupèrent", async () => {
    const user = userEvent.setup();
    const deactivated = jest.fn(() => ({
      data: {
        deactivateMember: outcome({
          upcomingReservations: 2,
          cancelledReservations: 2,
          refundedAmount: 230.5,
          upcomingInstructionReservations: 2,
          cancelledInstructionReservations: 2,
          refundedToStudents: 180,
        }),
      },
    }));
    renderPage([
      usersMock([member()]),
      commitmentsMock(twoBookings, [], instructedBookings),
      {
        request: { query: DEACTIVATE_MEMBER, variables: { id: 7, cancelUpcomingBookings: true } },
        result: deactivated,
      },
      usersMock([member({ is_active: false })]),
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));
    const confirm = await screen.findByRole('alertdialog');
    // One choice for both lists; the member's own refund keeps its wording.
    await user.click(
      await within(confirm).findByRole('checkbox', {
        name: `Annuler ces réservations et rembourser le membre (${formatMoney(230.5)})`,
      }),
    );
    expect(confirm).toHaveTextContent(
      'Les 2 vols où ce membre est instructeur sont annulés eux aussi : chaque élève est prévenu et remboursé (180,00 € au total).',
    );
    await user.click(within(confirm).getByRole('button', { name: 'Désactiver et annuler les réservations' }));

    await waitFor(() => expect(deactivated).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Compte désactivé',
      description: `Camille Martin ne peut plus se connecter. 2 réservations annulées, ${formatMoney(230.5)} remboursés. 2 vols d'instruction annulés, ${formatMoney(180)} remboursés aux élèves.`,
    });
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
      commitmentsMock(),
      {
        request: { query: DEACTIVATE_MEMBER, variables: { id: 7, cancelUpcomingBookings: false } },
        result: refused(reason, 403),
      },
    ]);

    await openActions(user);
    await user.click(await screen.findByRole('menuitem', { name: 'Désactiver le compte' }));
    const refusedDialog = await screen.findByRole('alertdialog');
    await within(refusedDialog).findByText('Aucune réservation à venir.');
    await user.click(within(refusedDialog).getByRole('button', { name: 'Désactiver' }));

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
