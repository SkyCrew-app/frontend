import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import IncidentsPage from '../page';
import { GET_ALL_INCIDENTS, UPDATE_INCIDENT_STATUS } from '@/graphql/incident';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Incident } from '@/lib/incident';

// Radix Select s'appuie sur des API absentes de jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

const mockReplace = jest.fn();
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => '/administration/incidents',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

let mockUser: { id: number; role: { role_name: string } } | null;
jest.mock('@/components/hooks/userHooks', () => ({
  useCurrentUser: () => 'membre@club.fr',
  useUserData: () => mockUser,
}));

// getByText normalise les espaces du texte affiché : on fait de même pour la valeur attendue.
const date = (iso: string) => formatDate(iso).replace(/\s/g, ' ');
const dateTime = (iso: string) => formatDateTime(iso).replace(/\s/g, ' ');

const lea = { id: 5, first_name: 'Léa', last_name: 'Martin', email: 'lea@club.fr' };
const marc = { id: 8, first_name: 'Marc', last_name: 'Petit', email: 'marc@club.fr' };
const admin = { id: 1, first_name: 'Anne', last_name: 'Durand' };

// Dates sans suffixe "Z" : interprétées en heure locale, donc indépendantes du fuseau horaire.
const incidents: Incident[] = [
  {
    id: 1,
    incident_date: '2026-10-05T14:30:00',
    description: 'Crevaison du pneu avant au roulage',
    damage_report: 'Pneu avant à remplacer',
    corrective_actions: 'Avion immobilisé au parking',
    severity_level: 'high',
    status: 'Ouvert',
    priority: 'high',
    category: 'mechanical',
    resolution_note: null,
    resolved_at: null,
    resolved_by: null,
    aircraft: { id: 1, registration_number: 'F-ABCD', model: 'Cessna 172' },
    flight: {
      id: 42,
      origin_icao: 'LFPG',
      destination_icao: 'LFOB',
      departure_time: '2026-10-05T13:00:00',
      flight_hours: 1.5,
      flight_type: 'VFR',
      reservation: { id: 7, start_time: '2026-10-05T12:45:00' },
    },
    user: lea,
  },
  {
    id: 2,
    incident_date: '2026-09-20T09:00:00',
    description: 'Radio muette pendant dix minutes',
    damage_report: null,
    corrective_actions: null,
    severity_level: 'Modéré',
    status: 'in_progress',
    priority: 'Moyenne',
    category: 'Avionique',
    resolution_note: 'Faisceau en cours de contrôle',
    resolved_at: null,
    resolved_by: null,
    aircraft: { id: 2, registration_number: 'F-WXYZ', model: 'Piper PA-28' },
    flight: null,
    user: marc,
  },
  {
    id: 3,
    incident_date: '2026-08-02T16:00:00',
    description: 'Rafale au toucher des roues',
    damage_report: null,
    corrective_actions: null,
    severity_level: 'Faible',
    status: 'resolved',
    priority: 'low',
    category: 'weather',
    resolution_note: 'Aucun dommage après inspection',
    resolved_at: '2026-08-03T10:15:00',
    resolved_by: admin,
    aircraft: { id: 1, registration_number: 'F-ABCD', model: 'Cessna 172' },
    flight: null,
    user: marc,
  },
];

const incidentsMock = (list: Incident[] = incidents): MockedResponse => ({
  request: { query: GET_ALL_INCIDENTS },
  result: { data: { getAllIncidents: list } },
});

const renderPage = (mocks: MockedResponse[] = [incidentsMock()]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <IncidentsPage />
    </MockedProvider>,
  );

/** Lignes de données du tableau (sans la ligne d'en-tête). */
const getDataRows = () => screen.getAllByRole('row').slice(1);

const getRowFor = (description: string) => {
  const row = screen.getByText(description).closest('tr');
  if (!row) throw new Error(`Aucune ligne pour ${description}`);
  return row as HTMLElement;
};

/** Valeur affichée dans la carte de chiffre clé portant ce libellé. */
const statValue = (label: string) => {
  const title = screen.getAllByText(label).find((element) => element.tagName === 'P');
  if (!title?.parentElement) throw new Error(`Aucun chiffre clé « ${label} »`);
  return title.parentElement;
};

const RAW_CODES = /\b(high|medium|low|mechanical|weather|human_error|in_progress|resolved|open)\b/;

beforeEach(() => {
  mockUser = { id: 1, role: { role_name: 'Administrateur' } };
  mockSearch = '';
  mockToast.mockClear();
  mockReplace.mockClear();
});

describe('IncidentsPage', () => {
  it("doit afficher l'en-tête dès le chargement, avec un squelette à la place du contenu", async () => {
    renderPage();

    expect(screen.getByLabelText('Chargement des incidents')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Incidents' })).toBeInTheDocument();

    expect(await screen.findByText('Crevaison du pneu avant au roulage')).toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement des incidents')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Incidents' })).toBeInTheDocument();
  });

  it('doit afficher les incidents avec des libellés français, sans code brut, et les chiffres clés', async () => {
    renderPage();
    await screen.findByText('Crevaison du pneu avant au roulage');
    expect(getDataRows()).toHaveLength(3);

    const open = within(getRowFor('Crevaison du pneu avant au roulage'));
    expect(open.getByText(date('2026-10-05T14:30:00'))).toBeInTheDocument();
    expect(open.getByText('F-ABCD')).toBeInTheDocument();
    expect(open.getByText('Cessna 172')).toBeInTheDocument();
    expect(open.getByText('Léa Martin')).toBeInTheDocument();
    expect(open.getByText('Mécanique')).toBeInTheDocument();
    expect(open.getByText('Élevée')).toBeInTheDocument();
    expect(open.getByText('Ouvert')).toBeInTheDocument();

    const inProgress = within(getRowFor('Radio muette pendant dix minutes'));
    expect(inProgress.getByText('Marc Petit')).toBeInTheDocument();
    // Une catégorie saisie librement est affichée telle quelle.
    expect(inProgress.getByText('Avionique')).toBeInTheDocument();
    expect(inProgress.getByText('Moyenne')).toBeInTheDocument();
    expect(inProgress.getByText('En cours')).toBeInTheDocument();

    const resolved = within(getRowFor('Rafale au toucher des roues'));
    expect(resolved.getByText('Météorologique')).toBeInTheDocument();
    expect(resolved.getByText('Faible')).toBeInTheDocument();
    expect(resolved.getByText('Résolu')).toBeInTheDocument();

    expect(screen.getByRole('table').textContent).not.toMatch(RAW_CODES);

    expect(statValue('Ouverts')).toHaveTextContent('Ouverts1');
    expect(statValue('En cours')).toHaveTextContent('En cours1');
    expect(statValue('Résolus')).toHaveTextContent('Résolus1');
    expect(statValue('Gravité élevée')).toHaveTextContent('Gravité élevée1');

    expect(screen.getByText('1–3 sur 3 incidents')).toBeInTheDocument();
  });

  it('doit filtrer par recherche (description, immatriculation ou pilote) et permettre de réinitialiser', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Crevaison du pneu avant au roulage');

    const searchInput = screen.getByRole('textbox', { name: 'Rechercher des incidents' });

    await user.type(searchInput, 'radio');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('Radio muette pendant dix minutes')).toBeInTheDocument();
    expect(screen.getByText('1–1 sur 1 incident')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'f-abcd');
    expect(getDataRows()).toHaveLength(2);

    await user.clear(searchInput);
    await user.type(searchInput, 'léa');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('Crevaison du pneu avant au roulage')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'Boeing');
    expect(screen.getByText('Aucun incident ne correspond')).toBeInTheDocument();
    expect(screen.queryByText('Crevaison du pneu avant au roulage')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(getDataRows()).toHaveLength(3);
    expect(searchInput).toHaveValue('');
  });

  it('doit filtrer par gravité, statut et aéronef avec les sélecteurs', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Crevaison du pneu avant au roulage');

    const choose = async (filter: string, option: string) => {
      await user.click(screen.getByRole('combobox', { name: filter }));
      await user.click(await screen.findByRole('option', { name: option }));
    };

    // « Modéré » et « medium » sont la même gravité.
    await choose('Filtrer par gravité', 'Moyenne');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('Radio muette pendant dix minutes')).toBeInTheDocument();

    await choose('Filtrer par gravité', 'Toutes les gravités');
    expect(getDataRows()).toHaveLength(3);

    await choose('Filtrer par statut', 'Résolu');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('Rafale au toucher des roues')).toBeInTheDocument();
    // Les chiffres clés portent sur l'ensemble des incidents, pas sur le filtre actif.
    expect(statValue('Ouverts')).toHaveTextContent('Ouverts1');

    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(getDataRows()).toHaveLength(3);

    await choose('Filtrer par aéronef', 'F-WXYZ');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('Radio muette pendant dix minutes')).toBeInTheDocument();

    await choose('Filtrer par aéronef', 'F-ABCD');
    expect(getDataRows()).toHaveLength(2);
  });

  it("doit ouvrir le détail d'un incident en cliquant sur sa ligne ou au clavier", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Crevaison du pneu avant au roulage');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('Crevaison du pneu avant au roulage'));

    const title = `Incident du ${date('2026-10-05T14:30:00')} sur F-ABCD`;
    const dialog = await screen.findByRole('dialog', { name: title });
    const details = within(dialog);
    expect(details.getByText(dateTime('2026-10-05T14:30:00'))).toBeInTheDocument();
    expect(details.getByText('Mécanique')).toBeInTheDocument();
    expect(details.getByText('Élevée')).toBeInTheDocument();
    expect(details.getByText('Haute')).toBeInTheDocument();
    expect(details.getByText('Ouvert')).toBeInTheDocument();
    expect(details.getByText('Crevaison du pneu avant au roulage')).toBeInTheDocument();
    expect(details.getByText('Pneu avant à remplacer')).toBeInTheDocument();
    expect(details.getByText('Avion immobilisé au parking')).toBeInTheDocument();
    expect(details.getByText('Léa Martin')).toBeInTheDocument();
    expect(details.getByRole('link', { name: 'lea@club.fr' })).toHaveAttribute('href', 'mailto:lea@club.fr');
    expect(details.getByText('LFPG → LFOB')).toBeInTheDocument();
    // La date du vol est celle de sa réservation.
    expect(details.getByText(date('2026-10-05T12:45:00'))).toBeInTheDocument();
    expect(details.getByText('1 h 30')).toBeInTheDocument();
    expect(details.getByText('VFR')).toBeInTheDocument();
    expect(details.getByRole('link', { name: /Voir le plan de vol/ })).toHaveAttribute(
      'href',
      '/reservations/flight-plans/42',
    );
    expect(dialog.textContent).not.toMatch(RAW_CODES);

    await user.click(details.getAllByRole('button', { name: 'Fermer' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Un incident résolu, sans vol : ouvert au clavier.
    getRowFor('Rafale au toucher des roues').focus();
    await user.keyboard('{Enter}');
    const resolved = within(
      await screen.findByRole('dialog', { name: `Incident du ${date('2026-08-02T16:00:00')} sur F-ABCD` }),
    );
    expect(resolved.getByText('Aucun vol associé')).toBeInTheDocument();
    expect(resolved.getByText(dateTime('2026-08-03T10:15:00'))).toBeInTheDocument();
    expect(resolved.getByText('Anne Durand')).toBeInTheDocument();
    expect(resolved.getByLabelText('Note de résolution')).toHaveValue('Aucun dommage après inspection');
    expect(resolved.getByRole('button', { name: 'Rouvrir' })).toBeInTheDocument();
    expect(resolved.queryByRole('button', { name: 'Marquer comme résolu' })).not.toBeInTheDocument();
  });

  it("doit ouvrir l'incident donné dans l'adresse, et ne rien ouvrir quand il est inconnu", async () => {
    mockSearch = 'incident=2';
    const user = userEvent.setup();
    const { unmount } = renderPage();

    const dialog = await screen.findByRole('dialog', {
      name: `Incident du ${date('2026-09-20T09:00:00')} sur F-WXYZ`,
    });
    await user.click(within(dialog).getAllByRole('button', { name: 'Fermer' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockReplace).toHaveBeenCalledWith('/administration/incidents', { scroll: false });
    unmount();

    mockSearch = 'incident=999';
    renderPage();
    await screen.findByText('Crevaison du pneu avant au roulage');
    expect(getDataRows()).toHaveLength(3);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('doit demander confirmation puis marquer un incident comme résolu avec sa note', async () => {
    const user = userEvent.setup();
    const resolvedIncident = {
      ...incidents[0],
      status: 'Résolu',
      resolution_note: 'Pneu remplacé',
      resolved_at: '2026-10-06T09:00:00',
      resolved_by: admin,
    };
    const updateResult = jest.fn(() => ({ data: { updateIncidentStatus: resolvedIncident } }));
    renderPage([
      incidentsMock(),
      {
        request: {
          query: UPDATE_INCIDENT_STATUS,
          variables: { id: 1, status: 'Résolu', resolution_note: 'Pneu remplacé' },
        },
        result: updateResult,
      },
      incidentsMock([resolvedIncident, incidents[1], incidents[2]]),
    ]);
    await screen.findByText('Crevaison du pneu avant au roulage');
    await user.click(screen.getByText('Crevaison du pneu avant au roulage'));

    const title = `Incident du ${date('2026-10-05T14:30:00')} sur F-ABCD`;
    const panel = within(await screen.findByRole('dialog', { name: title }));
    expect(panel.getByRole('button', { name: 'Prendre en charge' })).toBeInTheDocument();
    // Sans modification, il n'y a pas de note à enregistrer.
    expect(panel.getByRole('button', { name: 'Enregistrer la note' })).toBeDisabled();

    await user.click(panel.getByRole('button', { name: 'Marquer comme résolu' }));

    const confirmation = within(await screen.findByRole('alertdialog', { name: 'Marquer cet incident comme résolu ?' }));
    // La confirmation nomme l'incident.
    expect(confirmation.getByText(new RegExp(`${date('2026-10-05T14:30:00')} sur F-ABCD`))).toBeInTheDocument();
    expect(updateResult).not.toHaveBeenCalled();

    await user.type(confirmation.getByLabelText('Note de résolution'), 'Pneu remplacé');
    await user.click(confirmation.getByRole('button', { name: 'Marquer comme résolu' }));

    await waitFor(() => expect(updateResult).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incident résolu' })));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    // Le panneau et la liste montrent le nouvel état.
    const refreshed = within(screen.getByRole('dialog', { name: title }));
    expect(await refreshed.findByText('Résolu')).toBeInTheDocument();
    expect(refreshed.getByText('Anne Durand')).toBeInTheDocument();
    expect(refreshed.getByRole('button', { name: 'Rouvrir' })).toBeInTheDocument();
    expect(statValue('Résolus')).toHaveTextContent('Résolus2');
    expect(statValue('Gravité élevée')).toHaveTextContent('Gravité élevée0');
  });

  it("doit prendre en charge un incident ouvert et enregistrer la note seule d'un incident en cours", async () => {
    const user = userEvent.setup();
    const taken = { ...incidents[0], status: 'En cours' };
    const noted = { ...incidents[1], status: 'En cours', resolution_note: 'Faisceau remplacé' };
    const takeResult = jest.fn(() => ({ data: { updateIncidentStatus: taken } }));
    const noteResult = jest.fn(() => ({ data: { updateIncidentStatus: noted } }));
    renderPage([
      incidentsMock(),
      {
        request: { query: UPDATE_INCIDENT_STATUS, variables: { id: 1, status: 'En cours', resolution_note: null } },
        result: takeResult,
      },
      incidentsMock([taken, incidents[1], incidents[2]]),
      {
        request: {
          query: UPDATE_INCIDENT_STATUS,
          variables: { id: 2, status: 'En cours', resolution_note: 'Faisceau remplacé' },
        },
        result: noteResult,
      },
      incidentsMock([taken, noted, incidents[2]]),
    ]);
    await screen.findByText('Crevaison du pneu avant au roulage');

    await user.click(screen.getByText('Crevaison du pneu avant au roulage'));
    let panel = within(await screen.findByRole('dialog'));
    await user.click(panel.getByRole('button', { name: 'Prendre en charge' }));
    await waitFor(() => expect(takeResult).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incident pris en charge' })),
    );
    await waitFor(() => expect(panel.queryByRole('button', { name: 'Prendre en charge' })).not.toBeInTheDocument());
    await user.click(panel.getAllByRole('button', { name: 'Fermer' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Le statut lu « in_progress » est renvoyé sous sa forme enregistrée, « En cours ».
    await user.click(screen.getByText('Radio muette pendant dix minutes'));
    panel = within(await screen.findByRole('dialog'));
    const note = panel.getByLabelText('Note de résolution');
    expect(note).toHaveValue('Faisceau en cours de contrôle');
    await user.clear(note);
    await user.type(note, 'Faisceau remplacé');
    await user.click(panel.getByRole('button', { name: 'Enregistrer la note' }));
    await waitFor(() => expect(noteResult).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Note enregistrée' })));
  });

  it('doit demander confirmation avant de rouvrir un incident résolu', async () => {
    const user = userEvent.setup();
    const reopened = { ...incidents[2], status: 'Ouvert', resolved_at: null, resolved_by: null };
    const reopenResult = jest.fn(() => ({ data: { updateIncidentStatus: reopened } }));
    renderPage([
      incidentsMock(),
      {
        request: { query: UPDATE_INCIDENT_STATUS, variables: { id: 3, status: 'Ouvert', resolution_note: null } },
        result: reopenResult,
      },
      incidentsMock([incidents[0], incidents[1], reopened]),
    ]);
    await screen.findByText('Rafale au toucher des roues');
    await user.click(screen.getByText('Rafale au toucher des roues'));

    const panel = within(await screen.findByRole('dialog'));
    await user.click(panel.getByRole('button', { name: 'Rouvrir' }));

    const confirmation = within(await screen.findByRole('alertdialog', { name: 'Rouvrir cet incident ?' }));
    expect(reopenResult).not.toHaveBeenCalled();
    await user.click(confirmation.getByRole('button', { name: 'Rouvrir' }));

    await waitFor(() => expect(reopenResult).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incident rouvert' })));
    expect(await panel.findByRole('button', { name: 'Marquer comme résolu' })).toBeInTheDocument();
  });

  it("doit garder le panneau ouvert et prévenir quand l'enregistrement échoue", async () => {
    const user = userEvent.setup();
    renderPage([
      incidentsMock(),
      {
        request: { query: UPDATE_INCIDENT_STATUS, variables: { id: 1, status: 'En cours', resolution_note: null } },
        error: new Error('Forbidden resource'),
      },
    ]);
    await screen.findByText('Crevaison du pneu avant au roulage');
    await user.click(screen.getByText('Crevaison du pneu avant au roulage'));

    const panel = within(await screen.findByRole('dialog'));
    await user.click(panel.getByRole('button', { name: 'Prendre en charge' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: "L'incident n'a pas pu être pris en charge. Réessayez.",
        }),
      ),
    );
    expect(panel.getByRole('button', { name: 'Prendre en charge' })).toBeEnabled();
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument();
  });

  it("ne doit proposer aucune action de suivi à un membre qui n'est ni administrateur ni technicien", async () => {
    mockUser = { id: 3, role: { role_name: 'Pilote' } };
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Radio muette pendant dix minutes');
    await user.click(screen.getByText('Radio muette pendant dix minutes'));

    const panel = within(await screen.findByRole('dialog'));
    // La note reste lisible, mais rien ne se modifie.
    expect(panel.getByText('Faisceau en cours de contrôle')).toBeInTheDocument();
    expect(panel.queryByRole('textbox')).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Prendre en charge' })).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Marquer comme résolu' })).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Rouvrir' })).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Enregistrer la note' })).not.toBeInTheDocument();
    expect(panel.getAllByRole('button', { name: 'Fermer' }).length).toBeGreaterThan(0);
  });

  it('doit proposer les actions de suivi à un technicien', async () => {
    mockUser = { id: 4, role: { role_name: 'Technicien' } };
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Crevaison du pneu avant au roulage');
    await user.click(screen.getByText('Crevaison du pneu avant au roulage'));

    const panel = within(await screen.findByRole('dialog'));
    expect(panel.getByRole('button', { name: 'Prendre en charge' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Marquer comme résolu' })).toBeInTheDocument();
  });

  it("doit afficher un état d'erreur avec une action pour réessayer", async () => {
    const user = userEvent.setup();
    renderPage([{ request: { query: GET_ALL_INCIDENTS }, error: new Error('Forbidden resource') }, incidentsMock()]);

    expect(await screen.findByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Incidents' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Crevaison du pneu avant au roulage')).toBeInTheDocument();
  });

  it("doit expliquer d'où viennent les incidents quand il n'y en a aucun", async () => {
    renderPage([incidentsMock([])]);

    expect(await screen.findByText('Aucun incident déclaré')).toBeInTheDocument();
    expect(screen.getByText(/déclarés par les pilotes au moment de clôturer un vol/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nouvel|Ajouter|Déclarer/ })).not.toBeInTheDocument();
    expect(statValue('Ouverts')).toHaveTextContent('Ouverts0');
  });
});
