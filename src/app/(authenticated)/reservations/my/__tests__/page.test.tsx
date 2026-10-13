import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import MyReservations from '../page';
import { DELETE_RESERVATION, GET_MY_TEMPLATES, GET_USER_RESERVATIONS } from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { canCancelReservation } from '@/lib/reservation-status';

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

const reservation = (id: number, registration: string, overrides: object = {}) => ({
  id,
  start_time: '2026-10-20T09:00:00',
  end_time: '2026-10-20T11:00:00',
  purpose: `Vol ${registration}`,
  flight_category: 'TRAINING',
  status: 'CONFIRMED',
  notes: null,
  aircraft: { id, registration_number: registration },
  user: { id: USER_ID, first_name: 'Alex', last_name: 'Martin' },
  flights: [],
  ...overrides,
});

const OPEN = reservation(1, 'F-OPEN');
const WITH_PLAN = reservation(2, 'F-PLAN', { flights: [{ id: 20, closed_at: null }] });
const CANCELLED = reservation(3, 'F-CANC', { status: 'CANCELLED' });
const FLOWN = reservation(4, 'F-DONE', { flights: [{ id: 40, closed_at: '2026-10-20T11:30:00.000Z' }] });

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

describe('Mes réservations — annulation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('propose l’annulation sauf pour une réservation annulée ou un vol clôturé', async () => {
    renderPage([reservationsMock([OPEN, WITH_PLAN, CANCELLED, FLOWN])]);
    await screen.findByText('F-OPEN');

    expect(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation' })).toBeInTheDocument();
    expect(cardOf('F-PLAN').getByRole('button', { name: 'Annuler la réservation' })).toBeInTheDocument();
    expect(cardOf('F-CANC').queryByRole('button', { name: 'Annuler la réservation' })).not.toBeInTheDocument();
    expect(cardOf('F-DONE').queryByRole('button', { name: 'Annuler la réservation' })).not.toBeInTheDocument();
  });

  it('demande confirmation en nommant la réservation, puis annule et rafraîchit la liste', async () => {
    const deleteResult = jest.fn(() => ({ data: { deleteReservation: true } }));
    renderPage([
      reservationsMock([OPEN, WITH_PLAN]),
      { request: { query: DELETE_RESERVATION, variables: { id: 1 } }, result: deleteResult },
      reservationsMock([WITH_PLAN]),
    ]);
    await screen.findByText('F-OPEN');

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Annuler cette réservation ?')).toBeInTheDocument();
    expect(within(dialog).getByText(/La réservation de F-OPEN du 20 oct\. 2026, de 09:00 à 11:00, sera annulée/)).toBeInTheDocument();
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

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation' }));
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

    fireEvent.click(cardOf('F-OPEN').getByRole('button', { name: 'Annuler la réservation' }));
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
