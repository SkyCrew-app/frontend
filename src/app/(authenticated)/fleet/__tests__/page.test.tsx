import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import FleetDashboard from '../page';
import { GET_AIRCRAFTS } from '@/graphql/planes';

// Les graphiques chart.js ont besoin d'un canvas : on les remplace par des éléments
// simples qui exposent les données reçues afin de pouvoir les vérifier.
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data }: any) => (
    <div
      data-testid="doughnut-chart"
      data-labels={JSON.stringify(data.labels)}
      data-values={JSON.stringify(data.datasets[0].data)}
    />
  ),
  Bar: ({ data }: any) => (
    <div
      data-testid="bar-chart"
      data-labels={JSON.stringify(data.labels)}
      data-values={JSON.stringify(data.datasets[0].data)}
    />
  ),
}));

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

type AircraftOverrides = Partial<{
  registration_number: string;
  model: string;
  availability_status: string;
  maintenance_status: string;
  hourly_cost: number;
  year_of_manufacture: number;
  total_flight_hours: number;
  image_url: string | null;
  documents_url: string[];
  maintenances: { id: number; maintenance_type: string }[];
}>;

const buildAircraft = (id: number, overrides: AircraftOverrides = {}) => ({
  id,
  registration_number: `F-TEST${id}`,
  model: 'Cessna 172',
  availability_status: 'AVAILABLE',
  maintenance_status: 'OPERATIONAL',
  hourly_cost: 150,
  year_of_manufacture: 2010,
  total_flight_hours: 1250,
  image_url: null,
  documents_url: [],
  consumption: 35,
  cruiseSpeed: 226,
  maxAltitude: 4100,
  maintenances: [],
  ...overrides,
});

// 10 aéronefs : 6 disponibles, 3 en maintenance, 1 réservé (8 par page => 2 pages).
const mockAircrafts = [
  buildAircraft(1, {
    registration_number: 'F-GABC',
    year_of_manufacture: 2012,
    documents_url: ['/uploads/docs/certificat.pdf'],
    maintenances: [{ id: 1, maintenance_type: 'INSPECTION' }],
  }),
  buildAircraft(2, { registration_number: 'F-GDEF', model: 'Piper PA-28' }),
  buildAircraft(3, {
    registration_number: 'F-HMNT',
    model: 'Diamond DA40',
    availability_status: 'UNAVAILABLE',
    maintenance_status: 'IN_MAINTENANCE',
    maintenances: [
      { id: 2, maintenance_type: 'REPAIR' },
      { id: 3, maintenance_type: 'INSPECTION' },
    ],
  }),
  buildAircraft(4, {
    registration_number: 'F-HRSV',
    model: 'Robin DR400',
    availability_status: 'RESERVATED',
    hourly_cost: 132.5,
  }),
  buildAircraft(5, { registration_number: 'F-GAV5' }),
  buildAircraft(6, { registration_number: 'F-GAV6' }),
  buildAircraft(7, {
    registration_number: 'F-HMN7',
    availability_status: 'UNAVAILABLE',
    maintenance_status: 'NEEDS_MAINTENANCE',
  }),
  buildAircraft(8, { registration_number: 'F-GAV8' }),
  buildAircraft(9, { registration_number: 'F-GAV9' }),
  buildAircraft(10, {
    registration_number: 'F-HMNX',
    model: 'Tecnam P2008',
    availability_status: 'UNAVAILABLE',
    maintenance_status: 'IN_MAINTENANCE',
  }),
];

const successMock = (aircrafts = mockAircrafts): MockedResponse => ({
  request: { query: GET_AIRCRAFTS },
  result: { data: { getAircrafts: aircrafts } },
});

const renderPage = (mocks: MockedResponse[] = [successMock()]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <FleetDashboard />
    </MockedProvider>,
  );

/** Lignes du corps du tableau (sans la ligne d'en-tête). */
const getBodyRows = () => screen.getAllByRole('row').slice(1);

const getRowOf = (registration: string) => {
  const row = screen.getByText(registration).closest('tr');
  if (!row) throw new Error(`Ligne introuvable pour ${registration}`);
  return within(row as HTMLElement);
};

describe('FleetDashboard Component', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  test('affiche les squelettes de chargement puis le contenu une fois les données reçues', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Tableau de Bord de la Flotte' })).toBeInTheDocument();

    // Pendant le chargement : 5 lignes squelettes, aucun graphique, compteurs à zéro.
    const loadingRows = getBodyRows();
    expect(loadingRows).toHaveLength(5);
    loadingRows.forEach((row) => {
      expect(row.querySelector('.animate-pulse')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('doughnut-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Tous\s*0$/ })).toBeInTheDocument();
    expect(screen.queryByText('Aucun aéronef trouvé')).not.toBeInTheDocument();

    expect(await screen.findByText('F-GABC')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  test('affiche les avions, les statistiques et les graphiques après le chargement', async () => {
    renderPage();

    await screen.findByText('F-GABC');

    // Première page : 8 aéronefs sur 10.
    expect(getBodyRows()).toHaveLength(8);
    expect(screen.queryByText('F-GAV9')).not.toBeInTheDocument();

    const available = getRowOf('F-GABC');
    expect(available.getByText('Cessna 172')).toBeInTheDocument();
    expect(available.getByText('Disponible')).toBeInTheDocument();
    expect(available.getByText('Opérationnel')).toBeInTheDocument();
    expect(available.getByText('1250 h')).toBeInTheDocument();
    expect(available.getByText('150.00 €')).toBeInTheDocument();

    const inMaintenance = getRowOf('F-HMNT');
    expect(inMaintenance.getByText('Diamond DA40')).toBeInTheDocument();
    // Statut de disponibilité + statut de maintenance portent le même libellé.
    expect(inMaintenance.getAllByText('En maintenance')).toHaveLength(2);

    const reserved = getRowOf('F-HRSV');
    expect(reserved.getByText('Réservé')).toBeInTheDocument();
    expect(reserved.getByText('132.50 €')).toBeInTheDocument();

    expect(getRowOf('F-HMN7').getByText('Maintenance requise')).toBeInTheDocument();

    // Cartes de statistiques.
    expect(screen.getByText('60% de la flotte')).toBeInTheDocument();
    expect(screen.getByText('30% de la flotte')).toBeInTheDocument();
    expect(screen.getByText('10% de la flotte')).toBeInTheDocument();

    // Compteurs des onglets.
    expect(screen.getByRole('tab', { name: /^Tous\s*10$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Disponibles\s*6$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^En Maintenance\s*3$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Réservés\s*1$/ })).toBeInTheDocument();

    // Données transmises aux graphiques.
    const doughnut = screen.getByTestId('doughnut-chart');
    expect(JSON.parse(doughnut.getAttribute('data-labels')!)).toEqual(['Disponible', 'En maintenance', 'Réservé']);
    expect(JSON.parse(doughnut.getAttribute('data-values')!)).toEqual([6, 3, 1]);

    const bar = screen.getByTestId('bar-chart');
    expect(JSON.parse(bar.getAttribute('data-labels')!)).toEqual([
      'Inspection',
      'Réparation',
      'Révision',
      'Mise à jour',
      'Nettoyage',
      'Autre',
    ]);
    expect(JSON.parse(bar.getAttribute('data-values')!)).toEqual([2, 1, 0, 0, 0, 0]);

    expect(mockToast).not.toHaveBeenCalled();
  });

  test("affiche un toast d'erreur et un tableau vide lorsque la requête échoue", async () => {
    renderPage([{ request: { query: GET_AIRCRAFTS }, error: new Error('Erreur réseau') }]);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les données des avions.',
      }),
    );

    expect(await screen.findByText('Aucun aéronef trouvé')).toBeInTheDocument();
    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /^Tous\s*0$/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
  });

  test("filtre la liste par immatriculation ou modèle via le champ de recherche", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    const search = screen.getByPlaceholderText('Rechercher...');

    // Recherche par modèle, insensible à la casse.
    await user.type(search, 'piper');
    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByText('F-GDEF')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();

    // Recherche par immatriculation.
    await user.clear(search);
    await user.type(search, 'f-hmn');
    expect(getBodyRows()).toHaveLength(3);
    expect(screen.getByText('F-HMNT')).toBeInTheDocument();
    expect(screen.getByText('F-HMN7')).toBeInTheDocument();
    expect(screen.getByText('F-HMNX')).toBeInTheDocument();

    // Aucun résultat.
    await user.clear(search);
    await user.type(search, 'boeing');
    expect(screen.getByText('Aucun aéronef trouvé')).toBeInTheDocument();
    expect(screen.getByText('Ajustez vos filtres ou ajoutez un nouvel aéronef')).toBeInTheDocument();

    // Les compteurs globaux ne dépendent pas de la recherche.
    expect(screen.getByRole('tab', { name: /^Tous\s*10$/ })).toBeInTheDocument();
  });

  test("filtre la liste par statut lorsqu'on change d'onglet", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    await user.click(screen.getByRole('tab', { name: /^En Maintenance/ }));

    expect(screen.getByRole('tab', { name: /^En Maintenance/ })).toHaveAttribute('aria-selected', 'true');
    expect(getBodyRows()).toHaveLength(3);
    expect(screen.getByText('F-HMNT')).toBeInTheDocument();
    expect(screen.getByText('F-HMN7')).toBeInTheDocument();
    expect(screen.getByText('F-HMNX')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Réservés/ }));

    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByText('F-HRSV')).toBeInTheDocument();
    expect(screen.queryByText('F-HMNT')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Tous/ }));
    expect(getBodyRows()).toHaveLength(8);
  });

  test("affiche la pagination et change de page lorsqu'on clique sur les numéros de page", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    const pagination = within(screen.getByRole('navigation', { name: 'pagination' }));
    expect(pagination.getByText('1')).toHaveAttribute('aria-current', 'page');
    expect(pagination.getByText('2')).not.toHaveAttribute('aria-current');
    expect(pagination.queryByLabelText('Go to previous page')).not.toBeInTheDocument();

    await user.click(pagination.getByText('2'));

    expect(getBodyRows()).toHaveLength(2);
    expect(screen.getByText('F-GAV9')).toBeInTheDocument();
    expect(screen.getByText('F-HMNX')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();
    expect(pagination.getByText('2')).toHaveAttribute('aria-current', 'page');
    expect(pagination.queryByLabelText('Go to next page')).not.toBeInTheDocument();

    await user.click(pagination.getByLabelText('Go to previous page'));

    expect(getBodyRows()).toHaveLength(8);
    expect(screen.getByText('F-GABC')).toBeInTheDocument();

    await user.click(pagination.getByLabelText('Go to next page'));
    expect(screen.getByText('F-GAV9')).toBeInTheDocument();

    // Une recherche ramène à la première page.
    await user.type(screen.getByPlaceholderText('Rechercher...'), 'cessna');
    expect(screen.getByText('F-GABC')).toBeInTheDocument();
  });

  test("ouvre la fenêtre de détails de l'avion lorsque le bouton Détails est cliqué", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir les détails de F-GABC' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'F-GABC - Cessna 172' })).toBeInTheDocument();
    expect(dialog.getByText('Informations générales')).toBeInTheDocument();
    expect(dialog.getByText('2012')).toBeInTheDocument();
    expect(dialog.getByText('1250 heures')).toBeInTheDocument();
    expect(dialog.getByText('150.00 €')).toBeInTheDocument();
    expect(dialog.getByText('35 L/h')).toBeInTheDocument();
    expect(dialog.getByText('Disponible')).toBeInTheDocument();
    expect(dialog.getByText('Opérationnel')).toBeInTheDocument();
    expect(dialog.getByText('Document 1 - certificat.pdf')).toBeInTheDocument();
    expect(dialog.getByText('Aucune image disponible')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Fermer' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('recharge les données et affiche un toast lorsque le bouton Actualiser est cliqué', async () => {
    const user = userEvent.setup();
    renderPage([
      successMock(),
      successMock([buildAircraft(42, { registration_number: 'F-NEUF', model: 'Cirrus SR22' })]),
    ]);
    await screen.findByText('F-GABC');

    await user.click(screen.getByRole('button', { name: 'Actualiser les données' }));

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Actualisation',
      description: 'Les données ont été actualisées.',
    });

    expect(await screen.findByText('F-NEUF')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();
    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /^Tous\s*1$/ })).toBeInTheDocument();
    expect(screen.getByText('100% de la flotte')).toBeInTheDocument();
  });
});
