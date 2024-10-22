// profile.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfilePage from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { GET_USER_BY_EMAIL } from '../page';
import {jwtDecode} from 'jwt-decode';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

jest.mock('jwt-decode');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockAxios = new MockAdapter(axios);

describe('ProfilePage Component', () => {
  const mockUserData = {
    userByEmail: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_number: '0123456789',
      address: '123 Rue de Paris',
      date_of_birth: '1990-01-01',
      profile_picture: '/images/profile.jpg',
      total_flight_hours: 1000,
      email_notifications_enabled: true,
      sms_notifications_enabled: false,
      licenses: [],
    },
  };

  const mocks = [
    {
      request: {
        query: GET_USER_BY_EMAIL,
        variables: { email: 'john.doe@example.com' },
      },
      result: {
        data: mockUserData,
      },
    },
  ];

  beforeEach(() => {
    (jwtDecode as jest.Mock).mockReturnValue({ email: 'john.doe@example.com' });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    localStorage.setItem('token', 'mocked_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockAxios.reset();
  });

  test('affiche le chargement initial et les données utilisateur après le chargement', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProfilePage />
      </MockedProvider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/john.doe@example.com/i)).toBeInTheDocument();
    });
  });

  test('affiche une erreur si la requête utilisateur échoue', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_USER_BY_EMAIL,
          variables: { email: 'john.doe@example.com' },
        },
        error: new Error('Erreur réseau'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <ProfilePage />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Erreur lors du chargement des données utilisateur./i)).toBeInTheDocument();
    });
  });

  test('permet d\'ouvrir et fermer la carte profil', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProfilePage />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/^Profil$/i));

    expect(screen.getByText(/Modifier le profil/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));

    expect(screen.queryByText(/Modifier le profil/i)).not.toBeInTheDocument();
  });

  test('affiche des erreurs de validation si le formulaire est incorrect', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProfilePage />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/^Profil$/i));

    fireEvent.change(screen.getByLabelText(/Prénom/i), { target: { value: '' } });

    fireEvent.click(screen.getByText(/Enregistrer les modifications/i));

    expect(screen.getByText(/Le prénom est requis\./i)).toBeInTheDocument();
  });

  test('affiche les suggestions d\'adresses lors de la saisie', async () => {
    mockAxios.onGet(/https:\/\/api-adresse.data.gouv.fr\/search\//).reply(200, {
      features: [
        { properties: { label: '123 Rue de Paris, 75000 Paris' } },
        { properties: { label: '124 Rue de Paris, 75000 Paris' } },
      ],
    });

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProfilePage />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/^Profil$/i));

    fireEvent.change(screen.getByLabelText(/Adresse/i), { target: { value: '123' } });

    await waitFor(() => {
      expect(screen.getByText(/123 Rue de Paris, 75000 Paris/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/123 Rue de Paris, 75000 Paris/i));

    expect(screen.getByLabelText(/Adresse/i)).toHaveValue('123 Rue de Paris, 75000 Paris');
  });

  test('affiche une alerte lors de l\'activation du 2FA', async () => {
    const pushMock = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: pushMock });

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProfilePage />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Activer le 2FA/i));

    expect(screen.getByText(/Voulez-vous vraiment activer le 2FA \?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^Oui$/i));

    expect(pushMock).toHaveBeenCalledWith('/administration/2fa');
  });
});
