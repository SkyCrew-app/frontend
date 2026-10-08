import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import MaintenanceTablePage from '../page';
import { DELETE_MAINTENANCE, GET_ALL_MAINTENANCES } from '@/graphql/maintenance';
import { GET_USERS } from '@/graphql/user';
import { GET_AIRCRAFTS } from '@/graphql/planes';

type MaintenanceMock = {
  id: number;
  start_date: string;
  end_date: string;
  maintenance_type: string;
  description: string | null;
  maintenance_cost: number | null;
  images_url: string[];
  documents_url: string[];
  status: string;
  aircraft: { id: number; registration_number: string; model: string };
  technician: { id: number; first_name: string; email: string } | null;
};

// Dates sans suffixe "Z" : interprétées en heure locale, donc indépendantes du fuseau horaire.
const mockMaintenances: MaintenanceMock[] = [
  {
    id: 1,
    start_date: '2024-03-10T12:00:00',
    end_date: '2024-03-15T12:00:00',
    maintenance_type: 'INSPECTION',
    description: 'Changement des pneus',
    maintenance_cost: 500,
    images_url: [],
    documents_url: ['/docs/rapport-pneus.pdf'],
    status: 'PLANNED',
    aircraft: { id: 1, registration_number: 'F-ABCD', model: 'Airbus A320' },
    technician: { id: 7, first_name: 'John', email: 'john@example.com' },
  },
  {
    id: 2,
    start_date: '2024-04-02T12:00:00',
    end_date: '2024-04-04T12:00:00',
    maintenance_type: 'REPAIR',
    description: 'Remplacement de la pompe hydraulique',
    maintenance_cost: 1200,
    images_url: [],
    documents_url: [],
    status: 'IN_PROGRESS',
    aircraft: { id: 2, registration_number: 'F-WXYZ', model: 'Cessna 172' },
    technician: null,
  },
  {
    id: 3,
    start_date: '2024-01-20T12:00:00',
    end_date: '2024-01-21T12:00:00',
    maintenance_type: 'CLEANING',
    description: 'Nettoyage complet de la cabine',
    maintenance_cost: 150,
    images_url: [],
    documents_url: [],
    status: 'COMPLETED',
    aircraft: { id: 3, registration_number: 'F-GHIJ', model: 'Piper PA-28' },
    technician: { id: 8, first_name: 'Marie', email: 'marie@example.com' },
  },
];

const usersMock: MockedResponse = {
  request: { query: GET_USERS },
  result: { data: { getUsers: [] } },
};

const aircraftsMock: MockedResponse = {
  request: { query: GET_AIRCRAFTS },
  result: { data: { getAircrafts: [] } },
};

const maintenancesMock = (maintenances: MaintenanceMock[]): MockedResponse => ({
  request: { query: GET_ALL_MAINTENANCES },
  result: { data: { getAllMaintenances: maintenances } },
});

const renderPage = (mocks: MockedResponse[] = [maintenancesMock(mockMaintenances), usersMock, aircraftsMock]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MaintenanceTablePage />
    </MockedProvider>,
  );

/** Lignes de données du tableau (sans la ligne d'en-tête). */
const getDataRows = () => screen.getAllByRole('row').slice(1);

const getRowFor = (registration: string) => {
  const row = screen.getByText(registration).closest('tr');
  if (!row) throw new Error(`Aucune ligne pour ${registration}`);
  return row as HTMLElement;
};

describe('MaintenanceTablePage', () => {
  it("doit afficher un squelette de chargement puis l'en-tête de la page", async () => {
    renderPage();

    const loader = screen.getByLabelText('Chargement des données de maintenance');
    expect(loader).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { name: 'Gestion des Maintenances' })).not.toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Gestion des Maintenances' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement des données de maintenance')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser les données' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer une nouvelle maintenance' })).toBeInTheDocument();
  });

  it('doit afficher les maintenances dans le tableau avec les libellés traduits et les compteurs des onglets', async () => {
    renderPage();

    await screen.findByText('F-ABCD');
    expect(getDataRows()).toHaveLength(3);

    const planned = within(getRowFor('F-ABCD'));
    expect(planned.getByText('Airbus A320')).toBeInTheDocument();
    expect(planned.getByText('Inspection')).toBeInTheDocument();
    expect(planned.getByText('Planifiée')).toBeInTheDocument();
    expect(planned.getByText('10/03/2024')).toBeInTheDocument();
    expect(planned.getByText(/15\/03\/2024/)).toBeInTheDocument();
    expect(planned.getByText('john@example.com')).toBeInTheDocument();

    const inProgress = within(getRowFor('F-WXYZ'));
    expect(inProgress.getByText('Cessna 172')).toBeInTheDocument();
    expect(inProgress.getByText('Réparation')).toBeInTheDocument();
    expect(inProgress.getByText('En cours')).toBeInTheDocument();
    expect(inProgress.getByText('Non assigné')).toBeInTheDocument();

    const completed = within(getRowFor('F-GHIJ'));
    expect(completed.getByText('Nettoyage')).toBeInTheDocument();
    expect(completed.getByText('Terminée')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /Toutes/ })).toHaveTextContent('Toutes3');
    expect(screen.getByRole('tab', { name: /Planifiées/ })).toHaveTextContent('Planifiées1');
    expect(screen.getByRole('tab', { name: /En cours/ })).toHaveTextContent('En cours1');
    expect(screen.getByRole('tab', { name: /Terminées/ })).toHaveTextContent('Terminées1');

    expect(screen.getByText('Affichage de 1 à 3 sur 3 maintenances')).toBeInTheDocument();
  });

  it('doit ouvrir le formulaire de création depuis le bouton "Nouvelle Maintenance"', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    await user.click(screen.getByRole('button', { name: 'Créer une nouvelle maintenance' }));

    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle maintenance' });
    expect(
      within(dialog).getByText('Remplissez le formulaire pour créer une nouvelle maintenance.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Sélectionner un aéronef')).toBeInTheDocument();
  });

  it('doit filtrer les maintenances par recherche (immatriculation, modèle ou description)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const searchInput = screen.getByRole('textbox', { name: 'Rechercher des maintenances' });
    expect(searchInput).toHaveAttribute('placeholder', 'Rechercher...');

    await user.type(searchInput, 'cessna');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();
    expect(screen.getByText('Affichage de 1 à 1 sur 1 maintenances')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'pneus');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-ABCD')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'Boeing');
    expect(screen.getByText('Aucune maintenance trouvée')).toBeInTheDocument();
    expect(screen.getByText('Aucune maintenance')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();

    await user.clear(searchInput);
    expect(getDataRows()).toHaveLength(3);
  });

  it("doit filtrer les maintenances par statut lors d'un changement d'onglet", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    await user.click(screen.getByRole('tab', { name: /Planifiées/ }));
    expect(screen.getByRole('tab', { name: /Planifiées/ })).toHaveAttribute('aria-selected', 'true');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-ABCD')).toBeInTheDocument();
    expect(screen.queryByText('F-WXYZ')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Terminées/ }));
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-GHIJ')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();

    // Les compteurs portent sur l'ensemble des maintenances, pas sur l'onglet actif.
    expect(screen.getByRole('tab', { name: /Toutes/ })).toHaveTextContent('Toutes3');

    await user.click(screen.getByRole('tab', { name: /Toutes/ }));
    expect(getDataRows()).toHaveLength(3);
  });

  it('doit ouvrir le dialogue des détails de la maintenance sélectionnée', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir les détails de la maintenance pour F-ABCD' }));

    const dialog = await screen.findByRole('dialog', { name: 'Détails de la Maintenance' });
    const details = within(dialog);
    expect(
      details.getByText("Informations complètes sur la maintenance de l'aéronef F-ABCD"),
    ).toBeInTheDocument();
    expect(details.getByText('F-ABCD (Airbus A320)')).toBeInTheDocument();
    expect(details.getByText('Inspection')).toBeInTheDocument();
    expect(details.getByText('Planifiée')).toBeInTheDocument();
    expect(details.getByText('10/03/2024 - 15/03/2024')).toBeInTheDocument();
    expect(details.getByText('500 €')).toBeInTheDocument();
    expect(details.getByText('john@example.com')).toBeInTheDocument();
    expect(details.getByText('Changement des pneus')).toBeInTheDocument();
    expect(details.getByText('Aucune image disponible pour cette maintenance')).toBeInTheDocument();
    expect(details.getByRole('button', { name: /Modifier/ })).toBeInTheDocument();
    expect(details.getByRole('button', { name: /Supprimer/ })).toBeInTheDocument();

    await user.click(details.getByRole('button', { name: 'Fermer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('doit paginer le tableau par pages de 10 maintenances', async () => {
    const user = userEvent.setup();
    const manyMaintenances: MaintenanceMock[] = Array.from({ length: 12 }, (_, index) => ({
      ...mockMaintenances[0],
      id: index + 1,
      aircraft: {
        id: index + 1,
        registration_number: `F-PG${String(index + 1).padStart(2, '0')}`,
        model: 'Robin DR400',
      },
    }));
    renderPage([maintenancesMock(manyMaintenances), usersMock, aircraftsMock]);

    await screen.findByText('F-PG01');
    expect(getDataRows()).toHaveLength(10);
    expect(screen.getByText('F-PG10')).toBeInTheDocument();
    expect(screen.queryByText('F-PG11')).not.toBeInTheDocument();
    expect(screen.getByText('Affichage de 1 à 10 sur 12 maintenances')).toBeInTheDocument();
    expect(screen.queryByLabelText('Page précédente')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Page suivante'));

    expect(getDataRows()).toHaveLength(2);
    expect(screen.getByText('F-PG11')).toBeInTheDocument();
    expect(screen.getByText('F-PG12')).toBeInTheDocument();
    expect(screen.queryByText('F-PG01')).not.toBeInTheDocument();
    expect(screen.getByText('Affichage de 11 à 12 sur 12 maintenances')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByLabelText('Page suivante')).not.toBeInTheDocument();
  });
  it("doit afficher un message d'erreur et permettre de réessayer si le chargement échoue", async () => {
    const user = userEvent.setup();
    renderPage([
      { request: { query: GET_ALL_MAINTENANCES }, error: new Error('Erreur réseau') },
      usersMock,
      aircraftsMock,
      maintenancesMock(mockMaintenances),
    ]);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Erreur de chargement')).toBeInTheDocument();
    expect(
      within(alert).getByText('Impossible de charger les maintenances. Veuillez réessayer plus tard.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('F-ABCD')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('doit supprimer la maintenance après confirmation et rafraîchir le tableau', async () => {
    const user = userEvent.setup();
    renderPage([
      maintenancesMock(mockMaintenances),
      usersMock,
      aircraftsMock,
      {
        request: { query: DELETE_MAINTENANCE, variables: { id: 1 } },
        result: { data: { deleteMaintenance: true } },
      },
      maintenancesMock(mockMaintenances.slice(1)),
    ]);
    await screen.findByText('F-ABCD');

    await user.click(screen.getByRole('button', { name: 'Voir les détails de la maintenance pour F-ABCD' }));
    const dialog = await screen.findByRole('dialog', { name: 'Détails de la Maintenance' });
    await user.click(within(dialog).getByRole('button', { name: /Supprimer/ }));

    const confirmation = await screen.findByRole('alertdialog');
    expect(
      within(confirmation).getByText('Êtes-vous sûr de vouloir supprimer cette maintenance ?'),
    ).toBeInTheDocument();
    await user.click(within(confirmation).getByRole('button', { name: /Supprimer/ }));

    await waitFor(() => expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument());
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();
    expect(getDataRows()).toHaveLength(2);
  });
});
