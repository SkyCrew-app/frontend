import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import MaintenanceTablePage from '../page';
import { DELETE_MAINTENANCE, GET_ALL_MAINTENANCES } from '@/graphql/maintenance';
import { GET_USERS } from '@/graphql/user';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { formatDate, formatMoney } from '@/lib/format';

// Radix Select s'appuie sur des API absentes de jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

// getByText normalise les espaces du texte affiché : on fait de même pour la valeur attendue.
const date = (iso: string) => formatDate(iso).replace(/\s/g, ' ');
const money = (value: number) => formatMoney(value).replace(/\s/g, ' ');

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
  technician: { id: number; first_name: string; last_name: string | null; email: string } | null;
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
    technician: { id: 7, first_name: 'John', last_name: null, email: 'john@example.com' },
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
    technician: { id: 8, first_name: 'Marie', last_name: null, email: 'marie@example.com' },
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

/** Valeur affichée dans la carte de chiffre clé portant ce libellé. */
const statValue = (label: string) => {
  const title = screen.getAllByText(label).find((element) => element.tagName === 'P');
  if (!title?.parentElement) throw new Error(`Aucun chiffre clé « ${label} »`);
  return title.parentElement;
};

const openRowMenu = async (user: ReturnType<typeof userEvent.setup>, registration: string) => {
  await user.click(screen.getByRole('button', { name: `Actions pour la maintenance de ${registration}` }));
  return within(await screen.findByRole('menu'));
};

describe('MaintenanceTablePage', () => {
  it("doit afficher l'en-tête dès le chargement, avec un squelette à la place du contenu", async () => {
    renderPage();

    const loader = screen.getByLabelText('Chargement des données de maintenance');
    expect(loader).toHaveAttribute('aria-busy', 'true');
    // L'en-tête et ses actions ne bougent pas entre le chargement et le contenu.
    expect(screen.getByRole('heading', { level: 1, name: 'Maintenances' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nouvelle maintenance' })).toBeInTheDocument();

    expect(await screen.findByText('F-ABCD')).toBeInTheDocument();
    expect(screen.queryByLabelText('Chargement des données de maintenance')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Maintenances' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser' })).toBeInTheDocument();
  });

  it('doit afficher les maintenances dans le tableau avec les libellés traduits et les chiffres clés', async () => {
    renderPage();

    await screen.findByText('F-ABCD');
    expect(getDataRows()).toHaveLength(3);

    const planned = within(getRowFor('F-ABCD'));
    expect(planned.getByText('Airbus A320')).toBeInTheDocument();
    expect(planned.getByText('Inspection')).toBeInTheDocument();
    expect(planned.getByText('Planifiée')).toBeInTheDocument();
    expect(planned.getByText(date('2024-03-10T12:00:00'))).toBeInTheDocument();
    expect(planned.getByText(`au ${date('2024-03-15T12:00:00')}`)).toBeInTheDocument();
    expect(planned.getByText('John')).toBeInTheDocument();
    expect(planned.getByText('john@example.com')).toBeInTheDocument();
    expect(planned.getByText(money(500))).toBeInTheDocument();

    const inProgress = within(getRowFor('F-WXYZ'));
    expect(inProgress.getByText('Cessna 172')).toBeInTheDocument();
    expect(inProgress.getByText('Réparation')).toBeInTheDocument();
    expect(inProgress.getByText('En cours')).toBeInTheDocument();
    expect(inProgress.getByText('Non assigné')).toBeInTheDocument();

    const completed = within(getRowFor('F-GHIJ'));
    expect(completed.getByText('Nettoyage')).toBeInTheDocument();
    expect(completed.getByText('Terminée')).toBeInTheDocument();

    // Les compteurs par statut sont des chiffres clés, plus des onglets.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(statValue('Planifiées')).toHaveTextContent('Planifiées1');
    expect(statValue('En cours')).toHaveTextContent('En cours1');
    expect(statValue('Terminées')).toHaveTextContent('Terminées1');
    expect(within(statValue('Coût total')).getByText(money(1850))).toBeInTheDocument();

    expect(screen.getByText('1–3 sur 3 maintenances')).toBeInTheDocument();
  });

  it('doit ouvrir le formulaire de création depuis le bouton "Nouvelle maintenance"', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    await user.click(screen.getByRole('button', { name: 'Nouvelle maintenance' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Nouvelle maintenance' }));
    expect(dialog.getByText('Planifiez une intervention sur un aéronef de la flotte.')).toBeInTheDocument();
    expect(dialog.getByText('Sélectionner un aéronef')).toBeInTheDocument();

    // Le formulaire avance par étapes, sans onglet ; on commence par l'intervention.
    expect(dialog.queryByRole('tab')).not.toBeInTheDocument();
    const steps = within(dialog.getByRole('list', { name: 'Étapes' }));
    expect(steps.getAllByRole('listitem')).toHaveLength(3);
    expect(steps.getByRole('button', { name: /Intervention/ })).toHaveAttribute('aria-current', 'step');
    expect(dialog.getByLabelText('Coût')).toHaveAttribute('type', 'number');
    expect(dialog.getByLabelText('Coût')).toHaveAttribute('min', '0');
    expect(dialog.getByRole('combobox', { name: /Technicien/ })).toHaveTextContent('Non assigné');

    // Sans aéronef, le formulaire reste ouvert et dit quoi corriger sous le champ.
    expect(dialog.queryByRole('button', { name: 'Créer la maintenance' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    expect(dialog.getByText('Sélectionnez un aéronef.')).toBeInTheDocument();
    expect(steps.getByRole('button', { name: /Intervention/ })).toHaveAttribute('aria-current', 'step');

    await user.click(dialog.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('doit filtrer les maintenances par recherche (immatriculation, modèle ou description)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const searchInput = screen.getByRole('textbox', { name: 'Rechercher des maintenances' });

    await user.type(searchInput, 'cessna');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();
    expect(screen.getByText('1–1 sur 1 maintenance')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'pneus');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-ABCD')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'Boeing');
    expect(screen.getByText('Aucune maintenance ne correspond')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(getDataRows()).toHaveLength(3);
    expect(searchInput).toHaveValue('');
  });

  it('doit filtrer les maintenances par statut, type et technicien avec les sélecteurs', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    const choose = async (filter: string, option: string) => {
      await user.click(screen.getByRole('combobox', { name: filter }));
      await user.click(await screen.findByRole('option', { name: option }));
    };

    await choose('Filtrer par statut', 'Planifiée');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-ABCD')).toBeInTheDocument();
    expect(screen.queryByText('F-WXYZ')).not.toBeInTheDocument();

    await choose('Filtrer par statut', 'Terminée');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-GHIJ')).toBeInTheDocument();
    expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument();

    // Les chiffres clés portent sur l'ensemble des maintenances, pas sur le filtre actif.
    expect(statValue('Planifiées')).toHaveTextContent('Planifiées1');

    await choose('Filtrer par statut', 'Tous les statuts');
    expect(getDataRows()).toHaveLength(3);

    await choose('Filtrer par type', 'Réparation');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(getDataRows()).toHaveLength(3);

    await choose('Filtrer par technicien', 'Non assigné');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();

    await choose('Filtrer par technicien', 'Marie · marie@example.com');
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByText('F-GHIJ')).toBeInTheDocument();
  });

  it('doit ouvrir le détail de la maintenance en cliquant sur sa ligne', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('Airbus A320'));

    const dialog = await screen.findByRole('dialog', { name: 'Maintenance de F-ABCD' });
    const details = within(dialog);
    expect(details.getByText('Airbus A320')).toBeInTheDocument();
    expect(details.getByText('Inspection')).toBeInTheDocument();
    expect(details.getByText('Planifiée')).toBeInTheDocument();
    expect(details.getByText(date('2024-03-10T12:00:00'))).toBeInTheDocument();
    expect(details.getByText(date('2024-03-15T12:00:00'))).toBeInTheDocument();
    expect(details.getByText(money(500))).toBeInTheDocument();
    expect(details.getByText('john@example.com')).toBeInTheDocument();
    expect(details.getByText('Changement des pneus')).toBeInTheDocument();
    expect(details.getByRole('link', { name: /rapport-pneus\.pdf/ })).toBeInTheDocument();
    expect(details.queryByRole('img')).not.toBeInTheDocument();
    expect(details.getByRole('button', { name: /Modifier/ })).toBeInTheDocument();
    expect(details.getByRole('button', { name: /Supprimer/ })).toBeInTheDocument();

    await user.click(details.getAllByRole('button', { name: 'Fermer' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('doit proposer Voir, Modifier et Supprimer dans le menu de la ligne', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('F-ABCD');

    let menu = await openRowMenu(user, 'F-WXYZ');
    expect(menu.getByRole('menuitem', { name: 'Supprimer' })).toBeInTheDocument();
    await user.click(menu.getByRole('menuitem', { name: 'Voir le détail' }));

    const details = within(await screen.findByRole('dialog', { name: 'Maintenance de F-WXYZ' }));
    expect(details.getByText('Non assigné')).toBeInTheDocument();
    expect(details.getByText('Aucune pièce jointe.')).toBeInTheDocument();
    await user.click(details.getAllByRole('button', { name: 'Fermer' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Modifier ouvre directement le formulaire, sans passer par le détail.
    menu = await openRowMenu(user, 'F-ABCD');
    await user.click(menu.getByRole('menuitem', { name: 'Modifier' }));

    const form = within(await screen.findByRole('dialog', { name: 'Modifier la maintenance' }));
    expect(form.getByText('Intervention sur F-ABCD (Airbus A320).')).toBeInTheDocument();
    // Le technicien déjà affecté reste sélectionné même s'il n'est pas dans la liste des techniciens.
    expect(form.getByRole('combobox', { name: /Technicien/ })).toHaveTextContent('John');

    await user.click(form.getByRole('button', { name: 'Suivant' }));
    expect(form.getByRole('textbox', { name: 'Description' })).toHaveValue('Changement des pneus');
    expect(form.getByRole('spinbutton', { name: 'Coût' })).toHaveValue(500);

    await user.click(form.getByRole('button', { name: 'Suivant' }));
    expect(form.getByText('rapport-pneus.pdf')).toBeVisible();
    expect(form.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
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
    expect(screen.getByText('1–10 sur 12 maintenances')).toBeInTheDocument();
    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(getDataRows()).toHaveLength(2);
    expect(screen.getByText('F-PG11')).toBeInTheDocument();
    expect(screen.getByText('F-PG12')).toBeInTheDocument();
    expect(screen.queryByText('F-PG01')).not.toBeInTheDocument();
    expect(screen.getByText('11–12 sur 12 maintenances')).toBeInTheDocument();
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
  });

  it("doit afficher un état d'erreur sous l'en-tête et permettre de réessayer si le chargement échoue", async () => {
    const user = userEvent.setup();
    renderPage([
      { request: { query: GET_ALL_MAINTENANCES }, error: new Error('Erreur réseau') },
      usersMock,
      aircraftsMock,
      maintenancesMock(mockMaintenances),
    ]);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.queryByText('Erreur réseau')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Maintenances' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('F-ABCD')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('doit supprimer la maintenance depuis le détail après confirmation et rafraîchir le tableau', async () => {
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

    await user.click(screen.getByText('Airbus A320'));
    const dialog = await screen.findByRole('dialog', { name: 'Maintenance de F-ABCD' });
    await user.click(within(dialog).getByRole('button', { name: /Supprimer/ }));

    // La confirmation nomme ce qui va être supprimé.
    const confirmation = await screen.findByRole('alertdialog');
    expect(within(confirmation).getByText('Supprimer cette maintenance ?')).toBeInTheDocument();
    expect(confirmation).toHaveTextContent(/« Inspection » de F-ABCD du 10 mars 2024/);
    await user.click(within(confirmation).getByRole('button', { name: /Supprimer/ }));

    await waitFor(() => expect(screen.queryByText('F-ABCD')).not.toBeInTheDocument());
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();
    expect(getDataRows()).toHaveLength(2);
    // Le détail et la confirmation se referment d'eux-mêmes.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('doit supprimer la maintenance depuis le menu de la ligne, et ne rien supprimer si on annule', async () => {
    const user = userEvent.setup();
    renderPage([
      maintenancesMock(mockMaintenances),
      usersMock,
      aircraftsMock,
      {
        request: { query: DELETE_MAINTENANCE, variables: { id: 2 } },
        result: { data: { deleteMaintenance: true } },
      },
      maintenancesMock([mockMaintenances[0], mockMaintenances[2]]),
    ]);
    await screen.findByText('F-ABCD');

    let menu = await openRowMenu(user, 'F-WXYZ');
    await user.click(menu.getByRole('menuitem', { name: 'Supprimer' }));
    let confirmation = await screen.findByRole('alertdialog');
    await user.click(within(confirmation).getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByText('F-WXYZ')).toBeInTheDocument();

    menu = await openRowMenu(user, 'F-WXYZ');
    await user.click(menu.getByRole('menuitem', { name: 'Supprimer' }));
    confirmation = await screen.findByRole('alertdialog');
    await user.click(within(confirmation).getByRole('button', { name: /Supprimer/ }));

    await waitFor(() => expect(screen.queryByText('F-WXYZ')).not.toBeInTheDocument());
    expect(getDataRows()).toHaveLength(2);
  });
});
