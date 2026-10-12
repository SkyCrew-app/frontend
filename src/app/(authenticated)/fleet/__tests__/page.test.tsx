import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import FleetDashboard from '../page';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { formatMoney } from '@/lib/format';

// getByText normalise les espaces insécables du texte affiché : on fait de même pour la valeur attendue.
const money = (value: number) => formatMoney(value).replace(/\s/g, ' ');

// Les graphiques recharts ne se dessinent pas dans jsdom : on les remplace par des
// éléments simples qui exposent les données reçues afin de pouvoir les vérifier.
jest.mock('recharts', () => {
  const chart = (testId: string) => {
    const Chart = ({ data }: any) => (
      <div
        data-testid={testId}
        data-labels={JSON.stringify(data.map((item: any) => item.name))}
        data-values={JSON.stringify(data.map((item: any) => item.value))}
      />
    );
    return Chart;
  };
  const Passthrough = ({ children }: any) => <div>{children}</div>;
  const Nothing = () => null;
  return {
    ResponsiveContainer: Passthrough,
    PieChart: Passthrough,
    Pie: chart('availability-chart'),
    BarChart: chart('maintenance-chart'),
    Bar: Nothing,
    Cell: Nothing,
    CartesianGrid: Nothing,
    Tooltip: Nothing,
    XAxis: Nothing,
    YAxis: Nothing,
  };
});

// Radix Select s'appuie sur des API absentes de jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

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

    // Le titre est présent dès le chargement.
    expect(screen.getByRole('heading', { level: 1, name: 'Flotte' })).toBeInTheDocument();

    // Pendant le chargement : 5 lignes squelettes, aucun graphique, aucun message vide.
    const loadingRows = getBodyRows();
    expect(loadingRows).toHaveLength(5);
    loadingRows.forEach((row) => {
      expect(row.querySelector('.animate-pulse')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('availability-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('maintenance-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('Aucun aéronef')).not.toBeInTheDocument();

    expect(await screen.findByText('F-GABC')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    expect(screen.getByTestId('availability-chart')).toBeInTheDocument();
    expect(screen.getByTestId('maintenance-chart')).toBeInTheDocument();
  });

  test('affiche les avions, les statistiques et les graphiques après le chargement', async () => {
    renderPage();

    await screen.findByText('F-GABC');

    // Première page : 8 aéronefs sur 10.
    expect(getBodyRows()).toHaveLength(8);
    expect(screen.queryByText('F-GAV9')).not.toBeInTheDocument();
    expect(screen.getByText('1–8 sur 10 aéronefs')).toBeInTheDocument();

    const available = getRowOf('F-GABC');
    expect(available.getByText('Cessna 172')).toBeInTheDocument();
    expect(available.getByText('Disponible')).toBeInTheDocument();
    expect(available.getByText('Opérationnel')).toBeInTheDocument();
    expect(available.getByText('1250 h')).toBeInTheDocument();
    expect(available.getByText(money(150))).toBeInTheDocument();

    // Un seul libellé par statut : « Indisponible » pour la disponibilité,
    // « En maintenance » pour l'état de maintenance.
    const inMaintenance = getRowOf('F-HMNT');
    expect(inMaintenance.getByText('Diamond DA40')).toBeInTheDocument();
    expect(inMaintenance.getByText('Indisponible')).toBeInTheDocument();
    expect(inMaintenance.getByText('En maintenance')).toBeInTheDocument();

    const reserved = getRowOf('F-HRSV');
    expect(reserved.getByText('Réservé')).toBeInTheDocument();
    expect(reserved.getByText(money(132.5))).toBeInTheDocument();

    expect(getRowOf('F-HMN7').getByText('Maintenance requise')).toBeInTheDocument();

    // Chiffres clés : la part de la flotte est donnée sous chaque compteur.
    expect(screen.getByText('60 % de la flotte')).toBeInTheDocument();
    expect(screen.getByText('30 % de la flotte')).toBeInTheDocument();
    expect(screen.getByText('10 % de la flotte')).toBeInTheDocument();

    // Données transmises aux graphiques.
    const availability = screen.getByTestId('availability-chart');
    expect(JSON.parse(availability.getAttribute('data-labels')!)).toEqual(['Disponible', 'Réservé', 'Indisponible']);
    expect(JSON.parse(availability.getAttribute('data-values')!)).toEqual([6, 1, 3]);

    const maintenance = screen.getByTestId('maintenance-chart');
    expect(JSON.parse(maintenance.getAttribute('data-labels')!)).toEqual([
      'Inspection',
      'Réparation',
      'Révision',
      'Mise à jour logicielle',
      'Nettoyage',
      'Autre',
    ]);
    expect(JSON.parse(maintenance.getAttribute('data-values')!)).toEqual([2, 1, 0, 0, 0, 0]);

    expect(mockToast).not.toHaveBeenCalled();
  });

  test("affiche un état d'erreur sans toast lorsque la requête échoue, puis recharge avec Réessayer", async () => {
    const user = userEvent.setup();
    renderPage([{ request: { query: GET_AIRCRAFTS }, error: new Error('Erreur réseau') }, successMock()]);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Flotte' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Erreur réseau')).not.toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('F-GABC')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test("affiche un état vide lorsque la flotte ne contient aucun aéronef", async () => {
    renderPage([successMock([])]);

    expect(await screen.findByText('Aucun aéronef')).toBeInTheDocument();
    expect(getBodyRows()).toHaveLength(1);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  test("filtre la liste par immatriculation ou modèle via le champ de recherche", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    const search = screen.getByRole('textbox', { name: 'Rechercher un aéronef' });

    // Recherche par modèle, insensible à la casse.
    await user.type(search, 'piper');
    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByText('F-GDEF')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();

    // Recherche par immatriculation.
    await user.clear(search);
    await user.type(search, 'f-hmn');
    expect(getBodyRows()).toHaveLength(3);
    expect(screen.getByText('F-HMNT')).toBeInTheDocument();
    expect(screen.getByText('F-HMN7')).toBeInTheDocument();
    expect(screen.getByText('F-HMNX')).toBeInTheDocument();

    // Aucun résultat : le message propose de réinitialiser les filtres.
    await user.clear(search);
    await user.type(search, 'boeing');
    expect(screen.getByText('Aucun aéronef ne correspond')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(getBodyRows()).toHaveLength(8);

    // Les chiffres clés ne dépendent pas de la recherche.
    expect(screen.getByText('60 % de la flotte')).toBeInTheDocument();
  });

  test('filtre la liste par disponibilité avec le sélecteur de statut', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    // Un seul filtre de statut : plus d'onglets en double.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    const statusFilter = screen.getByRole('combobox', { name: 'Filtrer par disponibilité' });

    await user.click(statusFilter);
    await user.click(await screen.findByRole('option', { name: 'Indisponible' }));

    expect(getBodyRows()).toHaveLength(3);
    expect(screen.getByText('F-HMNT')).toBeInTheDocument();
    expect(screen.getByText('F-HMN7')).toBeInTheDocument();
    expect(screen.getByText('F-HMNX')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();

    await user.click(statusFilter);
    await user.click(await screen.findByRole('option', { name: 'Réservé' }));

    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByText('F-HRSV')).toBeInTheDocument();
    expect(screen.queryByText('F-HMNT')).not.toBeInTheDocument();

    await user.click(statusFilter);
    await user.click(await screen.findByRole('option', { name: 'Toutes les disponibilités' }));
    expect(getBodyRows()).toHaveLength(8);
  });

  test('affiche la pagination et change de page avec Précédent et Suivant', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    const pagination = within(screen.getByRole('navigation', { name: 'Pagination' }));
    expect(pagination.getByText('Page 1 sur 2')).toBeInTheDocument();
    expect(pagination.getByRole('button', { name: 'Précédent' })).toBeDisabled();

    await user.click(pagination.getByRole('button', { name: 'Suivant' }));

    expect(getBodyRows()).toHaveLength(2);
    expect(screen.getByText('F-GAV9')).toBeInTheDocument();
    expect(screen.getByText('F-HMNX')).toBeInTheDocument();
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();
    expect(pagination.getByText('Page 2 sur 2')).toBeInTheDocument();
    expect(pagination.getByRole('button', { name: 'Suivant' })).toBeDisabled();
    expect(screen.getByText('9–10 sur 10 aéronefs')).toBeInTheDocument();

    await user.click(pagination.getByRole('button', { name: 'Précédent' }));

    expect(getBodyRows()).toHaveLength(8);
    expect(screen.getByText('F-GABC')).toBeInTheDocument();

    await user.click(pagination.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('F-GAV9')).toBeInTheDocument();

    // Une recherche ramène à la première page.
    await user.type(screen.getByRole('textbox', { name: 'Rechercher un aéronef' }), 'cessna');
    expect(screen.getByText('F-GABC')).toBeInTheDocument();
  });

  test("ouvre la fenêtre de détails de l'avion depuis le bouton de la ligne", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir les détails de F-GABC' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'F-GABC' })).toBeInTheDocument();
    expect(dialog.getByText('Cessna 172')).toBeInTheDocument();
    expect(dialog.getByText('Informations générales')).toBeInTheDocument();
    expect(dialog.getByText('2012')).toBeInTheDocument();
    expect(dialog.getByText('1250 h')).toBeInTheDocument();
    expect(dialog.getByText(money(150))).toBeInTheDocument();
    expect(dialog.getByText('35 L/h')).toBeInTheDocument();
    expect(dialog.getByText('Disponible')).toBeInTheDocument();
    expect(dialog.getByText('Opérationnel')).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: /certificat\.pdf/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/uploads/docs/certificat.pdf'),
    );
    // Pas de photo : aucun cadre vide à la place.
    expect(dialog.queryByRole('img')).not.toBeInTheDocument();
    // Page de consultation : pas d'action de modification.
    expect(dialog.queryByRole('button', { name: /Modifier/ })).not.toBeInTheDocument();

    // Le bouton du pied de fenêtre (la croix porte le même nom).
    await user.click(dialog.getAllByRole('button', { name: 'Fermer' }).at(-1)!);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test("ouvre aussi les détails en cliquant sur la ligne de l'avion", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-GABC');

    await user.click(screen.getByText('Piper PA-28'));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'F-GDEF' })).toBeInTheDocument();
    expect(dialog.getByText('Aucun document pour cet aéronef.')).toBeInTheDocument();
  });

  test('recharge les données et affiche un toast lorsque le bouton Actualiser est cliqué', async () => {
    const user = userEvent.setup();
    renderPage([
      successMock(),
      successMock([buildAircraft(42, { registration_number: 'F-NEUF', model: 'Cirrus SR22' })]),
    ]);
    await screen.findByText('F-GABC');

    await user.click(screen.getByRole('button', { name: 'Actualiser' }));

    expect(await screen.findByText('F-NEUF')).toBeInTheDocument();
    // Le toast confirme l'actualisation une fois les données reçues.
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: 'Données actualisées' }));
    expect(screen.queryByText('F-GABC')).not.toBeInTheDocument();
    expect(getBodyRows()).toHaveLength(1);
    expect(screen.getByText('100 % de la flotte')).toBeInTheDocument();
  });
});
