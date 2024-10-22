// page.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Setup2FA from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { GET_EMAIL_QUERY, GENERATE_2FA_SECRET_MUTATION } from '../page';

describe('Setup2FA Component', () => {
  const email = 'test@example.com';
  const qrCodeUrl = 'https://example.com/qrcode.png';

  const mocks = [
    {
      request: {
        query: GET_EMAIL_QUERY,
      },
      result: {
        data: {
          getEmailFromCookie: email,
        },
      },
    },
    {
      request: {
        query: GENERATE_2FA_SECRET_MUTATION,
        variables: {
          email,
        },
      },
      result: {
        data: {
          generate2FASecret: qrCodeUrl,
        },
      },
    },
  ];

  it('doit afficher le bouton pour générer le QR Code', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Setup2FA />
      </MockedProvider>
    );

    // Attendre que l'email soit chargé
    await waitFor(() => expect(screen.getByText(/Générer le QR Code/i)).toBeInTheDocument());
    expect(screen.getByText('Configurer la vérification 2FA')).toBeInTheDocument();
  });

  it('doit générer le QR Code et l\'afficher après le clic', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Setup2FA />
      </MockedProvider>
    );

    // Attendre que le bouton soit disponible
    const generateButton = await screen.findByText(/Générer le QR Code/i);
    fireEvent.click(generateButton);

    // Attendre que l'image du QR Code s'affiche
    const qrCodeImage = await screen.findByAltText(/QR Code pour 2FA/i);
    expect(qrCodeImage).toBeInTheDocument();
    expect(qrCodeImage.getAttribute('src')).toBe(qrCodeUrl);

    // Vérifier le texte sous le QR Code
    expect(screen.getByText(/Scannez ce QR code avec votre authentificateur./i)).toBeInTheDocument();
  });

  it('doit afficher un message de chargement pendant le chargement de l\'email', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <Setup2FA />
      </MockedProvider>
    );

    expect(screen.getByText(/Chargement.../i)).toBeInTheDocument();
  });

  it('doit afficher une erreur si la génération du 2FA échoue', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_EMAIL_QUERY,
        },
        result: {
          data: {
            getEmailFromCookie: email,
          },
        },
      },
      {
        request: {
          query: GENERATE_2FA_SECRET_MUTATION,
          variables: {
            email,
          },
        },
        error: new Error('Erreur lors de la génération du 2FA.'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <Setup2FA />
      </MockedProvider>
    );

    const generateButton = await screen.findByText(/Générer le QR Code/i);
    fireEvent.click(generateButton);

    // Attendre que le message d'erreur s'affiche
    await waitFor(() => {
      expect(screen.getByText(/Erreur lors de la génération du 2FA\./i)).toBeInTheDocument();
    });
  });
});
