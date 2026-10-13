import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import ProfilePage from '../page';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import {
  DISABLE_2FA_MUTATION,
  GET_ME,
  GET_TWO_FACTOR_STATUS,
  GET_USER_BY_EMAIL,
  UPDATE_NOTIFICATION_SETTINGS,
  UPDATE_USER,
} from '@/graphql/user';
import { GraphQLError } from 'graphql';
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
  newsletter_subscribed: false,
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

const twoFactorMock = (enabled: boolean, maxUsageCount = Number.POSITIVE_INFINITY): MockedResponse => ({
  request: { query: GET_TWO_FACTOR_STATUS },
  result: { data: { twoFactorEnabled: enabled } },
  maxUsageCount,
});

// Two-factor is off unless the test provides its own status mocks.
const renderPage = (mocks: MockedResponse[], twoFactorMocks: MockedResponse[] = [twoFactorMock(false)]) =>
  render(
    <MockedProvider mocks={[...mocks, ...twoFactorMocks]} addTypename={false}>
      <ProfilePage />
    </MockedProvider>
  );

// Radix active un onglet au mousedown.
const openTab = (name: string) => {
  fireEvent.mouseDown(screen.getByRole('tab', { name }));
  expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
};

const waitForProfile = async () => {
  await waitFor(() => {
    expect(screen.getByLabelText('Prénom')).toHaveValue('John');
  });
};

describe('ProfilePage Component', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    mockToast.mockClear();
    mockAxios.reset();
  });

  test('affiche le chargement puis les onglets avec le formulaire de profil pré-rempli', async () => {
    const { container } = renderPage([meMock, userMock(() => ({ ...baseUser, licenses }), 30)]);

    expect(screen.getByRole('heading', { level: 1, name: 'Mon profil' })).toBeInTheDocument();

    // Squelettes pendant le chargement de l'utilisateur (onglets + contenu).
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
    });

    await waitForProfile();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    // Le titre de la page reste le seul h1.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    ['Profil', 'Sécurité', 'Notifications', 'Préférences', 'Licences'].forEach((name) => {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Profil' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Sécurité' })).toHaveAttribute('aria-selected', 'false');

    // Le formulaire est directement visible, sans carte ni dialogue à ouvrir.
    expect(screen.getByLabelText('Prénom')).toBeVisible();
    expect(screen.getByLabelText('Nom')).toHaveValue('Doe');
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);
    expect(screen.getByLabelText('Numéro de téléphone')).toHaveValue('0123456789');
    expect(screen.getByLabelText('Adresse')).toHaveValue('123 Rue de Paris');
    expect(screen.getByLabelText('Date de naissance')).toHaveValue('1990-01-01');
    // Un seul panneau visible à la fois.
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByLabelText('Mot de passe actuel')).not.toBeVisible();
  });

  test('affiche un état d\'erreur sans toast si la requête utilisateur échoue, puis recharge sur demande', async () => {
    let failing = true;
    renderPage([
      meMock,
      {
        request: { query: GET_USER_BY_EMAIL, variables: { email: EMAIL } },
        result: () =>
          failing ? { errors: [new GraphQLError('Erreur réseau')] } : { data: { userByEmail: baseUser } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);

    expect(await screen.findByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Mon profil' })).toBeInTheDocument();
    // Pas de formulaire vide à enregistrer par erreur.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    expect(screen.queryByText(/Erreur réseau/)).not.toBeInTheDocument();

    // La page ne signale plus un simple chargement raté par un toast.
    const pageToasts = mockToast.mock.calls.filter(
      ([toast]) => toast.description === 'Erreur lors de la récupération des données utilisateur',
    );
    expect(pageToasts).toHaveLength(0);

    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitForProfile();
    expect(screen.queryByText('Chargement impossible')).not.toBeInTheDocument();
  });

  test('conserve la saisie en cours quand on change d\'onglet', async () => {
    renderPage([meMock, userMock()]);

    await waitForProfile();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Jane' } });

    openTab('Sécurité');
    expect(screen.getByLabelText('Prénom')).not.toBeVisible();
    expect(screen.getByLabelText('Mot de passe actuel')).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Activer le 2FA' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mot de passe actuel'), { target: { value: 'secret' } });

    openTab('Profil');
    expect(screen.getByLabelText('Prénom')).toBeVisible();
    expect(screen.getByLabelText('Prénom')).toHaveValue('Jane');

    openTab('Sécurité');
    expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('secret');
  });

  test('annule les modifications non enregistrées du profil', async () => {
    renderPage([meMock, userMock()]);

    await waitForProfile();

    const cancel = screen.getByRole('button', { name: 'Annuler' });
    expect(cancel).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(screen.getByText('Le prénom est requis.')).toBeInTheDocument();

    expect(cancel).toBeEnabled();
    fireEvent.click(cancel);

    expect(screen.getByLabelText('Prénom')).toHaveValue('John');
    expect(screen.queryByText('Le prénom est requis.')).not.toBeInTheDocument();
    expect(cancel).toBeDisabled();
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

    await waitForProfile();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'D' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pas-un-email' } });
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(screen.getByText('Le prénom est requis.')).toBeInTheDocument();
    expect(screen.getByText('Le nom doit contenir au moins 2 caractères.')).toBeInTheDocument();
    expect(screen.getByText("L'email n'est pas valide")).toBeInTheDocument();
    expect(screen.getByText(/Le numéro de téléphone n'est pas valide\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toHaveClass('border-destructive');
    expect(screen.getByLabelText('Prénom')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Adresse')).not.toHaveClass('border-destructive');

    // Le premier champ à corriger reçoit le focus.
    await waitFor(() => {
      expect(screen.getByLabelText('Prénom')).toHaveFocus();
    });

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

    await waitForProfile();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '0611223344' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(screen.getByRole('button', { name: 'Enregistrement...' })).toBeDisabled();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Succès',
        description: 'Profil mis à jour avec succès',
      });
    });

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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enregistrer les modifications' })).toBeEnabled();
    });

    // Après le refetch, le formulaire correspond aux données du serveur : plus rien à annuler.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    });
    expect(screen.getByLabelText('Prénom')).toHaveValue('Jane');
    expect(screen.getByLabelText('Numéro de téléphone')).toHaveValue('0611223344');
  });

  test('accepte un numéro international et l\'enregistre sans séparateurs', async () => {
    const variableMatcher = jest.fn(() => true);

    renderPage([
      meMock,
      userMock(() => baseUser),
      {
        request: { query: UPDATE_USER },
        variableMatcher,
        result: { data: { updateUser: { ...baseUser, phone_number: '+442079460958' } } },
      },
      userMock(() => ({ ...baseUser, phone_number: '+442079460958' })),
    ]);

    await waitForProfile();

    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '+44 20 7946-0958' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(() => expect(variableMatcher).toHaveBeenCalledTimes(1));
    expect(variableMatcher).toHaveBeenCalledWith(
      expect.objectContaining({
        updateUserInput: expect.objectContaining({ phone_number: '+442079460958' }),
      }),
    );
    expect(screen.queryByText(/Le numéro de téléphone n'est pas valide\./)).not.toBeInTheDocument();
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

    await waitForProfile();

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
    expect(mockToast).not.toHaveBeenCalledWith({
      title: 'Succès',
      description: 'Profil mis à jour avec succès',
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enregistrer les modifications' })).toBeEnabled();
    });
    // La saisie est conservée pour un nouvel essai.
    expect(screen.getByLabelText('Prénom')).toHaveValue('Jane');
  });

  test('active les notifications SMS en conservant les autres réglages puis reflète la réponse du serveur', async () => {
    let currentUser = { ...baseUser, newsletter_subscribed: true };
    const variableMatcher = jest.fn(() => true);

    renderPage([
      meMock,
      userMock(() => currentUser),
      {
        request: { query: UPDATE_NOTIFICATION_SETTINGS },
        variableMatcher,
        result: () => {
          currentUser = { ...currentUser, sms_notifications_enabled: true };
          return {
            data: {
              updateNotificationSettings: {
                id: '42',
                email_notifications_enabled: true,
                sms_notifications_enabled: true,
                newsletter_subscribed: true,
              },
            },
          };
        },
      },
    ]);

    await waitForProfile();
    openTab('Notifications');

    const smsSwitch = screen.getByRole('switch', { name: 'Notifications par SMS' });
    expect(screen.getByRole('switch', { name: 'Notifications par email' })).toBeChecked();
    expect(smsSwitch).not.toBeChecked();

    fireEvent.click(smsSwitch);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Succès',
        description: 'Paramètres de notification mis à jour avec succès',
      });
    });
    expect(variableMatcher).toHaveBeenCalledTimes(1);
    expect(variableMatcher).toHaveBeenCalledWith({
      email_notifications_enabled: true,
      sms_notifications_enabled: true,
      newsletter_subscribed: true,
    });
    expect(smsSwitch).toBeChecked();

    // Après le refetch, l'interrupteur redevient utilisable et reste activé.
    await waitFor(() => {
      expect(smsSwitch).toBeEnabled();
    });
    expect(smsSwitch).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Notifications par email' })).toBeChecked();
  });

  test('affiche les suggestions d\'adresses lors de la saisie et permet d\'en choisir une', async () => {
    mockAxios.onGet(/https:\/\/api-adresse\.data\.gouv\.fr\/search\//).reply(200, {
      features: [
        { properties: { label: '10 Rue de Rivoli 75004 Paris' } },
        { properties: { label: '10 Rue de Rivoli 06000 Nice' } },
      ],
    });

    renderPage([meMock, userMock()]);

    await waitForProfile();

    fireEvent.change(screen.getByLabelText('Adresse'), { target: { value: '10 Rue de Riv' } });

    expect(await screen.findByText('10 Rue de Rivoli 75004 Paris')).toBeInTheDocument();
    expect(screen.getByText('10 Rue de Rivoli 06000 Nice')).toBeInTheDocument();
    expect(mockAxios.history.get).toHaveLength(1);
    // La saisie est encodée : une adresse contenant « & » ou « # » ne casse plus la recherche.
    expect(mockAxios.history.get[0].url).toBe(
      'https://api-adresse.data.gouv.fr/search/?q=10%20Rue%20de%20Riv&limit=5',
    );

    fireEvent.click(screen.getByText('10 Rue de Rivoli 06000 Nice'));

    expect(screen.getByLabelText('Adresse')).toHaveValue('10 Rue de Rivoli 06000 Nice');
    expect(screen.queryByText('10 Rue de Rivoli 75004 Paris')).not.toBeInTheDocument();
  });

  test('demande confirmation avant de rediriger vers l\'activation du 2FA', async () => {
    renderPage([meMock, userMock()]);

    await waitForProfile();
    openTab('Sécurité');

    // L'état affiché est celui que renvoie l'API.
    expect(await screen.findByText('Désactivée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver le 2FA' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Activer le 2FA' }));
    expect(screen.getByRole('alertdialog', { name: 'Activer la double authentification ?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Activer le 2FA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configurer le 2FA' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/administration/2fa');
  });

  test('affiche la 2FA comme activée et permet de la désactiver avec le mot de passe actuel', async () => {
    renderPage(
      [
        meMock,
        userMock(),
        {
          request: { query: DISABLE_2FA_MUTATION, variables: { password: 'secret' } },
          result: { data: { disable2FA: true } },
        },
      ],
      [twoFactorMock(true, 1), twoFactorMock(false)],
    );

    await waitForProfile();
    openTab('Sécurité');

    expect(await screen.findByText('Activée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activer le 2FA' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Désactiver le 2FA' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Désactiver la double authentification ?' });
    fireEvent.change(within(dialog).getByLabelText('Mot de passe actuel'), { target: { value: 'secret' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Désactiver le 2FA' }));

    expect(await screen.findByText('Désactivée')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activer le 2FA' })).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Double authentification désactivée',
      description: 'Seul votre mot de passe sera demandé à la connexion.',
    });
  });

  test('ne propose ni activation ni désactivation quand l\'état de la 2FA est inconnu', async () => {
    renderPage(
      [meMock, userMock()],
      [{ request: { query: GET_TWO_FACTOR_STATUS }, error: new Error('Erreur réseau') }, twoFactorMock(false)],
    );

    await waitForProfile();
    openTab('Sécurité');

    expect(await screen.findByText(/n'a pas pu être vérifié/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activer le 2FA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver le 2FA' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('button', { name: 'Activer le 2FA' })).toBeInTheDocument();
  });

  test('affiche les licences avec leur statut, la plus proche de l\'expiration en premier', async () => {
    const soon = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    renderPage([
      meMock,
      userMock(() => ({
        ...baseUser,
        licenses: [
          ...licenses,
          {
            id: '3',
            certification_authority: 'DGAC',
            license_number: 'CPL-0003',
            license_type: 'CPL',
            issue_date: '2022-03-01T10:00:00.000Z',
            expiration_date: soon,
            is_valid: true,
            status: 'active',
          },
        ],
      })),
    ]);

    await waitForProfile();
    openTab('Licences');

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { name: 'Mes licences' })).toBeInTheDocument();

    const titles = within(panel)
      .getAllByText(/^(PPL|ULM|CPL)$/)
      .map((element) => element.textContent);
    expect(titles).toEqual(['ULM', 'CPL', 'PPL']);

    expect(within(panel).getByText('PPL-0001')).toBeInTheDocument();
    expect(within(panel).getByText('EASA')).toBeInTheDocument();
    expect(within(panel).getByText('ULM-0002')).toBeInTheDocument();
    expect(within(panel).getByText('10 mai 2030')).toBeInTheDocument();
    // Un statut lisible par licence, jamais le code du serveur.
    expect(within(panel).getByText('Valide')).toBeInTheDocument();
    expect(within(panel).getByText('Expire bientôt')).toBeInTheDocument();
    expect(within(panel).getByText('Expirée')).toBeInTheDocument();
    expect(within(panel).queryByText('Active')).not.toBeInTheDocument();
    expect(within(panel).queryByText('active')).not.toBeInTheDocument();
  });

  test('affiche un état vide quand le membre n\'a aucune licence', async () => {
    renderPage([meMock, userMock()]);

    await waitForProfile();
    openTab('Licences');

    expect(within(screen.getByRole('tabpanel')).getByText('Aucune licence enregistrée')).toBeInTheDocument();
  });
});
