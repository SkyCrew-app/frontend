import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import ProfilePage from '../page';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GET_ME, GET_USER_BY_EMAIL, UPDATE_USER } from '@/graphql/user';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockPush = jest.fn();
const mockToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

// jsdom n'implémente pas scrollIntoView, utilisé par le formulaire de profil.
window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockAxios = new MockAdapter(axios);

const EMAIL = 'john.doe@example.com';

const baseUser = {
  id: '42',
  first_name: 'John',
  last_name: 'Doe',
  email: EMAIL,
  phone_number: '0123456789',
  address: '123 Rue de Paris',
  date_of_birth: '1990-01-01',
  profile_picture: null,
  total_flight_hours: 1000,
  email_notifications_enabled: true,
  sms_notifications_enabled: false,
  role: { id: '1', role_name: 'USER' },
  licenses: [] as Array<Record<string, unknown>>,
  language: 'fr',
  speed_unit: 'kmh',
  distance_unit: 'km',
  timezone: 'Europe/Paris',
  preferred_aerodrome: null,
  dashboard_widgets: [],
};

const licenses = [
  {
    id: '1',
    certification_authority: 'DGAC',
    license_number: 'PPL-0001',
    license_type: 'PPL',
    issue_date: '2020-05-10T10:00:00.000Z',
    expiration_date: '2030-05-10T10:00:00.000Z',
    is_valid: true,
    status: 'Active',
  },
  {
    id: '2',
    certification_authority: 'EASA',
    license_number: 'ULM-0002',
    license_type: 'ULM',
    issue_date: '2015-01-01T10:00:00.000Z',
    expiration_date: '2020-01-01T10:00:00.000Z',
    is_valid: false,
    status: 'Expirée',
  },
];

const meMock: MockedResponse = {
  request: { query: GET_ME },
  result: { data: { me: { id: '42', email: EMAIL } } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const userMock = (getUser: () => typeof baseUser = () => baseUser, delay = 0): MockedResponse => ({
  request: { query: GET_USER_BY_EMAIL, variables: { email: EMAIL } },
  result: () => ({ data: { userByEmail: getUser() } }),
  delay,
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ProfilePage />
    </MockedProvider>
  );

const setViewport = (isMobile: boolean) => {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

const openProfileSection = async () => {
  await screen.findByText(`John Doe - ${EMAIL}`);
  fireEvent.click(screen.getByRole('heading', { name: 'Profil' }));
  expect(screen.getByRole('heading', { name: 'Modifier votre profil' })).toBeInTheDocument();
};

describe('ProfilePage Component', () => {
  beforeEach(() => {
    setViewport(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    mockToast.mockClear();
    mockAxios.reset();
  });

  test('affiche le chargement puis les données utilisateur dans les cartes', async () => {
    const { container } = renderPage([meMock, userMock(() => ({ ...baseUser, licenses }), 30)]);

    expect(screen.getByRole('heading', { name: 'Mon Profil' })).toBeInTheDocument();

    // Squelettes pendant le chargement de l'utilisateur (1 titre + 6 cartes).
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(7);
    });
    expect(screen.queryByRole('heading', { name: 'Mon Profil' })).not.toBeInTheDocument();

    expect(await screen.findByText(`John Doe - ${EMAIL}`)).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    expect(screen.getByText('Email: Activé - SMS: Désactivé')).toBeInTheDocument();
    expect(screen.getByText('2 licences')).toBeInTheDocument();

    ['Profil', 'Notifications', 'Préférences', 'Licences', 'Mot de passe', 'Activer le 2FA'].forEach((title) => {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });

  test('affiche un toast d\'erreur et les libellés par défaut si la requête utilisateur échoue', async () => {
    renderPage([
      meMock,
      {
        request: { query: GET_USER_BY_EMAIL, variables: { email: EMAIL } },
        error: new Error('Erreur réseau'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la récupération des données utilisateur',
      });
    });

    expect(screen.getByRole('heading', { name: 'Mon Profil' })).toBeInTheDocument();
    expect(screen.getByText('Informations personnelles')).toBeInTheDocument();
    expect(screen.getByText('Paramètres de notifications')).toBeInTheDocument();
    expect(screen.getByText('Aucune licence')).toBeInTheDocument();
    expect(screen.queryByText(/John Doe/)).not.toBeInTheDocument();

    // Le toast de la page ne doit pas se répéter à chaque nouveau rendu.
    const pageToasts = mockToast.mock.calls.filter(
      ([toast]) => toast.description === 'Erreur lors de la récupération des données utilisateur',
    );
    expect(pageToasts).toHaveLength(1);
  });

  test('permet d\'ouvrir la carte profil avec le formulaire pré-rempli puis de revenir', async () => {
    renderPage([meMock, userMock()]);

    await openProfileSection();

    expect(screen.queryByRole('heading', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toHaveValue('John');
    expect(screen.getByLabelText('Nom')).toHaveValue('Doe');
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);
    expect(screen.getByLabelText('Numéro de téléphone')).toHaveValue('0123456789');
    expect(screen.getByLabelText('Adresse')).toHaveValue('123 Rue de Paris');
    expect(screen.getByLabelText('Date de naissance')).toHaveValue('1990-01-01');

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(screen.queryByRole('heading', { name: 'Modifier votre profil' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
  });

  test('affiche des erreurs de validation et n\'envoie rien si le formulaire est incorrect', async () => {
    const variableMatcher = jest.fn(() => true);
    renderPage([
      meMock,
      userMock(),
      {
        request: { query: UPDATE_USER },
        variableMatcher,
        result: { data: { updateUser: baseUser } },
      },
    ]);

    await openProfileSection();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'D' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pas-un-email' } });
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(screen.getByText('Le prénom est requis.')).toBeInTheDocument();
    expect(screen.getByText('Le nom doit contenir au moins 2 caractères.')).toBeInTheDocument();
    expect(screen.getByText("L'email n'est pas valide")).toBeInTheDocument();
    expect(screen.getByText(/Le numéro de téléphone n'est pas valide\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toHaveClass('border-red-500');
    expect(screen.getByLabelText('Adresse')).not.toHaveClass('border-red-500');

    // La saisie efface l'erreur du champ concerné.
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Jane' } });
    expect(screen.queryByText('Le prénom est requis.')).not.toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(variableMatcher).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  test('enregistre les modifications du profil et rafraîchit les données', async () => {
    let currentUser = baseUser;
    const variableMatcher = jest.fn(() => true);

    renderPage([
      meMock,
      userMock(() => currentUser),
      {
        request: { query: UPDATE_USER },
        variableMatcher,
        result: () => {
          currentUser = { ...baseUser, first_name: 'Jane', phone_number: '0611223344' };
          return {
            data: {
              updateUser: {
                first_name: 'Jane',
                last_name: 'Doe',
                email: EMAIL,
                phone_number: '0611223344',
                address: '123 Rue de Paris',
                date_of_birth: '1990-01-01',
                profile_picture: null,
              },
            },
          };
        },
      },
    ]);

    await openProfileSection();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '0611223344' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(screen.getByRole('button', { name: 'Enregistrement...' })).toBeDisabled();

    expect(await screen.findByText('Vos informations ont été enregistrées avec succès.')).toBeInTheDocument();

    expect(variableMatcher).toHaveBeenCalledTimes(1);
    expect(variableMatcher).toHaveBeenCalledWith({
      updateUserInput: {
        id: 42,
        first_name: 'Jane',
        last_name: 'Doe',
        email: EMAIL,
        phone_number: '0611223344',
        address: '123 Rue de Paris',
        date_of_birth: new Date('1990-01-01'),
      },
      image: null,
    });
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Succès',
      description: 'Profil mis à jour avec succès',
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enregistrer les modifications' })).toBeEnabled();
    });

    // Après le refetch, la carte récapitulative reflète le nouveau prénom.
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByText(`Jane Doe - ${EMAIL}`)).toBeInTheDocument();
  });

  test('affiche un toast d\'erreur si la mise à jour du profil échoue', async () => {
    // Le formulaire journalise l'erreur : on la capture pour ne pas polluer la sortie.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderPage([
      meMock,
      userMock(),
      {
        request: { query: UPDATE_USER },
        variableMatcher: () => true,
        error: new Error('Erreur réseau'),
      },
    ]);

    await openProfileSection();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Jane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour du profil',
      });
    });
    expect(consoleError).toHaveBeenCalledWith('Erreur lors de la mise à jour du profil:', expect.any(Error));
    expect(screen.queryByText('Vos informations ont été enregistrées avec succès.')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enregistrer les modifications' })).toBeEnabled();
    });
  });

  test('affiche les suggestions d\'adresses lors de la saisie et permet d\'en choisir une', async () => {
    mockAxios.onGet(/https:\/\/api-adresse\.data\.gouv\.fr\/search\//).reply(200, {
      features: [
        { properties: { label: '10 Rue de Rivoli 75004 Paris' } },
        { properties: { label: '10 Rue de Rivoli 06000 Nice' } },
      ],
    });

    renderPage([meMock, userMock()]);

    await openProfileSection();

    fireEvent.change(screen.getByLabelText('Adresse'), { target: { value: '10 Rue de Riv' } });

    expect(await screen.findByText('10 Rue de Rivoli 75004 Paris')).toBeInTheDocument();
    expect(screen.getByText('10 Rue de Rivoli 06000 Nice')).toBeInTheDocument();
    expect(mockAxios.history.get).toHaveLength(1);
    expect(mockAxios.history.get[0].url).toBe('https://api-adresse.data.gouv.fr/search/?q=10 Rue de Riv&limit=5');

    fireEvent.click(screen.getByText('10 Rue de Rivoli 06000 Nice'));

    expect(screen.getByLabelText('Adresse')).toHaveValue('10 Rue de Rivoli 06000 Nice');
    expect(screen.queryByText('10 Rue de Rivoli 75004 Paris')).not.toBeInTheDocument();
  });

  test('demande confirmation avant de rediriger vers l\'activation du 2FA', async () => {
    renderPage([meMock, userMock()]);

    await screen.findByText(`John Doe - ${EMAIL}`);

    fireEvent.click(screen.getByRole('heading', { name: 'Activer le 2FA' }));
    expect(screen.getByRole('heading', { name: 'Activation du 2FA' })).toBeInTheDocument();
    expect(
      screen.getByText("Voulez-vous vraiment activer l'authentification à deux facteurs ?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('heading', { name: 'Activation du 2FA' })).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('heading', { name: 'Activer le 2FA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, activer' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/administration/2fa');
  });

  test('affiche la version mobile en onglets avec le profil et les licences', async () => {
    setViewport(true);
    renderPage([meMock, userMock(() => ({ ...baseUser, licenses }))]);

    await waitFor(() => {
      expect(screen.getByLabelText('Prénom')).toHaveValue('John');
    });

    expect(screen.getByRole('tab', { name: 'Profil' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Paramètres' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Sécurité' })).toBeInTheDocument();
    // Pas de grille de cartes en mobile.
    expect(screen.queryByRole('heading', { name: 'Mot de passe' })).not.toBeInTheDocument();

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Mes licences')).toBeInTheDocument();
    expect(within(panel).getByText('PPL-0001')).toBeInTheDocument();
    expect(within(panel).getByText('DGAC')).toBeInTheDocument();
    expect(within(panel).getByText('Valide')).toBeInTheDocument();
    expect(within(panel).getByText('ULM-0002')).toBeInTheDocument();
    expect(within(panel).getByText('Non valide')).toBeInTheDocument();
  });
});
