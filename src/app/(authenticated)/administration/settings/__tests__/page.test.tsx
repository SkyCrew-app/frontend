import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import SettingsPage from '../page';
import { GET_ADMINISTRATION, UPDATE_ADMINISTRATION } from '@/graphql/settings';
import { CREATE_ROLE, DELETE_ROLE, GET_ROLES } from '@/graphql/roles';

const mockToast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

// Radix measures its switches and checkboxes when they sit in a form.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const administration = {
  id: 1,
  clubName: 'Aéroclub de test',
  contactEmail: 'contact@aeroclub.fr',
  contactPhone: '0478123456',
  address: '1 rue du Terrain, 37000 Tours',
  closureDays: ['Lundi'],
  timeSlotDuration: 60,
  reservationStartTime: '08:00',
  reservationEndTime: '20:00',
  maintenanceDay: 'Mardi',
  maintenanceDuration: 4,
  pilotLicenses: ['PPL'],
  membershipFee: 180,
  flightHourRate: 150,
  clubRules: 'Règlement',
  allowGuestPilots: false,
  guestPilotFee: 0,
  fuelManagement: 'self-service',
  isMaintenanceActive: false,
  maintenanceMessage: '',
  maintenanceTime: null,
  fuelPrice: 2.1,
  taxonomies: {
    aircraftCategories: ['Monomoteur'],
    flightTypes: ['Vol local'],
    licenseTypes: [],
    maintenanceTypes: [],
  },
};

// What the page must send back when nothing but the listed fields changed.
const savedInput = (changes: Record<string, unknown> = {}) => ({
  id: 1,
  clubName: administration.clubName,
  contactEmail: administration.contactEmail,
  contactPhone: administration.contactPhone,
  address: administration.address,
  closureDays: administration.closureDays,
  timeSlotDuration: administration.timeSlotDuration,
  reservationStartTime: administration.reservationStartTime,
  reservationEndTime: administration.reservationEndTime,
  maintenanceDay: administration.maintenanceDay,
  maintenanceDuration: administration.maintenanceDuration,
  pilotLicenses: administration.pilotLicenses,
  membershipFee: administration.membershipFee,
  flightHourRate: administration.flightHourRate,
  clubRules: administration.clubRules,
  allowGuestPilots: administration.allowGuestPilots,
  guestPilotFee: administration.guestPilotFee,
  fuelManagement: administration.fuelManagement,
  fuelPrice: administration.fuelPrice,
  taxonomies: administration.taxonomies,
  isMaintenanceActive: false,
  maintenanceMessage: '',
  maintenanceTime: null,
  ...changes,
});

const administrationMock = (record: Record<string, unknown> = administration): MockedResponse => ({
  request: { query: GET_ADMINISTRATION },
  result: { data: { getAllAdministrations: [record] } },
});

const updateMock = (input: Record<string, unknown>) => {
  const result = jest.fn(() => ({ data: { updateAdministration: { id: 1, clubName: input.clubName } } }));
  const mock: MockedResponse = { request: { query: UPDATE_ADMINISTRATION, variables: { input } }, result };
  return { mock, result };
};

const rolesMock = (roles: { id: string; role_name: string }[]): MockedResponse => ({
  request: { query: GET_ROLES },
  result: { data: { roles } },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <SettingsPage />
    </MockedProvider>,
  );

const saveButton = () => screen.getByRole('button', { name: 'Enregistrer' });
const openTab = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) =>
  user.click(screen.getByRole('tab', { name }));

describe('SettingsPage', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('charge les paramètres sans dépendre de la liste des avions et sans toast', async () => {
    renderPage([administrationMock()]);

    expect(screen.getByRole('heading', { level: 1, name: "Paramètres de l'aéroclub" })).toBeInTheDocument();
    expect(await screen.findByLabelText(/Nom de l'aéroclub/)).toHaveValue('Aéroclub de test');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Aucune modification à enregistrer')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('propose de réessayer quand le chargement échoue', async () => {
    renderPage([{ request: { query: GET_ADMINISTRATION }, error: new Error('Erreur réseau') }]);

    expect(await screen.findByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.queryByText('Erreur réseau')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
  });

  it("garde les saisies d'un onglet à l'autre et les enregistre ensemble", async () => {
    const user = userEvent.setup();
    const update = updateMock(savedInput({ clubName: 'Aéroclub du Val', membershipFee: 200 }));
    renderPage([administrationMock(), update.mock]);

    const clubName = await screen.findByLabelText(/Nom de l'aéroclub/);
    await user.clear(clubName);
    await user.type(clubName, 'Aéroclub du Val');
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();

    await openTab(user, 'Membres');
    const fee = screen.getByLabelText(/Cotisation annuelle/);
    expect(fee).toHaveValue(180);
    await user.clear(fee);
    await user.type(fee, '200');

    await openTab(user, 'Général');
    expect(screen.getByLabelText(/Nom de l'aéroclub/)).toHaveValue('Aéroclub du Val');
    await openTab(user, 'Membres');
    expect(screen.getByLabelText(/Cotisation annuelle/)).toHaveValue(200);

    await user.click(saveButton());

    await waitFor(() => expect(update.result).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Paramètres enregistrés',
        description: 'Vos modifications ont été enregistrées.',
      }),
    );
    expect(screen.getByText('Aucune modification à enregistrer')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('annule les modifications non enregistrées', async () => {
    const user = userEvent.setup();
    renderPage([administrationMock()]);

    const clubName = await screen.findByLabelText(/Nom de l'aéroclub/);
    await user.type(clubName, ' bis');
    await user.click(screen.getByRole('button', { name: 'Annuler les modifications' }));

    expect(screen.getByLabelText(/Nom de l'aéroclub/)).toHaveValue('Aéroclub de test');
    expect(saveButton()).toBeDisabled();
  });

  it("ouvre l'onglet du champ invalide et n'enregistre rien", async () => {
    const user = userEvent.setup();
    const update = updateMock(savedInput({ clubName: 'Aéroclub de test bis', membershipFee: null }));
    renderPage([administrationMock({ ...administration, membershipFee: null }), update.mock]);

    await user.type(await screen.findByLabelText(/Nom de l'aéroclub/), ' bis');
    await user.click(saveButton());

    expect(await screen.findByText('Indiquez un montant')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Membres/ })).toHaveAttribute('aria-selected', 'true');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Enregistrement impossible',
      description: 'Certains champs sont à corriger : ils sont signalés en rouge.',
      variant: 'destructive',
    });
    expect(update.result).not.toHaveBeenCalled();
  });

  it('signale un enregistrement refusé sans afficher le message technique', async () => {
    const user = userEvent.setup();
    renderPage([
      administrationMock(),
      {
        request: { query: UPDATE_ADMINISTRATION, variables: { input: savedInput({ clubName: 'Aéroclub de test bis' }) } },
        error: new Error('Internal server error'),
      },
    ]);

    await user.type(await screen.findByLabelText(/Nom de l'aéroclub/), ' bis');
    await user.click(saveButton());

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Enregistrement impossible',
        description: "Les paramètres n'ont pas pu être enregistrés. Réessayez dans un instant.",
        variant: 'destructive',
      }),
    );
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("demande confirmation avant d'activer le mode maintenance", async () => {
    const user = userEvent.setup();
    const update = updateMock(savedInput({ isMaintenanceActive: true }));
    renderPage([administrationMock(), update.mock]);

    await user.click(await screen.findByRole('switch', { name: 'Activer le mode maintenance' }));
    await user.click(saveButton());

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Activer le mode maintenance ?')).toBeInTheDocument();
    expect(update.result).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Activer et enregistrer' }));
    await waitFor(() => expect(update.result).toHaveBeenCalledTimes(1));
  });

  it('ajoute et supprime une valeur de liste par des dialogues, enregistrées avec les paramètres', async () => {
    const user = userEvent.setup();
    const update = updateMock(
      savedInput({
        taxonomies: { ...administration.taxonomies, aircraftCategories: [], flightTypes: ['Vol local', 'Navigation'] },
      }),
    );
    renderPage([administrationMock(), update.mock]);

    await screen.findByLabelText(/Nom de l'aéroclub/);
    await openTab(user, 'Listes de choix');

    await user.click(screen.getByRole('button', { name: 'Ajouter un type de vol' }));
    const addDialog = await screen.findByRole('dialog');
    await user.type(within(addDialog).getByLabelText(/Nom/), 'vol local');
    await user.click(within(addDialog).getByRole('button', { name: 'Ajouter' }));
    expect(within(addDialog).getByText('Cette valeur est déjà dans la liste.')).toBeInTheDocument();

    await user.clear(within(addDialog).getByLabelText(/Nom/));
    await user.type(within(addDialog).getByLabelText(/Nom/), 'Navigation');
    await user.click(within(addDialog).getByRole('button', { name: 'Ajouter' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    // Adding to a list must not save the settings by itself.
    expect(update.result).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Supprimer Monomoteur' }));
    const deleteDialog = await screen.findByRole('alertdialog');
    expect(deleteDialog).toHaveTextContent('« Monomoteur » sera retiré de la liste « Catégories d\'aéronefs »');
    await user.click(within(deleteDialog).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(screen.queryByText('Monomoteur')).not.toBeInTheDocument());

    await user.click(saveButton());
    await waitFor(() => expect(update.result).toHaveBeenCalledTimes(1));
  });

  it('crée et supprime un rôle sans enregistrer les paramètres', async () => {
    const user = userEvent.setup();
    const update = updateMock(savedInput({ clubName: 'Aéroclub de test bis' }));
    const created = jest.fn(() => ({ data: { createRole: { id: '3', role_name: 'Mécanicien' } } }));
    const deleted = jest.fn(() => ({ data: { deleteRole: true } }));
    const initialRoles = [
      { id: '1', role_name: 'Administrateur' },
      { id: '2', role_name: 'Pilote' },
    ];
    renderPage([
      administrationMock(),
      update.mock,
      rolesMock(initialRoles),
      {
        request: { query: CREATE_ROLE, variables: { createRoleInput: { role_name: 'Mécanicien' } } },
        result: created,
      },
      rolesMock([...initialRoles, { id: '3', role_name: 'Mécanicien' }]),
      { request: { query: DELETE_ROLE, variables: { id: '2' } }, result: deleted },
      rolesMock([initialRoles[0], { id: '3', role_name: 'Mécanicien' }]),
    ]);

    // A pending edit in another tab must stay pending.
    await user.type(await screen.findByLabelText(/Nom de l'aéroclub/), ' bis');
    await openTab(user, 'Rôles');
    expect(await screen.findByText('Pilote')).toBeInTheDocument();
    expect(screen.getByText("Rôle de l'application")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajouter un rôle' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Nom du rôle/), 'Mécanicien');
    await user.click(within(dialog).getByRole('button', { name: 'Créer le rôle' }));

    expect(await screen.findByText('Mécanicien')).toBeInTheDocument();
    expect(created).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({ title: 'Rôle créé', description: 'Le rôle « Mécanicien » a été ajouté.' });

    await user.click(screen.getByRole('button', { name: 'Supprimer Pilote' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Le rôle « Pilote » sera supprimé définitivement.');
    await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Pilote')).not.toBeInTheDocument());

    expect(update.result).not.toHaveBeenCalled();
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
  });
});
