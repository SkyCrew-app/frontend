import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { useRouter } from 'next/navigation';
import { LOGIN_MUTATION } from '@/graphql/system';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('LoginPage', () => {
  const push = jest.fn();
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  const mocks = [
    {
      request: {
        query: LOGIN_MUTATION,
        variables: {
          email: 'test@example.com',
          password: 'password123',
        },
      },
      result: {
        data: {
          login: {
            access_token: 'token123',
            is2FAEnabled: false,
          },
        },
      },
    },
  ];

  it('doit afficher le formulaire de connexion', () => {
    render(
      <MockedProvider>
        <LoginPage />
      </MockedProvider>
    );
    expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument();
  });

  it('doit se connecter avec succès et rediriger vers le tableau de bord', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <LoginPage />
      </MockedProvider>
    );

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(localStorage.getItem('token')).toBe('token123');
  });

  it('doit rediriger vers la page 2FA si 2FA est activé', async () => {
    const twoFAMocks = [
      {
        request: {
          query: LOGIN_MUTATION,
          variables: {
            email: 'test@example.com',
            password: 'password123',
          },
        },
        result: {
          data: {
            login: {
              access_token: 'token123',
              is2FAEnabled: true,
            },
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={twoFAMocks} addTypename={false}>
        <LoginPage />
      </MockedProvider>
    );

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/auth/2fa'));
    expect(localStorage.getItem('token')).toBe('token123');
  });

  it('doit afficher une erreur si les identifiants sont incorrects', async () => {
    const errorMocks = [
      {
        request: {
          query: LOGIN_MUTATION,
          variables: {
            email: 'wrong@example.com',
            password: 'wrongpassword',
          },
        },
        error: new Error('Identifiants incorrects.'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <LoginPage />
      </MockedProvider>
    );

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    expect(await screen.findByText(/Identifiants incorrects./i)).toBeInTheDocument();
  });
});
