import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { useRouter } from 'next/navigation';
import LoginPage from '../page';
import { LOGIN_MUTATION } from '@/graphql/system';
import { GET_ME } from '@/graphql/user';

const toast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

const anonymousSession: MockedResponse = {
  request: { query: GET_ME },
  result: { data: { me: null } },
};

const loginMock = (
  email: string,
  password: string,
  is2FAEnabled: boolean,
): MockedResponse => ({
  request: { query: LOGIN_MUTATION, variables: { email, password } },
  result: {
    data: { login: { access_token: is2FAEnabled ? '' : 'jwt', is2FAEnabled } },
  },
});

const renderPage = (mocks: MockedResponse[] = [anonymousSession]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <LoginPage />
    </MockedProvider>,
  );

const fillCredentials = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/Mot de passe/i), {
    target: { value: password },
  });
};

const submit = () =>
  fireEvent.submit(
    screen.getByRole('button', { name: /Se connecter/i }).closest('form')!,
  );

describe('LoginPage', () => {
  const push = jest.fn();
  const initialDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (useRouter as jest.Mock).mockReturnValue({ push });
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = initialDemoMode;
  });

  it('doit afficher le formulaire de connexion', () => {
    renderPage();

    expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Se connecter/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Mot de passe oublié/i }),
    ).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('doit afficher les erreurs de validation sans appeler le serveur', async () => {
    renderPage();

    submit();

    expect(
      await screen.findByText('Le mot de passe est requis'),
    ).toBeInTheDocument();
    const emailField = screen.getByLabelText(/Adresse e-mail/i);
    expect(emailField).toHaveAttribute('aria-invalid', 'true');
    expect(emailField).toHaveAccessibleDescription("L'adresse e-mail est requise");
    expect(toast).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('doit refuser une adresse e-mail mal formée', async () => {
    renderPage();

    fillCredentials('pas-un-email', 'password123');
    submit();

    expect(await screen.findByText('Adresse e-mail invalide')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('doit se connecter avec succès et rediriger vers le tableau de bord', async () => {
    renderPage([
      anonymousSession,
      loginMock('test@example.com', 'password123', false),
    ]);

    fillCredentials('test@example.com', 'password123');
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Connexion réussie' }),
    );
    expect(sessionStorage.getItem('2fa_pending_email')).toBeNull();
  });

  it('doit rediriger vers la page 2FA si 2FA est activé', async () => {
    renderPage([
      anonymousSession,
      loginMock('test@example.com', 'password123', true),
    ]);

    fillCredentials('test@example.com', 'password123');
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/auth/2fa'));
    expect(push).not.toHaveBeenCalledWith('/dashboard');
    expect(sessionStorage.getItem('2fa_pending_email')).toBe(
      'test@example.com',
    );
  });

  it('doit afficher une erreur si les identifiants sont incorrects', async () => {
    renderPage([
      anonymousSession,
      {
        request: {
          query: LOGIN_MUTATION,
          variables: { email: 'wrong@example.com', password: 'wrongpassword' },
        },
        error: new Error('Unauthorized'),
      },
    ]);

    fillCredentials('wrong@example.com', 'wrongpassword');
    submit();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: 'Identifiants incorrects.',
      }),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('doit rediriger un utilisateur déjà connecté vers le tableau de bord', async () => {
    renderPage([
      {
        request: { query: GET_ME },
        result: { data: { me: { id: 1, email: 'test@example.com' } } },
      },
    ]);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('ne doit pas proposer les comptes démo hors mode démo', () => {
    renderPage();

    expect(screen.queryByText('Accès démo')).not.toBeInTheDocument();
  });

  it('doit préremplir le formulaire avec un compte démo en mode démo', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Pilote démo/i }));

    expect(screen.getByLabelText(/Adresse e-mail/i)).toHaveValue(
      'jean.dupont@skycrew.fr',
    );
    expect(screen.getByLabelText(/Mot de passe/i)).toHaveValue('demo1234');
  });
});
