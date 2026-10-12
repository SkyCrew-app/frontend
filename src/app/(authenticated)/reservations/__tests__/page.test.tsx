import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import ReservationCalendar from '../page';
import { CREATE_RESERVATION, DELETE_RESERVATION, GET_FILTERED_RESERVATIONS } from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { GET_SETTINGS } from '@/graphql/settings';
import { GET_ME, GET_USER_BY_EMAIL } from '@/graphql/user';

// Mercredi 23 octobre 2024, 10h00 (heure locale) : la page démarre sur "aujourd'hui".
const TODAY = new Date(2024, 9, 23, 10, 0, 0);
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
  user: { id: OTHER_USER_ID, first_name: 'Camille', last_name: null },
  aircraft: { id: 1, registration_number: 'F-ABCD' },
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
  user: { id: USER_ID, first_name: 'Alex', last_name: null },
  aircraft: { id: 2, registration_number: 'F-EFGH' },
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

// Ouverture de 08:00 à 12:00 => 4 créneaux d'une heure (08, 09, 10, 11) ; fermeture le jeudi.
const settingsMock: MockedResponse = {
  request: { query: GET_SETTINGS },
  result: {
    data: {
      getAllAdministrations: [
        { closureDays: ['jeudi'], reservationStartTime: '08:00', reservationEndTime: '12:00' },
      ],
    },
  },
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
    expect(legend.getByText('En attente')).toBeInTheDocument();
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
    expect(details.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
  });

  it("doit proposer de modifier et de supprimer une réservation à son propriétaire", async () => {
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
    expect(within(dialog).getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
  });

  it("doit demander confirmation avant de supprimer une réservation", async () => {
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
    await user.click(await within(dialog).findByRole('button', { name: 'Supprimer' }));

    // Rien n'est supprimé tant que la confirmation, qui nomme la réservation, n'est pas validée.
    const confirmation = await screen.findByRole('alertdialog', { name: 'Supprimer cette réservation ?' });
    expect(confirmation).toHaveTextContent('F-EFGH');
    expect(confirmation).toHaveTextContent('de 09:00 à 11:00');
    expect(deleteVariables).not.toHaveBeenCalled();

    await user.click(within(confirmation).getByRole('button', { name: 'Supprimer la réservation' }));

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

    await user.click(form.getByRole('combobox'));
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
      status: 'PENDING',
      notes: '',
      flight_category: 'LOCAL',
    });
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

  it("doit ouvrir le formulaire prérempli quand on arrive depuis un modèle de réservation", async () => {
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
        status: 'PENDING',
        flight_category: 'LOCAL',
      });
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
});
