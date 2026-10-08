import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import AircraftHistory from '../page';
import { GET_FLIGHT_HISTORY } from '@/graphql/planes';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// La page formate les dates avec toLocaleDateString() (locale de l'environnement).
const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
const period = (start: string, end: string) => `Du ${formatDate(start)} au ${formatDate(end)}`;

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
  const card = screen.getByText(registration).closest('.shadow-lg');
  if (!card) throw new Error(`Carte introuvable pour ${registration}`);
  return within(card as HTMLElement);
};

describe('AircraftHistory Component', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('doit afficher un squelette pendant le chargement puis le titre de la page', async () => {
    const { container } = renderPage();

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Historique des Vols et Maintenances')).not.toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Historique des Vols et Maintenances' }),
    ).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('doit afficher les informations des avions et leurs réservations', async () => {
    renderPage();

    await screen.findByText('F-ABCD');

    const first = getAircraftCard('F-ABCD');
    expect(first.getByText('Cessna 172')).toBeInTheDocument();
    expect(first.getByRole('tab', { name: 'Réservations' })).toHaveAttribute('aria-selected', 'true');
    expect(first.getByRole('tab', { name: 'Maintenances' })).toHaveAttribute('aria-selected', 'false');

    // Première page : les 5 premières réservations sur 7.
    expect(first.getAllByRole('listitem')).toHaveLength(5);
    const firstItem = within(first.getAllByRole('listitem')[0]);
    expect(
      firstItem.getByText(period(reservations[0].start_time, reservations[0].end_time)),
    ).toBeInTheDocument();
    expect(firstItem.getByText('John Doe')).toBeInTheDocument();
    expect(within(first.getAllByRole('listitem')[1]).getByText('Alice Martin')).toBeInTheDocument();
    expect(
      first.queryByText(period(reservations[5].start_time, reservations[5].end_time)),
    ).not.toBeInTheDocument();

    // Second avion : aucune réservation, pas de pagination.
    const second = getAircraftCard('F-WXYZ');
    expect(second.getByText('Piper PA-28')).toBeInTheDocument();
    expect(second.getByText('Aucun élément récent.')).toBeInTheDocument();
    expect(second.queryByRole('listitem')).not.toBeInTheDocument();
    expect(second.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("doit afficher les maintenances après avoir ouvert l'onglet Maintenances", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    expect(card.queryByText('INSPECTION')).not.toBeInTheDocument();

    await user.click(card.getByRole('tab', { name: 'Maintenances' }));

    expect(card.getByRole('tab', { name: 'Maintenances' })).toHaveAttribute('aria-selected', 'true');
    const items = card.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const inspection = within(items[0]);
    expect(inspection.getByText(period('2023-09-01T12:00:00.000Z', '2023-09-10T12:00:00.000Z'))).toBeInTheDocument();
    expect(inspection.getByText('INSPECTION')).toBeInTheDocument();
    expect(inspection.getByText('Jane Smith')).toBeInTheDocument();

    const repair = within(items[1]);
    expect(repair.getByText('REPAIR')).toBeInTheDocument();
    expect(repair.getByText('Marc Dupont')).toBeInTheDocument();

    // Les réservations ne sont plus affichées dans cette carte.
    expect(card.queryByText('John Doe')).not.toBeInTheDocument();
    // 2 maintenances seulement : pas de pagination.
    expect(card.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();
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

    // Deuxième page : les 2 dernières réservations.
    const items = card.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(
      within(items[0]).getByText(period(reservations[5].start_time, reservations[5].end_time)),
    ).toBeInTheDocument();
    expect(
      within(items[1]).getByText(period(reservations[6].start_time, reservations[6].end_time)),
    ).toBeInTheDocument();
    expect(within(items[1]).getByText('Alice Martin')).toBeInTheDocument();
    expect(
      card.queryByText(period(reservations[0].start_time, reservations[0].end_time)),
    ).not.toBeInTheDocument();
  });

  it("doit filtrer les réservations par nom d'utilisateur", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    await user.click(card.getByRole('button', { name: 'Filtres' }));

    expect(await screen.findByText('Ajustez les filtres pour affiner les résultats.')).toBeInTheDocument();
    expect(screen.getByLabelText('Début')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Fin')).toHaveAttribute('type', 'date');

    await user.type(screen.getByPlaceholderText("Nom de l'utilisateur"), 'alice');

    // Seules les 2 réservations d'Alice Martin restent, la pagination disparaît.
    const items = card.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    items.forEach((item) => expect(within(item).getByText('Alice Martin')).toBeInTheDocument());
    expect(
      within(items[0]).getByText(period(reservations[1].start_time, reservations[1].end_time)),
    ).toBeInTheDocument();
    expect(
      within(items[1]).getByText(period(reservations[6].start_time, reservations[6].end_time)),
    ).toBeInTheDocument();
    expect(card.queryByText('John Doe')).not.toBeInTheDocument();
    expect(card.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Nom de l'utilisateur"));
    await user.type(screen.getByPlaceholderText("Nom de l'utilisateur"), 'inconnu');

    expect(card.queryByRole('listitem')).not.toBeInTheDocument();
    expect(card.getByText('Aucun élément récent.')).toBeInTheDocument();
  });

  it('doit filtrer les réservations par date de début', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const card = getAircraftCard('F-ABCD');
    await user.click(card.getByRole('button', { name: 'Filtres' }));

    await user.type(await screen.findByLabelText('Début'), '2024-06-01');

    // Seules les réservations de juin et juillet commencent après le 1er juin 2024.
    const items = card.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(
      within(items[0]).getByText(period(reservations[5].start_time, reservations[5].end_time)),
    ).toBeInTheDocument();
    expect(
      within(items[1]).getByText(period(reservations[6].start_time, reservations[6].end_time)),
    ).toBeInTheDocument();
  });

  it("doit afficher un message lorsqu'il n'y a aucun avion", async () => {
    renderPage([successMock({ getHistoryAircraft: [] })]);

    expect(await screen.findByText('Aucun avion trouvé.')).toBeInTheDocument();
    expect(screen.queryByText('Historique des Vols et Maintenances')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it("doit afficher un toast d'erreur et aucun contenu si la requête échoue", async () => {
    const { container } = renderPage([
      { request: { query: GET_FLIGHT_HISTORY }, error: new Error('Erreur réseau') },
    ]);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de charger l'historique des avions. Veuillez réessayer plus tard.",
      }),
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Historique des Vols et Maintenances')).not.toBeInTheDocument();
    expect(screen.queryByText('Aucun avion trouvé.')).not.toBeInTheDocument();
  });
});
