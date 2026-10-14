import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import AdminHomePage from '../page';
import {
  GET_ADMIN_DASHBOARD_STATS,
  GET_RECENT_FLIGHTS,
  GET_RECENT_INCIDENTS,
  GET_RECENT_RESERVATIONS,
} from '@/graphql/admin';
import { formatDate } from '@/lib/format';

// Dates sans suffixe "Z" : interprétées en heure locale, donc indépendantes du fuseau horaire.
const date = (iso: string) => formatDate(iso).replace(/\s/g, ' ');

const stats = {
  totalUsers: 12,
  totalAircrafts: 3,
  totalReservations: 40,
  totalFlights: 25,
  totalIncidents: 3,
  availableAircrafts: 3,
  pendingReservations: 0,
  flightHoursThisMonth: 12.5,
  usersByRole: [{ roleId: 1, role_name: 'Pilote', count: 12 }],
  reservationsByCategory: [{ flight_category: 'LOCAL', count: 40 }],
};

const pilot = { id: 5, first_name: 'Léa', last_name: 'Martin' };

const flight = (id: number, dates: { start_time?: string; departure_time?: string; closed_at?: string }) => ({
  id,
  flight_hours: 1.5,
  flight_type: 'VFR',
  origin_icao: `LFA${id}`,
  destination_icao: 'LFOB',
  departure_time: dates.departure_time ?? null,
  closed_at: dates.closed_at ?? null,
  reservation: dates.start_time ? { id: id * 10, start_time: dates.start_time } : null,
  user: pilot,
});

const flights = [
  flight(1, { start_time: '2026-10-05T12:45:00', departure_time: '2026-10-06T13:00:00' }),
  flight(2, { departure_time: '2026-09-12T08:00:00', closed_at: '2026-09-13T08:00:00' }),
  flight(3, { closed_at: '2026-08-20T18:00:00' }),
  flight(4, {}),
];

const incident = (id: number, registration: string, severity_level: string, status: string) => ({
  id,
  incident_date: `2026-10-0${id}T10:00:00`,
  description: `Incident numéro ${id}`,
  severity_level,
  status,
  aircraft: { id, registration_number: registration, model: 'Cessna 172' },
});

const incidents = [
  incident(1, 'F-ABCD', 'high', 'Ouvert'),
  incident(2, 'F-WXYZ', 'Modéré', 'in_progress'),
  incident(3, 'F-GHIJ', 'Élevé', 'Résolu'),
];

const mocks: MockedResponse[] = [
  { request: { query: GET_ADMIN_DASHBOARD_STATS }, result: { data: { adminDashboardStats: stats } } },
  {
    request: { query: GET_RECENT_RESERVATIONS, variables: { limit: 5 } },
    result: { data: { recentReservations: [] } },
  },
  { request: { query: GET_RECENT_FLIGHTS, variables: { limit: 5 } }, result: { data: { recentFlights: flights } } },
  {
    request: { query: GET_RECENT_INCIDENTS, variables: { limit: 5 } },
    result: { data: { recentIncidents: incidents } },
  },
];

const renderPage = (withStats: Partial<typeof stats> = {}, recentReservations: unknown[] = []) =>
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: GET_ADMIN_DASHBOARD_STATS },
          result: { data: { adminDashboardStats: { ...stats, ...withStats } } },
        },
        {
          request: { query: GET_RECENT_RESERVATIONS, variables: { limit: 5 } },
          result: { data: { recentReservations } },
        },
        ...mocks.slice(2),
      ]}
      addTypename={false}
    >
      <AdminHomePage />
    </MockedProvider>,
  );

describe('AdminHomePage', () => {
  it('nomme les catégories de vol comme le formulaire de réservation', async () => {
    const booking = (id: number, flight_category: string) => ({
      id,
      start_time: '2026-10-20T10:00:00',
      end_time: '2026-10-20T11:00:00',
      status: 'confirmed',
      flight_category,
      aircraft: { id: 1, registration_number: `F-AB${id}`, model: 'DR400' },
      user: pilot,
    });
    renderPage({}, [booking(1, 'CROSS_COUNTRY'), booking(2, 'CORPORATE'), booking(3, 'SOMETHING_ELSE')]);

    expect(await screen.findByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Affaires')).toBeInTheDocument();
    expect(screen.getByText('Autre')).toBeInTheDocument();
    expect(screen.queryByText('Voyage')).not.toBeInTheDocument();
    expect(screen.queryByText('Entreprise')).not.toBeInTheDocument();
  });

  it('doit dater chaque vol récent : réservation, sinon départ, sinon clôture, sinon un tiret', async () => {
    renderPage();

    const planned = await screen.findByRole('link', { name: /LFA1 → LFOB/ });
    expect(planned).toHaveAttribute('href', '/reservations/flight-plans/1');
    expect(planned).toHaveTextContent(date('2026-10-05T12:45:00'));
    expect(planned).not.toHaveTextContent(date('2026-10-06T13:00:00'));
    expect(planned).toHaveTextContent('Léa Martin');
    expect(planned).toHaveTextContent('1 h 30');

    expect(screen.getByRole('link', { name: /LFA2 → LFOB/ })).toHaveTextContent(date('2026-09-12T08:00:00'));
    expect(screen.getByRole('link', { name: /LFA3 → LFOB/ })).toHaveTextContent(date('2026-08-20T18:00:00'));
    expect(screen.getByRole('link', { name: /LFA4 → LFOB/ })).toHaveTextContent('— · Léa Martin');
  });

  it('doit relier les derniers incidents à la page de suivi, avec les mêmes libellés', async () => {
    renderPage();

    const open = await screen.findByRole('link', { name: /Incident numéro 1/ });
    expect(open).toHaveAttribute('href', '/administration/incidents?incident=1');
    expect(within(open).getByText('F-ABCD')).toBeInTheDocument();
    expect(within(open).getByText('Gravité élevée')).toBeInTheDocument();
    expect(within(open).getByText('Ouvert')).toBeInTheDocument();

    const inProgress = screen.getByRole('link', { name: /Incident numéro 2/ });
    expect(inProgress).toHaveAttribute('href', '/administration/incidents?incident=2');
    expect(within(inProgress).getByText('Gravité moyenne')).toBeInTheDocument();
    expect(within(inProgress).getByText('En cours')).toBeInTheDocument();

    const resolved = screen.getByRole('link', { name: /Incident numéro 3/ });
    expect(within(resolved).getByText('Gravité élevée')).toBeInTheDocument();
    expect(within(resolved).getByText('Résolu')).toBeInTheDocument();

    // Aucun code brut dans la carte.
    const card = open.closest('ul') as HTMLElement;
    expect(card.textContent).not.toMatch(/\b(high|in_progress|Modéré)\b/);

    expect(screen.getByRole('link', { name: 'Tout voir' })).toHaveAttribute('href', '/administration/incidents');
  });

  it('doit signaler les incidents graves non résolus et mener à leur suivi', async () => {
    renderPage();

    // L'incident grave déjà résolu n'est plus à traiter.
    const attention = await screen.findByRole('link', { name: /1 incident récent de gravité élevée/ });
    expect(attention).toHaveAttribute('href', '/administration/incidents');
    expect(attention).toHaveTextContent('F-ABCD');
    expect(attention).not.toHaveTextContent('F-GHIJ');
  });

  it('ne parle pas de réservations en attente : une réservation est confirmée dès sa création', async () => {
    renderPage({ pendingReservations: 2, totalAircrafts: 4, availableAircrafts: 3 });

    const grounded = await screen.findByRole('link', { name: /1 avion indisponible/ });
    expect(grounded).toHaveTextContent('Immobilisés pour une maintenance, un incident ou un audit.');
    expect(screen.queryByText(/en attente/)).not.toBeInTheDocument();
  });
});
