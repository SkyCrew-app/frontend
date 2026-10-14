import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import MyReservations from '../page';
import {
  DELETE_RESERVATION,
  GET_MY_INSTRUCTION_RESERVATIONS,
  GET_MY_TEMPLATES,
  GET_USER_RESERVATIONS,
} from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { canCancelReservation, canEditReservation } from '@/lib/reservation-status';

const USER_ID = 42;

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/components/hooks/userHooks', () => ({
  useCurrentUser: () => 'pilote@example.com',
  useUserData: () => ({ id: 42 }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// The bookings below are on 20 October 2026: the tests run a week before, whatever the
// day they are run. Only the clock is frozen; timers keep running for Apollo.
const TODAY = new Date('2026-10-13T08:00:00');
beforeAll(() => {
  jest.useFakeTimers({
    now: TODAY,
    doNotFake: [
      'nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'queueMicrotask', 'performance', 'hrtime', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback',
    ],
  });
});
afterAll(() => jest.useRealTimers());

const reservation = (id: number, registration: string, overrides: object = {}) => ({
  id,
  start_time: '2026-10-20T09:00:00',
  end_time: '2026-10-20T11:00:00',
  purpose: `Vol ${registration}`,
  flight_category: 'TRAINING',
  status: 'CONFIRMED',
  notes: null,
  charged_amount: 300,
  aircraft: { id, registration_number: registration },
  user: { id: USER_ID, first_name: 'Alex', last_name: 'Martin' },
  instructor: null,
  flights: [],
  ...overrides,
});

const OPEN = reservation(1, 'F-OPEN');
const WITH_PLAN = reservation(2, 'F-PLAN', { flights: [{ id: 20, closed_at: null }] });
const CANCELLED = reservation(3, 'F-CANC', { status: 'CANCELLED' });
const FLOWN = reservation(4, 'F-DONE', { flights: [{ id: 40, closed_at: '2026-10-20T11:30:00.000Z' }] });
// Started an hour before the frozen clock.
const STARTED = reservation(5, 'F-PAST', { start_time: '2026-10-13T07:00:00', end_time: '2026-10-13T09:00:00' });

const reservationsMock = (userReservations: object[]): MockedResponse => ({
  request: { query: GET_USER_RESERVATIONS, variables: { userId: USER_ID } },
  result: { data: { userReservations } },
});

const staticMocks: MockedResponse[] = [
  { request: { query: GET_MY_TEMPLATES }, result: { data: { myReservationTemplates: [] } } },
  { request: { query: GET_AIRCRAFTS }, result: { data: { getAircrafts: [] } } },
];

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={[...staticMocks, ...mocks]} addTypename={false}>
      <MyReservations />
    </MockedProvider>,
  );

const cardOf = (registration: string) => {
  const card = screen.getByText(registration).closest('.flex.h-full');
  if (!card) throw new Error(`Carte ${registration} introuvable`);
  return within(card as HTMLElement);
};

describe('canCancelReservation', () => {
  it('autorise une réservation en attente ou confirmée, avec ou sans plan de vol ouvert', () => {
    expect(canCancelReservation({ status: 'PENDING' })).toBe(true);
    expect(canCancelReservation({ status: 'CONFIRMED', flights: [] })).toBe(true);
    expect(canCancelReservation({ status: 'CONFIRMED', flights: [{ closed_at: null }] })).toBe(true);
  });

  it('refuse une réservation déjà annulée ou dont le vol est clôturé', () => {
    expect(canCancelReservation({ status: 'CANCELLED' })).toBe(false);
    expect(canCancelReservation({ status: 'cancelled' })).toBe(false);
    expect(
      canCancelReservation({ status: 'CONFIRMED', flights: [{ closed_at: null }, { closed_at: '2026-10-20T11:30:00Z' }] }),
    ).toBe(false);
  });
});

describe('règles de modification et d’annulation, les mêmes que celles de l’API', () => {
  const booking = { status: 'CONFIRMED', start_time: '2026-10-13T10:00:00', flights: [] };

  it('laisse le membre annuler jusqu’à l’heure de début, pas après', () => {
    expect(canCancelReservation(booking, { now: new Date('2026-10-13T09:59:00') })).toBe(true);
    expect(canCancelReservation(booking, { now: new Date('2026-10-13T10:00:00') })).toBe(true);
    expect(canCancelReservation(booking, { now: new Date('2026-10-13T10:00:01') })).toBe(false);
  });

  it('laisse un administrateur annuler après le début, sauf si le vol est clôturé', () => {
    const later = new Date('2026-10-14T10:00:00');
    expect(canCancelReservation(booking, { isAdmin: true, now: later })).toBe(true);
    expect(
      canCancelReservation({ ...booking, flights: [{ closed_at: '2026-10-13T12:00:00Z' }] }, { isAdmin: true, now: later }),
    ).toBe(false);
  });

  it('ne laisse modifier une réservation qu’avant son début', () => {
    expect(canEditReservation(booking, new Date('2026-10-13T09:00:00'))).toBe(true);
    expect(canEditReservation(booking, new Date('2026-10-13T10:30:00'))).toBe(false);
    expect(canEditReservation({ ...booking, status: 'CANCELLED' }, new Date('2026-10-13T09:00:00'))).toBe(false);
  });
});

describe('Mes réservations — filtres', () => {
  it('ne propose pas de filtre par statut : une réservation est confirmée à sa création et supprimée à son annulation', async () => {
    renderPage([reservationsMock([OPEN, WITH_PLAN])]);
    await screen.findByText('F-OPEN');

    expect(screen.getByRole('combobox', { name: 'Filtrer par catégorie de vol' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filtrer par statut' })).not.toBeInTheDocument();
    expect(screen.queryByText('Tous les statuts')).not.toBeInTheDocument();
    expect(screen.queryByText('Annulée')).not.toBeInTheDocument();
  });
});

describe('Mes réservations — annulation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('propose l’annulation sauf pour une réservation annulée ou un vol clôturé', async () => {
    renderPage([reservationsMock([OPEN, WITH_PLAN, CANCELLED, FLOWN])]);
    await screen.findByText('F-OPEN');

    expect(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation de F-OPEN' })).toBeInTheDocument();
    expect(cardOf('F-PLAN').getByRole('button', { name: 'Annuler la réservation de F-PLAN' })).toBeInTheDocument();
    expect(cardOf('F-CANC').queryByRole('button', { name: 'Annuler la réservation de F-CANC' })).not.toBeInTheDocument();
    expect(cardOf('F-DONE').queryByRole('button', { name: 'Annuler la réservation de F-DONE' })).not.toBeInTheDocument();
  });

  it('ne propose ni modification ni annulation pour une réservation commencée', async () => {
    renderPage([reservationsMock([OPEN, STARTED])]);
    await screen.findByText('F-PAST');

    expect(cardOf('F-PAST').queryByRole('button', { name: 'Annuler la réservation de F-PAST' })).not.toBeInTheDocument();
    expect(cardOf('F-PAST').queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(cardOf('F-OPEN').getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
  });

  it('affiche le prix payé, celui que l’API a enregistré', async () => {
    renderPage([reservationsMock([{ ...OPEN, charged_amount: 123.45 }])]);
    await screen.findByText('F-OPEN');

    expect(cardOf('F-OPEN').getByText(/123,45\s€/)).toBeInTheDocument();
  });

  it('affiche le refus de l’API tel qu’elle l’a écrit pour le membre', async () => {
    const refusal = 'Cette réservation a commencé : seul un administrateur peut l’annuler';
    renderPage([
      reservationsMock([OPEN]),
      {
        request: { query: DELETE_RESERVATION, variables: { id: 1 } },
        result: { errors: [new GraphQLError(refusal, { extensions: { code: 'FORBIDDEN' } })] },
      },
    ]);
    await screen.findByText('F-OPEN');

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation de F-OPEN' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Annuler la réservation' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Annulation impossible',
        description: refusal,
      }),
    );
  });

  it('demande confirmation en nommant la réservation, puis annule et rafraîchit la liste', async () => {
    const deleteResult = jest.fn(() => ({ data: { deleteReservation: true } }));
    renderPage([
      reservationsMock([OPEN, WITH_PLAN]),
      { request: { query: DELETE_RESERVATION, variables: { id: 1 } }, result: deleteResult },
      reservationsMock([WITH_PLAN]),
    ]);
    await screen.findByText('F-OPEN');

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation de F-OPEN' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Annuler cette réservation ?')).toBeInTheDocument();
    expect(within(dialog).getByText(/La réservation de F-OPEN du 20 oct\. 2026, de 09:00 à 11:00, sera annulée/)).toBeInTheDocument();
    // The refund is the amount charged for the booking, said before confirming.
    expect(within(dialog).getByText(/300,00\s€ vous seront remboursés sur votre solde/)).toBeInTheDocument();
    // Nothing is sent before the confirmation.
    expect(deleteResult).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler la réservation' }));

    await waitFor(() => expect(deleteResult).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('F-OPEN')).not.toBeInTheDocument());
    expect(screen.getByText('F-PLAN')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Réservation annulée',
      description: 'La réservation de F-OPEN a été annulée.',
    });
  });

  it('ne supprime rien quand le membre conserve sa réservation', async () => {
    const deleteResult = jest.fn(() => ({ data: { deleteReservation: true } }));
    renderPage([
      reservationsMock([OPEN]),
      { request: { query: DELETE_RESERVATION, variables: { id: 1 } }, result: deleteResult },
    ]);
    await screen.findByText('F-OPEN');

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation de F-OPEN' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Conserver la réservation' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(deleteResult).not.toHaveBeenCalled();
    expect(screen.getByText('F-OPEN')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('prévient quand l’annulation échoue et garde la réservation', async () => {
    renderPage([
      reservationsMock([OPEN]),
      { request: { query: DELETE_RESERVATION, variables: { id: 1 } }, error: new Error('Forbidden') },
    ]);
    await screen.findByText('F-OPEN');

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation de F-OPEN' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Annuler la réservation' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', title: 'Annulation impossible' }),
      ),
    );
    expect(screen.getByText('F-OPEN')).toBeInTheDocument();
  });

  it('propose aussi l’annulation depuis le panneau de modification', async () => {
    renderPage([reservationsMock([OPEN])]);
    await screen.findByText('F-OPEN');

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Modifier' }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Annuler la réservation' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('La réservation de F-OPEN');
  });
});

describe('Mes réservations — comme instructeur', () => {
  const me = { id: USER_ID, first_name: 'Alex', last_name: 'Martin' };
  const student = { id: 9, first_name: 'Emma', last_name: 'Girard' };
  const LESSON = reservation(7, 'F-ECOL', { user: student, instructor: me, flight_category: 'INSTRUCTION' });
  const instructionMock = (myInstructionReservations: object[]): MockedResponse => ({
    request: { query: GET_MY_INSTRUCTION_RESERVATIONS },
    result: { data: { myInstructionReservations } },
  });
  const openTab = async () => {
    const tab = await screen.findByRole('tab', { name: 'Comme instructeur (1)' });
    fireEvent.mouseDown(tab);
    fireEvent.click(tab);
  };

  it('n’offre pas l’onglet à un membre qui n’instruit aucun vol', async () => {
    renderPage([reservationsMock([OPEN]), instructionMock([])]);
    await screen.findByText('F-OPEN');

    expect(screen.queryByRole('tab', { name: /Comme instructeur/ })).not.toBeInTheDocument();
  });

  it('liste les vols où le membre est instructeur, avec l’élève', async () => {
    renderPage([reservationsMock([OPEN]), instructionMock([LESSON])]);
    await openTab();

    const card = cardOf('F-ECOL');
    expect(card.getByText('Emma Girard')).toBeInTheDocument();
    expect(card.getByText('Vol d\'instruction')).toBeInTheDocument();
    // Its own bookings are not mixed in.
    expect(screen.queryByText('F-OPEN')).not.toBeInTheDocument();
  });

  it('laisse l’instructeur décliner un vol à venir, après confirmation', async () => {
    const deleteResult = jest.fn(() => ({ data: { deleteReservation: true } }));
    renderPage([
      reservationsMock([OPEN]),
      instructionMock([LESSON]),
      { request: { query: DELETE_RESERVATION, variables: { id: 7 } }, result: deleteResult },
      reservationsMock([OPEN]),
      instructionMock([]),
    ]);
    await openTab();

    fireEvent.click(cardOf('F-ECOL').getByRole('button', { name: 'Décliner le vol' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText("Décliner ce vol d'instruction ?")).toBeInTheDocument();
    expect(within(dialog).getByText(/L'élève sera prévenu et remboursé/)).toBeInTheDocument();
    expect(deleteResult).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Décliner le vol' }));

    await waitFor(() => expect(deleteResult).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('F-ECOL')).not.toBeInTheDocument());
  });

  it('ne propose plus de décliner un vol commencé', async () => {
    renderPage([
      reservationsMock([OPEN]),
      instructionMock([{ ...LESSON, start_time: STARTED.start_time, end_time: STARTED.end_time }]),
    ]);
    await openTab();

    expect(cardOf('F-ECOL').queryByRole('button', { name: 'Décliner le vol' })).not.toBeInTheDocument();
  });

  it('montre au pilote l’instructeur de sa réservation', async () => {
    renderPage([reservationsMock([reservation(8, 'F-DUAL', { instructor: { id: 3, first_name: 'Marie', last_name: 'Laurent' } })])]);
    await screen.findByText('F-DUAL');

    expect(cardOf('F-DUAL').getByText('Marie Laurent')).toBeInTheDocument();
  });
});
