import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import AircraftHistory from '../page';
import { GET_FLIGHT_HISTORY } from '@/graphql/planes';
import { formatDate, formatDateTime } from '@/lib/format';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Le sélecteur de période (calendrier) est remplacé par deux champs de date simples.
jest.mock('@/components/ui/date-range-picker', () => ({
  DateRangePicker: ({ dateRange, onSelect }: any) => {
    const toValue = (date?: Date) => (date ? date.toISOString().slice(0, 10) : '');
    const toDate = (value: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
    return (
      <div>
        <input
          type="date"
          aria-label="Du"
          value={toValue(dateRange?.from)}
          onChange={(event) => onSelect({ from: toDate(event.target.value), to: dateRange?.to })}
        />
        <input
          type="date"
          aria-label="Au"
          value={toValue(dateRange?.to)}
          onChange={(event) => onSelect({ from: dateRange?.from, to: toDate(event.target.value) })}
        />
      </div>
    );
  },
}));

// Radix Select s'appuie sur des API absentes de jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

// getByText normalise les espaces du texte affiché : on fait de même pour la valeur attendue.
const dateTime = (iso: string) => formatDateTime(iso).replace(/\s/g, ' ');
const date = (iso: string) => formatDate(iso).replace(/\s/g, ' ');

const users = [
  { first_name: 'John', last_name: 'Doe' },
  { first_name: 'Alice', last_name: 'Martin' },
];

// 7 réservations (5 par page => 2 pages) : une par mois de janvier à juillet 2024.
const reservations = Array.from({ length: 7 }, (_, i) => {
  const month = String(i + 1).padStart(2, '0');
  return {
    id: `r${i + 1}`,
    start_time: `2024-${month}-10T12:00:00.000Z`,
    end_time: `2024-${month}-12T12:00:00.000Z`,
    // Alice Martin a les réservations r2 et r7, John Doe les autres.
    user: i === 1 || i === 6 ? users[1] : users[0],
  };
});

const mockData = {
  getHistoryAircraft: [
    {
      id: '1',
      registration_number: 'F-ABCD',
      model: 'Cessna 172',
      reservations,
      maintenances: [
        {
          id: 'm1',
          maintenance_type: 'INSPECTION',
          start_date: '2023-09-01T12:00:00.000Z',
          end_date: '2023-09-10T12:00:00.000Z',
          technician: { first_name: 'Jane', last_name: 'Smith' },
        },
        {
          id: 'm2',
          maintenance_type: 'REPAIR',
          start_date: '2023-11-03T12:00:00.000Z',
          end_date: '2023-11-08T12:00:00.000Z',
          technician: { first_name: 'Marc', last_name: 'Dupont' },
        },
      ],
    },
    {
      id: '2',
      registration_number: 'F-WXYZ',
      model: 'Piper PA-28',
      reservations: [],
      maintenances: [],
    },
  ],
};

const successMock = (data: unknown = mockData): MockedResponse => ({
  request: { query: GET_FLIGHT_HISTORY },
  result: { data: data as Record<string, any> },
});

const renderPage = (mocks: MockedResponse[] = [successMock()]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AircraftHistory />
    </MockedProvider>,
  );

/** Carte (Card) d'un avion, identifiée par son immatriculation. */
const getAircraftCard = (registration: string) => {
  const card = screen.getByText(registration).closest('[data-aircraft-card]');
  if (!card) throw new Error(`Carte introuvable pour ${registration}`);
  return within(card as HTMLElement);
};

/** Lignes de données (sans l'en-tête) du tableau affiché dans une carte. */
const rowsOf = (card: { getAllByRole: (role: string) => HTMLElement[] }) => card.getAllByRole('row').slice(1);

const TITLE = 'Historique de la flotte';

describe('AircraftHistory Component', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('doit afficher le titre dès le chargement, avec un squelette à la place du contenu', async () => {
    const { container } = renderPage();

    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    expect(await screen.findByText('F-ABCD')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('doit afficher les avions et leurs réservations, de la plus récente à la plus ancienne', async () => {
    renderPage();

    await screen.findByText('F-ABCD');

    const first = getAircraftCard('F-ABCD');
    expect(first.getByText('Cessna 172')).toBeInTheDocument();
    expect(first.getByRole('tab', { name: 'Réservations (7)' })).toHaveAttribute('aria-selected', 'true');
    expect(first.getByRole('tab', { name: 'Maintenances (2)' })).toHaveAttribute('aria-selected', 'false');

    // Première page : les 5 réservations les plus récentes sur 7 (juillet à mars).
    const rows = rowsOf(first);
    expect(rows).toHaveLength(5);
    const latest = within(rows[0]);
    expect(latest.getByText(dateTime(reservations[6].start_time))).toBeInTheDocument();
    expect(latest.getByText(dateTime(reservations[6].end_time))).toBeInTheDocument();
    // Deux jours de réservation, durée formatée par l'outil commun.
    expect(latest.getByText('48 h')).toBeInTheDocument();
    expect(latest.getByText('Alice Martin')).toBeInTheDocument();
    expect(within(rows[1]).getByText('John Doe')).toBeInTheDocument();
    expect(first.queryByText(dateTime(reservations[0].start_time))).not.toBeInTheDocument();
    expect(first.getByText('1–5 sur 7 réservations')).toBeInTheDocument();

    // Second avion : aucune réservation, ni tableau ni pagination.
    const second = getAircraftCard('F-WXYZ');
    expect(second.getByText('Piper PA-28')).toBeInTheDocument();
    expect(second.getByText('Aucune réservation pour cet aéronef.')).toBeInTheDocument();
    expect(second.queryByRole('table')).not.toBeInTheDocument();
    expect(second.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("doit afficher les maintenances avec leur libellé après avoir ouvert l'onglet Maintenances", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    expect(card.queryByText('Inspection')).not.toBeInTheDocument();

    await user.click(card.getByRole('tab', { name: 'Maintenances (2)' }));

    expect(card.getByRole('tab', { name: 'Maintenances (2)' })).toHaveAttribute('aria-selected', 'true');
    const rows = rowsOf(card);
    expect(rows).toHaveLength(2);

    // La plus récente d'abord ; jamais de code brut (REPAIR, INSPECTION).
    const repair = within(rows[0]);
    expect(repair.getByText('Réparation')).toBeInTheDocument();
    expect(repair.getByText(date('2023-11-03T12:00:00.000Z'))).toBeInTheDocument();
    expect(repair.getByText(date('2023-11-08T12:00:00.000Z'))).toBeInTheDocument();
    expect(repair.getByText('5 jours')).toBeInTheDocument();
    expect(repair.getByText('Marc Dupont')).toBeInTheDocument();

    const inspection = within(rows[1]);
    expect(inspection.getByText('Inspection')).toBeInTheDocument();
    expect(inspection.getByText('9 jours')).toBeInTheDocument();
    expect(inspection.getByText('Jane Smith')).toBeInTheDocument();
    expect(card.queryByText('INSPECTION')).not.toBeInTheDocument();
    expect(card.queryByText('REPAIR')).not.toBeInTheDocument();

    // Les réservations ne sont plus affichées dans cette carte.
    expect(card.queryByText('John Doe')).not.toBeInTheDocument();
    // 2 maintenances seulement : pas de pagination.
    expect(card.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();
  });

  it("doit afficher une maintenance sans technicien au lieu de planter", async () => {
    const user = userEvent.setup();
    renderPage([
      successMock({
        getHistoryAircraft: [
          {
            ...mockData.getHistoryAircraft[0],
            maintenances: [{ ...mockData.getHistoryAircraft[0].maintenances[0], technician: null }],
          },
        ],
      }),
    ]);
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    await user.click(card.getByRole('tab', { name: 'Maintenances (1)' }));

    expect(within(rowsOf(card)[0]).getByText('Non assigné')).toBeInTheDocument();
  });

  it('doit paginer les réservations par groupes de 5', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    expect(card.getByText('Page 1 sur 2')).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    expect(card.getByRole('button', { name: 'Suivant' })).toBeEnabled();

    await user.click(card.getByRole('button', { name: 'Suivant' }));

    // Deuxième page : les 2 réservations les plus anciennes.
    const rows = rowsOf(card);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(dateTime(reservations[1].start_time))).toBeInTheDocument();
    expect(within(rows[0]).getByText('Alice Martin')).toBeInTheDocument();
    expect(within(rows[1]).getByText(dateTime(reservations[0].start_time))).toBeInTheDocument();
    expect(card.queryByText(dateTime(reservations[6].start_time))).not.toBeInTheDocument();
    expect(card.getByText('Page 2 sur 2')).toBeInTheDocument();
    expect(card.getByText('6–7 sur 7 réservations')).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Suivant' })).toBeDisabled();
    expect(card.getByRole('button', { name: 'Précédent' })).toBeEnabled();

    await user.click(card.getByRole('button', { name: 'Précédent' }));

    expect(card.getByText('Page 1 sur 2')).toBeInTheDocument();
    expect(rowsOf(card)).toHaveLength(5);
    expect(card.getByText(dateTime(reservations[6].start_time))).toBeInTheDocument();
  });

  it('doit revenir sur la première page quand un filtre réduit la liste', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    await user.click(card.getByRole('button', { name: 'Suivant' }));
    expect(card.getByText('Page 2 sur 2')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: "Rechercher dans l'historique" }), 'alice');

    const rows = rowsOf(card);
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(within(row).getByText('Alice Martin')).toBeInTheDocument());
  });

  it("doit filtrer par nom de pilote et masquer les avions sans résultat", async () => {
    const user = userEvent.setup();
    const otherReservations = [
      { id: 'o1', start_time: '2024-08-01T12:00:00.000Z', end_time: '2024-08-02T12:00:00.000Z', user: users[0] },
      { id: 'o2', start_time: '2024-09-01T12:00:00.000Z', end_time: '2024-09-02T12:00:00.000Z', user: users[0] },
    ];
    renderPage([
      successMock({
        getHistoryAircraft: [
          mockData.getHistoryAircraft[0],
          { ...mockData.getHistoryAircraft[1], reservations: otherReservations },
        ],
      }),
    ]);
    await screen.findByText('F-ABCD');
    expect(rowsOf(getAircraftCard('F-WXYZ'))).toHaveLength(2);

    const search = screen.getByRole('textbox', { name: "Rechercher dans l'historique" });
    await user.type(search, 'alice');

    // Seules les 2 réservations d'Alice Martin restent, la pagination disparaît.
    const card = getAircraftCard('F-ABCD');
    const rows = rowsOf(card);
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(within(row).getByText('Alice Martin')).toBeInTheDocument());
    expect(within(rows[0]).getByText(dateTime(reservations[6].start_time))).toBeInTheDocument();
    expect(within(rows[1]).getByText(dateTime(reservations[1].start_time))).toBeInTheDocument();
    expect(card.queryByText('John Doe')).not.toBeInTheDocument();
    expect(card.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();
    expect(card.getByRole('tab', { name: 'Réservations (2)' })).toBeInTheDocument();
    expect(card.getByRole('tab', { name: 'Maintenances (0)' })).toBeInTheDocument();
    // L'autre avion n'a que des réservations de John Doe : il n'est plus listé.
    expect(screen.queryByText('F-WXYZ')).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'inconnu');

    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();

    // Réinitialiser rend toutes les cartes.
    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(rowsOf(getAircraftCard('F-ABCD'))).toHaveLength(5);
    expect(rowsOf(getAircraftCard('F-WXYZ'))).toHaveLength(2);
  });

  it('doit filtrer les maintenances par type ou par technicien', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const search = screen.getByRole('textbox', { name: "Rechercher dans l'historique" });
    await user.type(search, 'réparation');

    const card = getAircraftCard('F-ABCD');
    expect(card.getByRole('tab', { name: 'Réservations (0)' })).toBeInTheDocument();
    expect(card.getByText('Aucune réservation ne correspond à ces filtres.')).toBeInTheDocument();
    await user.click(card.getByRole('tab', { name: 'Maintenances (1)' }));
    expect(within(rowsOf(card)[0]).getByText('Marc Dupont')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'jane');
    expect(within(rowsOf(card)[0]).getByText('Inspection')).toBeInTheDocument();
    expect(rowsOf(card)).toHaveLength(1);
  });

  it('doit filtrer les réservations et les maintenances par période', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    await user.type(screen.getByLabelText('Du'), '2024-06-01');

    // Seules les réservations de juin et juillet se terminent après le 1er juin 2024.
    const card = getAircraftCard('F-ABCD');
    let rows = rowsOf(card);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(dateTime(reservations[6].start_time))).toBeInTheDocument();
    expect(within(rows[1]).getByText(dateTime(reservations[5].start_time))).toBeInTheDocument();
    // Les maintenances de 2023 sont hors période.
    expect(card.getByRole('tab', { name: 'Maintenances (0)' })).toBeInTheDocument();

    // La date de fin est incluse en entier : la réservation du 10 juin reste visible.
    await user.type(screen.getByLabelText('Au'), '2024-06-10');
    rows = rowsOf(card);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText(dateTime(reservations[5].start_time))).toBeInTheDocument();
  });

  it("doit n'afficher que l'aéronef choisi dans le sélecteur", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    await user.click(screen.getByRole('combobox', { name: 'Filtrer par aéronef' }));
    await user.click(await screen.findByRole('option', { name: /F-WXYZ/ }));

    expect(document.querySelectorAll('[data-aircraft-card]')).toHaveLength(1);
    expect(getAircraftCard('F-WXYZ').getByText('Aucune réservation pour cet aéronef.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(document.querySelectorAll('[data-aircraft-card]')).toHaveLength(2);
  });

  it("doit afficher un état vide sous le titre lorsqu'il n'y a aucun avion", async () => {
    renderPage([successMock({ getHistoryAircraft: [] })]);

    expect(await screen.findByText('Aucun aéronef')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it("doit afficher un état d'erreur sans toast et permettre de réessayer si la requête échoue", async () => {
    const user = userEvent.setup();
    renderPage([{ request: { query: GET_FLIGHT_HISTORY }, error: new Error('Erreur réseau') }, successMock()]);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
    expect(screen.queryByText('Erreur réseau')).not.toBeInTheDocument();
    expect(screen.queryByText('Aucun aéronef')).not.toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('F-ABCD')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
