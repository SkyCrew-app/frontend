import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileReservationView } from '../mobile-reservation-view';
import type { Reservation } from '@/interfaces/reservation';

const DAY = '2030-06-12';
const at = (time: string) => new Date(`${DAY}T${time}:00`);

const aircrafts = [
  { id: 1, registration_number: 'F-ABCD', model: 'DR400' },
  { id: 2, registration_number: 'F-EFGH', model: 'PA28', availability_status: 'UNAVAILABLE' },
  { id: 3, registration_number: 'F-FULL' },
];

const booking = (id: number, aircraftId: number, registration: string, start: string, end: string) =>
  ({
    id,
    start_time: `${DAY}T${start}:00`,
    end_time: `${DAY}T${end}:00`,
    purpose: 'Vol local',
    status: 'CONFIRMED',
    flight_category: 'LEISURE',
    aircraft: { id: aircraftId, registration_number: registration },
    user: { id: 7, first_name: 'Camille', last_name: 'Martin' },
  }) as unknown as Reservation;

const reservations = [
  booking(1, 1, 'F-ABCD', '10:00', '12:00'),
  booking(2, 1, 'F-ABCD', '15:00', '16:30'),
  booking(3, 3, 'F-FULL', '08:00', '18:00'),
];

const renderView = (props: Partial<React.ComponentProps<typeof MobileReservationView>> = {}) => {
  const onBookRange = jest.fn();
  render(
    <MobileReservationView
      currentDate={at('00:00')}
      aircrafts={aircrafts}
      reservations={reservations}
      selectedAircraft={null}
      setSelectedAircraft={jest.fn()}
      onViewReservation={jest.fn()}
      opening={at('08:00')}
      closing={at('18:00')}
      onBookRange={onBookRange}
      {...props}
    />,
  );
  return onBookRange;
};

const rangesOf = (registration: string) =>
  within(screen.getByRole('group', { name: `Créneaux libres de ${registration}` }))
    .queryAllByRole('button')
    .map((button) => button.textContent);

describe('MobileReservationView — créneaux libres', () => {
  it('liste par avion les plages libres dans les heures d’ouverture', () => {
    renderView();

    expect(rangesOf('F-ABCD')).toEqual(['08:00 – 10:00', '12:00 – 15:00', '16:30 – 18:00']);
    expect(rangesOf('F-EFGH')).toEqual(['08:00 – 18:00']);
    expect(rangesOf('F-FULL')).toEqual([]);
    expect(
      within(screen.getByRole('group', { name: 'Créneaux libres de F-FULL' })).getByText('Aucun créneau libre'),
    ).toBeInTheDocument();
  });

  it('signale un avion indisponible', () => {
    renderView();

    expect(
      within(screen.getByRole('group', { name: 'Créneaux libres de F-EFGH' })).getByText('Indisponible'),
    ).toBeInTheDocument();
  });

  it('transmet l’avion et la plage touchée', () => {
    const onBookRange = renderView();

    fireEvent.click(screen.getByRole('button', { name: '12:00 – 15:00' }));

    expect(onBookRange).toHaveBeenCalledTimes(1);
    const [aircraftId, range] = onBookRange.mock.calls[0];
    expect(aircraftId).toBe(1);
    expect(range.start.getTime()).toBe(at('12:00').getTime());
    expect(range.end.getTime()).toBe(at('15:00').getTime());
  });

  it('ne montre que l’avion choisi dans le filtre', () => {
    renderView({ selectedAircraft: 2 });

    expect(screen.getByRole('group', { name: 'Créneaux libres de F-EFGH' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Créneaux libres de F-ABCD' })).not.toBeInTheDocument();
  });

  it('ne propose rien pour un jour passé', () => {
    const day = '2020-01-15';
    renderView({
      opening: new Date(`${day}T08:00:00`),
      closing: new Date(`${day}T18:00:00`),
      reservations: [],
    });

    expect(rangesOf('F-ABCD')).toEqual([]);
  });

  it('garde la liste des réservations sans la section quand les horaires sont inconnus', () => {
    renderView({ opening: null, closing: null });

    expect(screen.queryByRole('heading', { name: 'Créneaux libres' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/F-ABCD/).length).toBeGreaterThan(0);
  });
});
