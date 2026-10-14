import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import ReservationCalendar from '../page';
import {
  CREATE_RESERVATION,
  DELETE_RESERVATION,
  GET_BOOKABLE_INSTRUCTORS,
  GET_FILTERED_RESERVATIONS,
  GET_MAY_BOOK_WITHOUT_INSTRUCTOR,
  UPDATE_RESERVATION,
} from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { GET_SETTINGS } from '@/graphql/settings';
import { GET_ME, GET_USER_BY_EMAIL } from '@/graphql/user';

// Mercredi 23 octobre 2024, 10h00 (heure locale) : la page démarre sur "aujourd'hui".
const TODAY = new Date(2024, 9, 23, 10, 0, 0);
// The same day before the club opens: a slot is booked, changed or cancelled before it starts.
// The API refuses otherwise, and the interface no longer offers it.
const EARLY_MORNING = new Date(2024, 9, 23, 7, 30, 0);
const TODAY_STR = '2024-10-23';
const TOMORROW_STR = '2024-10-24';
const AFTER_TOMORROW_STR = '2024-10-25';

const USER_EMAIL = 'pilote@example.com';
const USER_ID = 42;
const OTHER_USER_ID = 7;

const buildAircraft = (id: number, registration_number: string) => ({
  id,
  registration_number,
  model: 'Robin DR400',
  availability_status: 'AVAILABLE',
  maintenance_status: 'OK',
  hourly_cost: 150,
  year_of_manufacture: 2010,
  total_flight_hours: 1200,
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
});

const mockAircrafts = [buildAircraft(1, 'F-ABCD'), buildAircraft(2, 'F-EFGH')];

// Heures sans suffixe "Z" : interprétées en heure locale, comme la grille du calendrier.
const existingReservation = {
  id: 1,
  start_time: `${TODAY_STR}T09:00:00`,
  end_time: `${TODAY_STR}T11:00:00`,
  purpose: 'Navigation solo',
  estimated_flight_hours: 2,
  status: 'PENDING',
  notes: 'Prévoir le plein avant le départ',
  flight_category: 'TRAINING',
  charged_amount: 300,
  user: { id: OTHER_USER_ID, first_name: 'Camille', last_name: null },
  instructor: null as { id: number; first_name: string; last_name: string } | null,
  aircraft: { id: 1, registration_number: 'F-ABCD' },
  flights: [],
};

const createdReservation = {
  id: 2,
  start_time: `${TODAY_STR}T09:00:00`,
  end_time: `${TODAY_STR}T11:00:00`,
  purpose: 'Vol local',
  estimated_flight_hours: 2,
  status: 'PENDING',
  notes: '',
  flight_category: '',
  charged_amount: 300,
  user: { id: USER_ID, first_name: 'Alex', last_name: null },
  instructor: null,
  aircraft: { id: 2, registration_number: 'F-EFGH' },
  flights: [],
};

const meMock: MockedResponse = {
  request: { query: GET_ME },
  result: { data: { me: { id: USER_ID, email: USER_EMAIL } } },
};

const userMock: MockedResponse = {
  request: { query: GET_USER_BY_EMAIL, variables: { email: USER_EMAIL } },
  result: {
    data: {
      userByEmail: {
        id: USER_ID,
        first_name: 'Alex',
        last_name: 'Martin',
        email: USER_EMAIL,
        phone_number: null,
        address: null,
        date_of_birth: null,
        profile_picture: null,
        total_flight_hours: 120,
        email_notifications_enabled: true,
        sms_notifications_enabled: false,
        newsletter_subscribed: false,
        role: { id: 1, role_name: 'PILOT' },
        licenses: [],
        language: 'fr',
        speed_unit: 'kt',
        distance_unit: 'nm',
        timezone: 'Europe/Paris',
        preferred_aerodrome: null,
        dashboard_widgets: [],
      },
    },
  },
};

// Ouverture de 08:00 à 12:00 => 4 créneaux d'une heure (08, 09, 10, 11) ; fermeture le jeudi ;
// maintenance hebdomadaire de deux heures le lundi (hors des jours de ces tests).
const settings = (maintenanceDay = 'Lundi') => ({
  closureDays: ['jeudi'],
  reservationStartTime: '08:00',
  reservationEndTime: '12:00',
  maintenanceDay,
  maintenanceDuration: 2,
});

const settingsMock: MockedResponse = {
  request: { query: GET_SETTINGS },
  result: { data: { getAllAdministrations: [settings()] } },
};

// The weekly maintenance falls on the day shown (Wednesday), 08:00 to 10:00.
const maintenanceTodayMock: MockedResponse = {
  request: { query: GET_SETTINGS },
  result: { data: { getAllAdministrations: [settings('Mercredi')] } },
};

const aircraftsMock: MockedResponse = {
  request: { query: GET_AIRCRAFTS },
  result: { data: { getAircrafts: mockAircrafts } },
};

const reservationsMock = (
  startDate: string,
  endDate: string,
  reservations: Array<typeof existingReservation>,
): MockedResponse => ({
  request: { query: GET_FILTERED_RESERVATIONS, variables: { startDate, endDate } },
  result: { data: { filteredReservations: reservations } },
});

const baseMocks = (): MockedResponse[] => [
  meMock,
  userMock,
  settingsMock,
  aircraftsMock,
  reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
];

const renderPage = (mocks: MockedResponse[] = baseMocks()) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ReservationCalendar />
    </MockedProvider>,
  );

const getRowFor = (registration: string) => {
  // La cellule de l'avion contient l'immatriculation puis le modèle.
  const row = screen.getByRole('cell', { name: new RegExp(`^${registration} `) }).closest('tr');
  if (!row) throw new Error(`Aucune ligne pour ${registration}`);
  return row as HTMLElement;
};

/** Créneaux libres d'un avion : cellules vides, nommées « Réserver <avion> à <heure> ». */
const getFreeCells = (registration: string) =>
  within(getRowFor(registration)).getAllByRole('cell', { name: /^Réserver / });

/** Simule une sélection à la souris (glisser) sur les créneaux libres d'un avion. */
const dragOverFreeCells = (registration: string, fromIndex: number, toIndex: number) => {
  const freeCells = getFreeCells(registration);
  fireEvent.mouseDown(freeCells[fromIndex]);
  fireEvent.mouseEnter(freeCells[toIndex]);
  fireEvent.mouseUp(freeCells[toIndex]);
};

const originalMatchMedia = window.matchMedia;

// jsdom n'implémente pas ces API, utilisées par la liste déroulante (Radix) des catégories de vol.
window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('ReservationCalendar', () => {
  beforeEach(() => {
    // Seule l'horloge (Date) est figée : les timers restent réels pour Apollo et Testing Library.
    jest.useFakeTimers({
      now: TODAY,
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'performance',
        'hrtime',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it("doit garder l'en-tête et le navigateur de date pendant le chargement, puis afficher la grille", async () => {
    const { container } = renderPage();

    // L'en-tête ne saute pas : il est là dès le chargement, seul le calendrier est en squelette.
    expect(screen.getByRole('heading', { name: 'Calendrier des réservations' })).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'mercredi 23 octobre 2024' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jour précédent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jour suivant' })).toBeInTheDocument();
    // On est déjà sur la date du jour.
    expect(screen.getByRole('button', { name: "Aujourd'hui" })).toBeDisabled();
    expect(screen.queryByText(/Votre aéroclub est fermé ce jour/)).not.toBeInTheDocument();
  });

  it("doit revenir à la date du jour avec le bouton « Aujourd'hui »", async () => {
    const user = userEvent.setup();
    renderPage([
      ...baseMocks(),
      reservationsMock(TOMORROW_STR, AFTER_TOMORROW_STR, []),
      // Retour sur aujourd'hui : la journée est réaffichée depuis le cache puis rafraîchie.
      reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
    ]);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Jour suivant' }));
    expect(await screen.findByRole('button', { name: 'jeudi 24 octobre 2024' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    expect(await screen.findByRole('button', { name: 'mercredi 23 octobre 2024' })).toBeInTheDocument();
    expect(await screen.findByText('Navigation solo')).toBeInTheDocument();
  });

  it("doit afficher la grille horaire avec les avions, les créneaux libres et les réservations", async () => {
    renderPage();
    await screen.findByRole('table');

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    // 12:00 est l'heure de fermeture : elle termine le dernier créneau, elle n'en ouvre pas un.
    expect(headers).toEqual(['Avion', '08:00', '09:00', '10:00', '11:00']);
    // Il est 10h00 : la colonne de l'heure en cours est signalée.
    expect(screen.getByRole('columnheader', { name: '10:00' })).toHaveAttribute('aria-current', 'time');

    // F-ABCD : réservé de 09:00 à 11:00 => une cellule fusionnée sur 2 heures et 2 créneaux libres.
    const reservedRow = within(getRowFor('F-ABCD'));
    const reservedCell = reservedRow.getByText('Navigation solo').closest('td');
    expect(reservedCell).toHaveAttribute('colspan', '2');
    expect(reservedCell).toHaveClass('bg-warning/15');
    expect(getFreeCells('F-ABCD').map((cell) => cell.getAttribute('aria-label'))).toEqual([
      'Réserver F-ABCD à 08:00',
      'Réserver F-ABCD à 11:00',
    ]);

    // F-EFGH : aucun vol, les 4 créneaux sont libres.
    const freeRow = within(getRowFor('F-EFGH'));
    expect(getFreeCells('F-EFGH')).toHaveLength(4);
    expect(freeRow.queryByText('Navigation solo')).not.toBeInTheDocument();

    // Les créneaux libres sont des cellules vides : plus de « Libre » répété dans la grille.
    expect(screen.queryByText('Libre')).not.toBeInTheDocument();
    // La légende reprend les libellés des statuts.
    const legend = within(screen.getByRole('list', { name: 'Légende' }));
    expect(legend.getByText('Confirmée')).toBeInTheDocument();
    // A booking is confirmed when it is made: "pending" never happens and is not in the legend.
    expect(legend.queryByText('En attente')).not.toBeInTheDocument();
    expect(legend.getByText('Annulée')).toBeInTheDocument();
  });

  it("doit afficher un message d'erreur si le chargement des réservations échoue", async () => {
    renderPage([
      meMock,
      userMock,
      settingsMock,
      aircraftsMock,
      {
        request: {
          query: GET_FILTERED_RESERVATIONS,
          variables: { startDate: TODAY_STR, endDate: TOMORROW_STR },
        },
        error: new Error('Erreur réseau'),
      },
    ]);

    expect(await screen.findByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.getByText(/Les réservations de cette journée n'ont pas pu être chargées/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // L'en-tête reste en place pour pouvoir changer de jour.
    expect(screen.getByRole('heading', { name: 'Calendrier des réservations' })).toBeInTheDocument();
  });

  it("doit ouvrir le détail d'une réservation au clic sur son créneau", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('Navigation solo'));

    const dialog = await screen.findByRole('dialog', { name: 'Détails de la réservation' });
    const details = within(dialog);
    expect(details.getByRole('heading', { name: 'Navigation solo' })).toBeInTheDocument();
    expect(details.getByText('En attente')).toBeInTheDocument();
    expect(details.getByText('F-ABCD')).toBeInTheDocument();
    expect(details.getByText(/Camille/)).toBeInTheDocument();
    expect(details.getByText('09:00 – 11:00')).toBeInTheDocument();
    expect(details.getByText('mercredi 23 octobre 2024')).toBeInTheDocument();
    expect(details.getByText('2 h')).toBeInTheDocument();
    expect(details.getByText('Entraînement')).toBeInTheDocument();
    expect(details.getByText('Prévoir le plein avant le départ')).toBeInTheDocument();
    expect(details.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(details.queryByRole('button', { name: 'Annuler la réservation' })).not.toBeInTheDocument();
  });

  it("doit proposer de modifier et de supprimer une réservation à son propriétaire", async () => {
    jest.setSystemTime(EARLY_MORNING);
    const user = userEvent.setup();
    renderPage([
      meMock,
      userMock,
      settingsMock,
      aircraftsMock,
      reservationsMock(TODAY_STR, TOMORROW_STR, [createdReservation]),
    ]);
    await screen.findByRole('table');

    await user.click(screen.getByText('Vol local'));

    const dialog = await screen.findByRole('dialog', { name: 'Détails de la réservation' });
    expect(await within(dialog).findByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Annuler la réservation' })).toBeInTheDocument();
    // Le prix affiché est celui que l'API a enregistré en débitant la réservation.
    expect(within(dialog).getByText('Prix payé')).toBeInTheDocument();
    expect(within(dialog).getByText(/300,00\s€/)).toBeInTheDocument();
  });

  it("doit laisser un administrateur modifier la réservation d'un autre membre, avec le prix recalculé", async () => {
    jest.setSystemTime(EARLY_MORNING);
    const user = userEvent.setup();
    const updateVariables = jest.fn();
    const adminMock: MockedResponse = {
      ...userMock,
      result: {
        data: {
          userByEmail: {
            ...(userMock.result as { data: { userByEmail: Record<string, unknown> } }).data.userByEmail,
            role: { id: 2, role_name: 'Administrateur' },
          },
        },
      },
    };
    renderPage([
      meMock,
      adminMock,
      settingsMock,
      aircraftsMock,
      reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
      {
        request: { query: UPDATE_RESERVATION },
        variableMatcher: (variables) => {
          updateVariables(variables);
          return true;
        },
        result: { data: { updateReservation: { id: 1 } } },
      },
      reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
    ]);
    await screen.findByRole('table');

    await user.click(screen.getByText('Navigation solo'));
    const detail = await screen.findByRole('dialog', { name: 'Détails de la réservation' });
    await user.click(await within(detail).findByRole('button', { name: 'Modifier' }));

    const form = within(await screen.findByRole('dialog', { name: 'Modifier la réservation' }));
    expect(form.getByRole('combobox', { name: /Avion/ })).toHaveTextContent('F-ABCD');
    expect(form.getByText(/Prix payé : 300,00\s€/)).toBeInTheDocument();

    const end = form.getByLabelText(/^Fin/);
    await user.clear(end);
    await user.type(end, '10:00');
    // One hour at 150 € instead of two: the pilot gets the difference back.
    expect(form.getByText(/Nouveau prix : 150,00\s€/)).toBeInTheDocument();
    expect(form.getByText(/150,00\s€ seront remboursés sur le solde du pilote/)).toBeInTheDocument();

    await user.click(form.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(updateVariables).toHaveBeenCalledTimes(1));
    const { input } = updateVariables.mock.calls[0][0];
    expect(input).toMatchObject({ id: 1, aircraft_id: 1 });
    expect(new Date(input.end_time).getTime()).toBe(new Date(2024, 9, 23, 10, 0).getTime());
  });

  it("ne doit pas proposer de réserver un avion indisponible, que l'API refuserait", async () => {
    jest.setSystemTime(EARLY_MORNING);
    renderPage([
      meMock,
      userMock,
      settingsMock,
      {
        request: { query: GET_AIRCRAFTS },
        result: { data: { getAircrafts: [mockAircrafts[0], { ...mockAircrafts[1], availability_status: 'UNAVAILABLE' }] } },
      },
      reservationsMock(TODAY_STR, TOMORROW_STR, []),
    ]);
    await screen.findByRole('table');

    expect(within(getRowFor('F-EFGH')).queryAllByRole('cell', { name: /^Réserver / })).toHaveLength(0);
    expect(within(getRowFor('F-EFGH')).getByText('Réservation impossible pour le moment')).toBeInTheDocument();
    expect(getFreeCells('F-ABCD').length).toBeGreaterThan(0);
  });

  it("ne doit plus proposer ni modification ni suppression une fois la réservation commencée", async () => {
    // Il est 10h00 : la réservation de 09:00 à 11:00 a commencé, l'API refuserait.
    const user = userEvent.setup();
    renderPage([
      meMock,
      userMock,
      settingsMock,
      aircraftsMock,
      reservationsMock(TODAY_STR, TOMORROW_STR, [createdReservation]),
    ]);
    await screen.findByRole('table');

    await user.click(screen.getByText('Vol local'));

    const dialog = await screen.findByRole('dialog', { name: 'Détails de la réservation' });
    expect(await within(dialog).findByText(/seul un administrateur peut l'annuler/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Annuler la réservation' })).not.toBeInTheDocument();
  });

  it("doit refuser la sélection d'un créneau déjà commencé", async () => {
    renderPage();
    await screen.findByRole('table');

    // Il est 10h00 : le créneau de 09:00 (index 1) de F-EFGH est passé.
    dragOverFreeCells('F-EFGH', 1, 1);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('dialog', { name: 'Créer une réservation' })).not.toBeInTheDocument();
    getFreeCells('F-EFGH').forEach((cell) => expect(cell).not.toHaveClass('bg-primary/80'));
  });

  it("doit demander confirmation avant de supprimer une réservation", async () => {
    jest.setSystemTime(EARLY_MORNING);
    const user = userEvent.setup();
    const deleteVariables = jest.fn();
    renderPage([
      meMock,
      userMock,
      settingsMock,
      aircraftsMock,
      reservationsMock(TODAY_STR, TOMORROW_STR, [createdReservation]),
      {
        request: { query: DELETE_RESERVATION },
        variableMatcher: (variables) => {
          deleteVariables(variables);
          return true;
        },
        result: { data: { deleteReservation: true } },
      },
      // Réponse du refetch déclenché après la suppression.
      reservationsMock(TODAY_STR, TOMORROW_STR, []),
    ]);
    await screen.findByRole('table');

    await user.click(screen.getByText('Vol local'));
    const dialog = await screen.findByRole('dialog', { name: 'Détails de la réservation' });
    await user.click(await within(dialog).findByRole('button', { name: 'Annuler la réservation' }));

    // Rien n'est supprimé tant que la confirmation, qui nomme la réservation, n'est pas validée.
    const confirmation = await screen.findByRole('alertdialog', { name: 'Annuler cette réservation ?' });
    expect(confirmation).toHaveTextContent('F-EFGH');
    expect(confirmation).toHaveTextContent('de 09:00 à 11:00');
    // What is given back is said before anything is sent.
    expect(confirmation).toHaveTextContent(/rembours/);
    expect(deleteVariables).not.toHaveBeenCalled();

    await user.click(within(confirmation).getByRole('button', { name: 'Annuler la réservation' }));

    await waitFor(() => expect(deleteVariables).toHaveBeenCalledWith({ id: 2 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(getFreeCells('F-EFGH')).toHaveLength(4));
  });

  it("doit masquer la grille et prévenir l'utilisateur quand le jour suivant est un jour de fermeture", async () => {
    const user = userEvent.setup();
    renderPage([...baseMocks(), reservationsMock(TOMORROW_STR, AFTER_TOMORROW_STR, [])]);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Jour suivant' }));

    expect(await screen.findByText('Votre aéroclub est fermé ce jour (jeudi)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'jeudi 24 octobre 2024' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();
  });

  it('doit créer une réservation après la sélection de créneaux libres à la souris', async () => {
    jest.setSystemTime(EARLY_MORNING);
    const user = userEvent.setup();
    const createVariables = jest.fn();
    const userLoaded = jest.fn(() => userMock.result as { data: Record<string, unknown> });

    renderPage([
      meMock,
      { ...userMock, result: userLoaded },
      settingsMock,
      aircraftsMock,
      reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
      {
        request: { query: CREATE_RESERVATION },
        variableMatcher: (variables) => {
          createVariables(variables);
          return true;
        },
        result: {
          data: {
            createReservation: {
              id: 2,
              start_time: createdReservation.start_time,
              end_time: createdReservation.end_time,
              purpose: createdReservation.purpose,
              aircraft: createdReservation.aircraft,
              user: createdReservation.user,
            },
          },
        },
      },
      // Réponse du refetch déclenché après la création.
      reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation, createdReservation]),
    ]);
    await screen.findByRole('table');
    // La création exige l'identifiant de l'utilisateur courant (GET_ME puis GET_USER_BY_EMAIL).
    await waitFor(() => expect(userLoaded).toHaveBeenCalled());

    // F-EFGH : glisser du créneau 09:00 (index 1) au créneau 10:00 (index 2) réserve de 09:00 à 11:00.
    dragOverFreeCells('F-EFGH', 1, 2);

    const dialog = await screen.findByRole('dialog', { name: 'Créer une réservation' });
    const form = within(dialog);
    expect(form.getByText('F-EFGH')).toBeInTheDocument();
    expect(form.getByText('mercredi 23 octobre 2024')).toBeInTheDocument();
    expect(form.getByText('09:00')).toBeInTheDocument();
    expect(form.getByText('11:00')).toBeInTheDocument();

    await user.type(form.getByLabelText('But de la réservation'), 'Vol local');

    // Sans catégorie de vol (enum obligatoire côté API), rien n'est envoyé et l'oubli est signalé.
    await user.click(form.getByRole('button', { name: 'Créer la réservation' }));
    expect(await form.findByRole('alert')).toHaveTextContent('Veuillez sélectionner une catégorie de vol.');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(createVariables).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Créer une réservation' })).toBeInTheDocument();

    // Two lists now: the instructor (none by default) and the category.
    expect(form.getByRole('combobox', { name: /Avec un instructeur/ })).toHaveTextContent('Sans instructeur');
    await user.click(form.getByRole('combobox', { name: /Catégorie de vol/ }));
    await user.click(await screen.findByRole('option', { name: 'Local' }));
    expect(form.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(form.getByRole('button', { name: 'Créer la réservation' }));

    await waitFor(() => expect(createVariables).toHaveBeenCalledTimes(1));
    const { input } = createVariables.mock.calls[0][0];
    expect(input).toMatchObject({
      aircraft_id: 2,
      purpose: 'Vol local',
      user_id: USER_ID,
      estimated_flight_hours: 2,
      notes: '',
      flight_category: 'LOCAL',
    });
    // Every booking is confirmed by the API: no status is sent.
    expect(input).not.toHaveProperty('status');
    expect(new Date(input.start_time).getTime()).toBe(new Date(2024, 9, 23, 9, 0).getTime());
    expect(new Date(input.end_time).getTime()).toBe(new Date(2024, 9, 23, 11, 0).getTime());

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Le refetch fait apparaître la nouvelle réservation dans la ligne de F-EFGH.
    const newCell = (await within(getRowFor('F-EFGH')).findByText('Vol local')).closest('td');
    expect(newCell).toHaveAttribute('colspan', '2');
    expect(getFreeCells('F-EFGH')).toHaveLength(2);
  });

  it("doit réserver une heure d'un simple clic sur un créneau libre", async () => {
    renderPage();
    await screen.findByRole('table');

    // F-EFGH, créneau de 11:00 (index 3) : le dernier de la journée, il se termine à la fermeture.
    dragOverFreeCells('F-EFGH', 3, 3);

    const form = within(await screen.findByRole('dialog', { name: 'Créer une réservation' }));
    expect(form.getByText('F-EFGH')).toBeInTheDocument();
    expect(form.getByText('11:00')).toBeInTheDocument();
    expect(form.getByText('12:00')).toBeInTheDocument();
  });

  it("doit refuser une sélection qui chevauche une réservation existante", async () => {
    renderPage();
    await screen.findByRole('table');

    // F-ABCD : de 08:00 (index 0) à 11:00 (index 1), en passant par-dessus la réservation de 09:00 à 11:00.
    dragOverFreeCells('F-ABCD', 0, 1);

    // Aucun formulaire ne s'ouvre et la sélection est abandonnée (le refus est annoncé par un toast).
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('dialog', { name: 'Créer une réservation' })).not.toBeInTheDocument();
    getFreeCells('F-ABCD').forEach((cell) => expect(cell).not.toHaveClass('bg-primary/80'));
  });

  describe('avec un instructeur', () => {
    const instructorsMock: MockedResponse = {
      request: { query: GET_BOOKABLE_INSTRUCTORS },
      result: { data: { bookableInstructors: [{ id: 3, first_name: 'Marie', last_name: 'Laurent' }] } },
    };
    // The member has no valid licence: the API says they cannot book without an instructor.
    const studentRightsMock: MockedResponse = {
      // Asked for the end of the selected slot, as the API checks the licence.
      request: { query: GET_MAY_BOOK_WITHOUT_INSTRUCTOR },
      variableMatcher: (variables) => typeof variables?.until === 'string',
      result: { data: { mayBookWithoutInstructor: false } },
    };
    const instruction = {
      ...existingReservation,
      id: 5,
      purpose: 'Leçon 13',
      flight_category: 'INSTRUCTION',
      instructor: { id: USER_ID, first_name: 'Alex', last_name: 'Martin' },
    };
    const creation = (createVariables: jest.Mock): MockedResponse => ({
      request: { query: CREATE_RESERVATION },
      variableMatcher: (variables) => {
        createVariables(variables);
        return true;
      },
      result: {
        data: {
          createReservation: {
            id: 2,
            start_time: createdReservation.start_time,
            end_time: createdReservation.end_time,
            purpose: createdReservation.purpose,
            aircraft: createdReservation.aircraft,
            user: createdReservation.user,
          },
        },
      },
    });

    it("doit exiger un instructeur de l'élève sans licence, puis l'envoyer avec la réservation", async () => {
      jest.setSystemTime(EARLY_MORNING);
      const user = userEvent.setup();
      const createVariables = jest.fn();
      const userLoaded = jest.fn(() => userMock.result as { data: Record<string, unknown> });

      renderPage([
        meMock,
        { ...userMock, result: userLoaded },
        settingsMock,
        aircraftsMock,
        instructorsMock,
        studentRightsMock,
        reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
        creation(createVariables),
        reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation, createdReservation]),
      ]);
      await screen.findByRole('table');
      await waitFor(() => expect(userLoaded).toHaveBeenCalled());

      dragOverFreeCells('F-EFGH', 1, 2);
      const form = within(await screen.findByRole('dialog', { name: 'Créer une réservation' }));
      expect(await form.findByText(/Sans licence valide, vous volez avec un instructeur/)).toBeInTheDocument();

      // Without an instructor nothing is sent.
      await user.click(form.getByRole('button', { name: 'Créer la réservation' }));
      expect(await form.findByText('Veuillez choisir un instructeur.')).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(createVariables).not.toHaveBeenCalled();

      await user.click(form.getByRole('combobox', { name: /Avec un instructeur/ }));
      await user.click(await screen.findByRole('option', { name: 'Marie Laurent' }));
      await user.click(form.getByRole('button', { name: 'Créer la réservation' }));

      await waitFor(() => expect(createVariables).toHaveBeenCalledTimes(1));
      expect(createVariables.mock.calls[0][0].input).toMatchObject({
        aircraft_id: 2,
        user_id: USER_ID,
        instructor_id: 3,
        flight_category: 'INSTRUCTION',
      });
    });

    it("ne doit envoyer aucun instructeur pour une réservation qui n'en a pas", async () => {
      jest.setSystemTime(EARLY_MORNING);
      const user = userEvent.setup();
      const createVariables = jest.fn();
      const userLoaded = jest.fn(() => userMock.result as { data: Record<string, unknown> });

      renderPage([
        meMock,
        { ...userMock, result: userLoaded },
        settingsMock,
        aircraftsMock,
        instructorsMock,
        reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
        creation(createVariables),
        reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation, createdReservation]),
      ]);
      await screen.findByRole('table');
      await waitFor(() => expect(userLoaded).toHaveBeenCalled());

      dragOverFreeCells('F-EFGH', 1, 2);
      const form = within(await screen.findByRole('dialog', { name: 'Créer une réservation' }));
      await user.click(form.getByRole('combobox', { name: /Catégorie de vol/ }));
      await user.click(await screen.findByRole('option', { name: 'Local' }));
      await user.click(form.getByRole('button', { name: 'Créer la réservation' }));

      await waitFor(() => expect(createVariables).toHaveBeenCalledTimes(1));
      expect(createVariables.mock.calls[0][0].input).not.toHaveProperty('instructor_id');
      expect(createVariables.mock.calls[0][0].input).not.toHaveProperty('course_id');
    });

    it("doit montrer l'instructeur dans la grille et laisser l'instructeur du vol le décliner", async () => {
      jest.setSystemTime(EARLY_MORNING);
      const user = userEvent.setup();
      const deleted = jest.fn(() => ({ data: { deleteReservation: true } }));

      renderPage([
        meMock,
        userMock,
        settingsMock,
        aircraftsMock,
        reservationsMock(TODAY_STR, TOMORROW_STR, [instruction]),
        { request: { query: DELETE_RESERVATION, variables: { id: 5 } }, result: deleted },
        reservationsMock(TODAY_STR, TOMORROW_STR, []),
      ]);

      await screen.findByRole('table');
      // The pilot and the instructor, on the block of the booking.
      const block = within(getRowFor('F-ABCD')).getByRole('button', { name: /Leçon 13/ });
      expect(block).toHaveTextContent('Camille · avec Alex Martin');

      await user.click(block);
      const detail = within(await screen.findByRole('dialog', { name: 'Détails de la réservation' }));
      // Offered once the signed-in member is known to be the instructor of the booking.
      expect(await detail.findByRole('button', { name: 'Décliner le vol' })).toBeInTheDocument();
      expect(detail.getByText('Alex Martin')).toBeInTheDocument();
      // Changing the booking stays its holder's.
      expect(detail.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();

      await user.click(detail.getByRole('button', { name: 'Décliner le vol' }));
      const confirmation = within(await screen.findByRole('alertdialog'));
      expect(confirmation.getByText("Décliner ce vol d'instruction ?")).toBeInTheDocument();
      expect(deleted).not.toHaveBeenCalled();
      await user.click(confirmation.getByRole('button', { name: 'Décliner le vol' }));

      await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
    });

    it("doit réserver l'avion d'un cours : son jour, son élève et son instructeur", async () => {
      jest.setSystemTime(EARLY_MORNING);
      const user = userEvent.setup();
      const createVariables = jest.fn();
      const userLoaded = jest.fn(() => userMock.result as { data: Record<string, unknown> });
      window.history.pushState(
        null,
        '',
        `/reservations?course_id=12&date=${AFTER_TOMORROW_STR}&start_time=09%3A00&end_time=11%3A00&flight_category=INSTRUCTION&instructor_id=${USER_ID}&instructor=Alex+Martin&student=Emma+Girard`,
      );

      try {
        renderPage([
          meMock,
          { ...userMock, result: userLoaded },
          settingsMock,
          aircraftsMock,
          reservationsMock(AFTER_TOMORROW_STR, '2024-10-26', []),
          creation(createVariables),
          reservationsMock(AFTER_TOMORROW_STR, '2024-10-26', []),
        ]);

        const form = within(await screen.findByRole('dialog', { name: 'Nouvelle réservation' }));
        expect(form.getByRole('note')).toHaveTextContent(
          "Réservation de l'avion du cours de Emma Girard avec Alex Martin.",
        );
        expect(form.queryByRole('combobox', { name: /Avec un instructeur/ })).not.toBeInTheDocument();

        await user.click(form.getByRole('combobox', { name: /Avion/ }));
        await user.click(await screen.findByRole('option', { name: /F-EFGH/ }));
        await waitFor(() => expect(userLoaded).toHaveBeenCalled());
        await user.click(form.getByRole('button', { name: 'Créer la réservation' }));

        await waitFor(() => expect(createVariables).toHaveBeenCalledTimes(1));
        const { input } = createVariables.mock.calls[0][0];
        // The API takes the student and the instructor from the course.
        expect(input).toMatchObject({ aircraft_id: 2, course_id: 12, flight_category: 'INSTRUCTION' });
        expect(input).not.toHaveProperty('instructor_id');
        expect(new Date(input.start_time).getTime()).toBe(new Date(2024, 9, 25, 9, 0).getTime());
      } finally {
        window.history.pushState(null, '', '/');
      }
    });
  });

  it("doit ouvrir le formulaire prérempli quand on arrive depuis un modèle de réservation", async () => {
    jest.setSystemTime(EARLY_MORNING);
    const user = userEvent.setup();
    const createVariables = jest.fn();
    const userLoaded = jest.fn(() => userMock.result as { data: Record<string, unknown> });
    window.history.pushState(
      null,
      '',
      '/reservations?aircraft_id=2&start_time=09%3A00&end_time=11%3A00&flight_category=LOCAL&purpose=Tours+de+piste',
    );

    try {
      renderPage([
        meMock,
        { ...userMock, result: userLoaded },
        settingsMock,
        aircraftsMock,
        reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation]),
        {
          request: { query: CREATE_RESERVATION },
          variableMatcher: (variables) => {
            createVariables(variables);
            return true;
          },
          result: {
            data: {
              createReservation: {
                id: 2,
                start_time: createdReservation.start_time,
                end_time: createdReservation.end_time,
                purpose: 'Tours de piste',
                aircraft: createdReservation.aircraft,
                user: createdReservation.user,
              },
            },
          },
        },
        reservationsMock(TODAY_STR, TOMORROW_STR, [existingReservation, createdReservation]),
      ]);

      const dialog = await screen.findByRole('dialog', { name: 'Nouvelle réservation' });
      const form = within(dialog);
      expect(form.getByLabelText('But de la réservation')).toHaveValue('Tours de piste');
      expect(form.getByLabelText(/^Début/)).toHaveValue('09:00');
      expect(form.getByLabelText(/^Fin/)).toHaveValue('11:00');
      expect(form.getByRole('combobox', { name: /Avion/ })).toHaveTextContent('F-EFGH');
      expect(form.getByRole('combobox', { name: /Catégorie de vol/ })).toHaveTextContent('Local');
      // Les valeurs du modèle ne restent pas dans l'adresse de la page.
      expect(window.location.search).toBe('');

      await waitFor(() => expect(userLoaded).toHaveBeenCalled());
      await user.click(form.getByRole('button', { name: 'Créer la réservation' }));

      await waitFor(() => expect(createVariables).toHaveBeenCalledTimes(1));
      const { input } = createVariables.mock.calls[0][0];
      expect(input).toMatchObject({
        aircraft_id: 2,
        purpose: 'Tours de piste',
        user_id: USER_ID,
        estimated_flight_hours: 2,
        flight_category: 'LOCAL',
      });
      // Every booking is confirmed by the API: no status is sent.
      expect(input).not.toHaveProperty('status');
      expect(new Date(input.start_time).getTime()).toBe(new Date(2024, 9, 23, 9, 0).getTime());
      expect(new Date(input.end_time).getTime()).toBe(new Date(2024, 9, 23, 11, 0).getTime());
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    } finally {
      window.history.pushState(null, '', '/');
    }
  });

  it('doit afficher la vue mobile (liste des réservations) sur petit écran', async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Réservations du mercredi 23 octobre 2024')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nouvelle réservation/ })).toBeInTheDocument();

    const item = screen.getByRole('button', { name: /F-ABCD/ });
    expect(item).toHaveTextContent('09:00 – 11:00');
    expect(item).toHaveTextContent('Navigation solo');
    expect(item).toHaveTextContent('En attente');

    // Un seul appui ouvre le détail.
    await user.click(item);

    const dialog = await screen.findByRole('dialog', { name: 'Détails de la réservation' });
    expect(within(dialog).getByText('En attente')).toBeInTheDocument();
    expect(within(dialog).getByText('09:00 – 11:00')).toBeInTheDocument();
  });
  it('doit montrer sur petit écran quand chaque avion est libre et préremplir la réservation', async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Créneaux libres' })).toBeInTheDocument();

    // Ouverture 08:00–12:00, il est 10:00 : F-ABCD est pris de 09:00 à 11:00, F-EFGH est libre.
    const booked = screen.getByRole('group', { name: 'Créneaux libres de F-ABCD' });
    expect(within(booked).getAllByRole('button').map((button) => button.textContent)).toEqual(['11:00 – 12:00']);
    const free = screen.getByRole('group', { name: 'Créneaux libres de F-EFGH' });
    expect(within(free).getAllByRole('button').map((button) => button.textContent)).toEqual(['10:00 – 12:00']);

    await user.click(within(free).getByRole('button', { name: '10:00 – 12:00' }));

    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle réservation' });
    expect(within(dialog).getByRole('combobox', { name: /Avion/ })).toHaveTextContent('F-EFGH');
    expect(within(dialog).getByLabelText(/Début/)).toHaveValue('10:00');
    expect(within(dialog).getByLabelText(/Fin/)).toHaveValue('11:00');
  });

  describe('maintenance hebdomadaire', () => {
    const maintenanceMocks = () => [
      meMock,
      userMock,
      maintenanceTodayMock,
      aircraftsMock,
      reservationsMock(TODAY_STR, TOMORROW_STR, []),
    ];

    it('montre le créneau de maintenance comme indisponible, sans le proposer', async () => {
      jest.setSystemTime(EARLY_MORNING);
      renderPage(maintenanceMocks());
      await screen.findByRole('table');

      // The notice above the grid, then one cell per aircraft.
      expect(screen.getAllByText('Maintenance hebdomadaire')).toHaveLength(3);
      expect(
        screen.getByText(/De 08:00 à 10:00, les avions du club sont en maintenance/),
      ).toBeInTheDocument();
      for (const registration of ['F-ABCD', 'F-EFGH']) {
        const row = within(getRowFor(registration));
        expect(row.getByText('Maintenance hebdomadaire')).toBeInTheDocument();
        // Only 10:00 and 11:00 are offered.
        expect(row.getAllByRole('cell', { name: /^Réserver / }).map((cell) => cell.getAttribute('aria-label'))).toEqual([
          `Réserver ${registration} à 10:00`,
          `Réserver ${registration} à 11:00`,
        ]);
      }
    });

    it('refuse dans le formulaire un horaire qui empiète sur la maintenance', async () => {
      jest.setSystemTime(EARLY_MORNING);
      const user = userEvent.setup();
      renderPage(maintenanceMocks());
      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'Nouvelle réservation' }));
      const dialog = await screen.findByRole('dialog', { name: 'Nouvelle réservation' });
      const start = within(dialog).getByLabelText(/Début/);
      const end = within(dialog).getByLabelText(/Fin/);
      await user.clear(start);
      await user.type(start, '09:00');
      await user.clear(end);
      await user.type(end, '11:00');
      await user.click(within(dialog).getByRole('button', { name: /Suivant|Réserver|Créer/ }));

      expect(
        await within(dialog).findByText(/empiète sur la maintenance hebdomadaire \(08:00 – 10:00\)/),
      ).toBeInTheDocument();
    });

    it('ne propose pas la maintenance comme créneau libre sur petit écran', async () => {
      jest.setSystemTime(EARLY_MORNING);
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      renderPage(maintenanceMocks());

      expect(await screen.findByRole('heading', { name: 'Créneaux libres' })).toBeInTheDocument();
      const free = screen.getByRole('group', { name: 'Créneaux libres de F-EFGH' });
      expect(within(free).getAllByRole('button').map((button) => button.textContent)).toEqual(['10:00 – 12:00']);
    });
  });
});
