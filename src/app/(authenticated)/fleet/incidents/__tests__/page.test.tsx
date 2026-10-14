import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import FleetIncidentsPage from '../page';
import { CREATE_INCIDENT, DELETE_INCIDENT, GET_INCIDENTS_FOR_MEMBERS } from '@/graphql/incident';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import type { Incident } from '@/lib/incident';

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  // The severity radios measure themselves.
  global.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/fleet/incidents',
  useSearchParams: () => new URLSearchParams(''),
}));
const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

let mockRole = 'Pilote';
jest.mock('@/components/hooks/userHooks', () => ({
  useCurrentUser: () => 'membre@club.fr',
  useUserData: () => ({ id: 5, role: { role_name: mockRole } }),
}));

const incident = (id: number, status: string, date: string, registration: string, description: string): Incident => ({
  id,
  incident_date: date,
  description,
  damage_report: null,
  corrective_actions: null,
  severity_level: 'Modéré',
  status,
  priority: 'Moyenne',
  category: 'Avionique',
  resolution_note: null,
  resolved_at: null,
  resolved_by: null,
  aircraft: { id, registration_number: registration, model: 'Cessna 172', availability_status: 'AVAILABLE' },
  hasFlight: false,
  flight: null,
  user: { id: 9, first_name: 'Léa', last_name: 'Martin', email: 'lea@club.fr' },
});

// Every field of the fleet query, as the report panel asks for the list of aircraft.
const aircraft = {
  availability_status: 'AVAILABLE',
  maintenance_status: 'OPERATIONAL',
  hourly_cost: 150,
  year_of_manufacture: 2012,
  total_flight_hours: 1250,
  image_url: null,
  documents_url: [],
  consumption: 30,
  cruiseSpeed: 200,
  maxAltitude: 4000,
  fuel_capacity: 110,
  fuel_type: 'AVGAS 100LL',
  empty_weight: 600,
  max_takeoff_weight: 1000,
  maintenances: [],
};

const membersMock: MockedResponse = {
  request: { query: GET_INCIDENTS_FOR_MEMBERS },
  result: {
    data: {
      open: [incident(1, 'Ouvert', '2026-09-01T10:00:00', 'F-ABCD', 'Radio muette')],
      inProgress: [incident(2, 'En cours', '2026-10-05T10:00:00', 'F-WXYZ', 'Pneu avant usé')],
      resolved: [incident(3, 'Résolu', '2026-08-01T10:00:00', 'F-GHIJ', 'Voyant alternateur')],
    },
  },
};

const renderPage = (extra: MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={[membersMock, ...extra]} addTypename={false}>
      <FleetIncidentsPage />
    </MockedProvider>,
  );

describe('Incidents de la flotte', () => {
  beforeEach(() => {
    mockRole = 'Pilote';
  });

  it('montre à un pilote tous les incidents, le plus récent en premier, sans action de suivi', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Incidents' })).toBeInTheDocument();
    await screen.findByText('F-WXYZ');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).queryByText(/^F-/)?.textContent)).toEqual(['F-WXYZ', 'F-ABCD', 'F-GHIJ']);
    expect(screen.queryByRole('link', { name: 'Suivre les incidents' })).not.toBeInTheDocument();

    await user.click(rows[0]);
    const panel = within(await screen.findByRole('dialog'));
    expect(panel.getByText('Pneu avant usé')).toBeInTheDocument();
    expect(panel.queryByRole('button', { name: /Marquer comme résolu|Prendre en charge|Rouvrir|Enregistrer la note/ })).not.toBeInTheDocument();
  });

  it("mène le personnel au suivi des incidents de l'administration", async () => {
    mockRole = 'Technicien';
    renderPage();

    expect(screen.getByRole('link', { name: 'Suivre les incidents' })).toHaveAttribute('href', '/administration/incidents');
  });

  it("laisse un membre signaler un incident sans vol, et prévient qu'une gravité élevée immobilise l'avion", async () => {
    mockToast.mockClear();
    const user = userEvent.setup();
    const fleet: MockedResponse = {
      request: { query: GET_AIRCRAFTS },
      result: {
        data: {
          getAircrafts: [
            { ...aircraft, id: 4, registration_number: 'F-GHIJ', model: 'Robin DR400' },
            { ...aircraft, id: 6, registration_number: 'F-KLMN', model: 'Cessna 152' },
          ],
        },
      },
    };
    let sent: Record<string, unknown> | undefined;
    const created: MockedResponse = {
      request: { query: CREATE_INCIDENT },
      variableMatcher: (variables) => {
        sent = variables.incident;
        return true;
      },
      result: {
        data: {
          createIncident: {
            id: 12,
            incident_date: '2026-10-14T08:00:00.000Z',
            severity_level: 'high',
            description: 'Fuite d’huile sous le capot',
            damage_report: null,
            corrective_actions: null,
            status: 'Ouvert',
            priority: 'high',
            category: 'mechanical',
          },
        },
      },
    };
    renderPage([fleet, created, membersMock]);
    await screen.findByText('F-WXYZ');

    await user.click(screen.getByRole('button', { name: 'Signaler un incident' }));
    const panel = within(await screen.findByRole('dialog', { name: 'Signaler un incident' }));

    // Nothing is sent without the aircraft, the severity and a description.
    await user.click(panel.getByRole('button', { name: "Signaler l'incident" }));
    expect(panel.getByText("Choisissez l'avion concerné.")).toBeInTheDocument();
    expect(panel.getByText('Indiquez la gravité.')).toBeInTheDocument();
    expect(panel.getByText("Décrivez l'incident.")).toBeInTheDocument();

    await user.click(panel.getByRole('combobox', { name: /Avion/ }));
    await user.click(await screen.findByRole('option', { name: /F-KLMN/ }));
    await user.click(panel.getByRole('radio', { name: 'Élevée' }));
    expect(panel.getByText(/Une gravité élevée immobilise l'avion dès le signalement/)).toHaveClass('text-destructive');
    await user.type(panel.getByRole('textbox', { name: /Description/ }), 'Fuite d’huile sous le capot');
    await user.click(panel.getByRole('button', { name: "Signaler l'incident" }));

    await screen.findByText('F-WXYZ');
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Incident signalé',
        description: expect.stringContaining('F-KLMN est immobilisé'),
      }),
    );
    expect(sent).toEqual(
      expect.objectContaining({
        aircraft_id: 6,
        severity_level: 'high',
        priority: 'high',
        category: 'other',
        description: 'Fuite d’huile sous le capot',
        status: 'Ouvert',
      }),
    );
    // No flight and no author: the API takes the member signed in.
    expect(sent).not.toHaveProperty('flight_id');
    expect(sent).not.toHaveProperty('user_id');
  });

  describe('le signalement de son auteur', () => {
    // The signed-in member is 5 (see the mock of userHooks).
    const mine = (overrides: Partial<Incident> = {}) => ({
      ...incident(1, 'Ouvert', '2026-09-01T10:00:00', 'F-ABCD', 'Radio muette'),
      user: { id: 5, first_name: 'Paul', last_name: 'Roy', email: 'paul@club.fr' },
      ...overrides,
    });
    const listOf = (open: Incident[], inProgress: Incident[] = []): MockedResponse => ({
      request: { query: GET_INCIDENTS_FOR_MEMBERS },
      result: { data: { open, inProgress, resolved: [] } },
    });

    it('propose de le supprimer tant que personne ne l’a pris en charge, après confirmation', async () => {
      mockToast.mockClear();
      const user = userEvent.setup();
      const deleted = jest.fn(() => ({ data: { deleteIncident: true } }));
      render(
        <MockedProvider
          mocks={[
            listOf([mine()]),
            { request: { query: DELETE_INCIDENT, variables: { id: '1' } }, result: deleted },
            listOf([]),
          ]}
          addTypename={false}
        >
          <FleetIncidentsPage />
        </MockedProvider>,
      );
      await user.click(await screen.findByText('Radio muette'));
      const panel = within(await screen.findByRole('dialog'));
      expect(panel.getByText(/personne ne l'a encore pris en charge/)).toBeInTheDocument();
      await user.click(panel.getByRole('button', { name: 'Supprimer mon signalement' }));

      const confirm = within(await screen.findByRole('alertdialog'));
      expect(confirm.getByText('Supprimer votre signalement ?')).toBeInTheDocument();
      expect(confirm.getByText(/sur F-ABCD sera supprimé définitivement/)).toBeInTheDocument();
      expect(deleted).not.toHaveBeenCalled();
      await user.click(confirm.getByRole('button', { name: 'Supprimer mon signalement' }));

      await screen.findByText(/Aucun incident/);
      expect(deleted).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Signalement supprimé',
        description: "L'incident a été retiré de la liste.",
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it.each([
      ['un incident signalé par un autre membre', mine({ user: { id: 9, first_name: 'Léa', last_name: 'Martin' } })],
      ['un incident pris en charge', mine({ status: 'En cours' })],
      ['un incident qui porte une note du suivi', mine({ resolution_note: 'Vu par le technicien' })],
    ])('ne le propose pas pour %s', async (_label, shown) => {
      const user = userEvent.setup();
      render(
        <MockedProvider mocks={[listOf([shown])]} addTypename={false}>
          <FleetIncidentsPage />
        </MockedProvider>,
      );
      await user.click(await screen.findByText('Radio muette'));
      const panel = within(await screen.findByRole('dialog'));
      expect(panel.queryByRole('button', { name: 'Supprimer mon signalement' })).not.toBeInTheDocument();
    });
  });
});
