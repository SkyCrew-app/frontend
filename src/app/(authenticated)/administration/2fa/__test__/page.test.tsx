import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Setup2FA from '../page';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GET_EMAIL_QUERY, GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';

const mockToast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

describe('Setup2FA Component', () => {
  const email = 'test@example.com';
  const qrCodeUrl = 'data:image/png;base64,PREMIER_QR_CODE';
  const secondQrCodeUrl = 'data:image/png;base64,SECOND_QR_CODE';

  const emailMock: MockedResponse = {
    request: { query: GET_EMAIL_QUERY },
    result: { data: { getEmailFromCookie: email } },
  };

  const generateMock = (url: string): MockedResponse => ({
    request: { query: GENERATE_2FA_SECRET_MUTATION, variables: { email } },
    result: { data: { generate2FASecret: url } },
  });

  const renderPage = (mocks: MockedResponse[]) =>
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Setup2FA />
      </MockedProvider>
    );

  beforeEach(() => {
    mockToast.mockClear();
  });

  it("doit afficher un message de chargement pendant la récupération de l'email, puis le bouton", async () => {
    renderPage([emailMock, generateMock(qrCodeUrl)]);

    expect(screen.getByText('Configurer la vérification 2FA')).toBeInTheDocument();
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Générer le QR Code' })).not.toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'Générer le QR Code' })).toBeInTheDocument();
    expect(screen.queryByText('Chargement...')).not.toBeInTheDocument();
  });

  it("doit générer et afficher automatiquement le QR Code dès que l'email est connu", async () => {
    renderPage([emailMock, generateMock(qrCodeUrl)]);

    const qrCodeImage = await screen.findByAltText('QR Code pour 2FA');
    expect(qrCodeImage).toHaveAttribute('src', qrCodeUrl);
    expect(screen.getByText('Scannez ce QR code avec votre authentificateur.')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'QR Code généré',
        description: "Veuillez scanner le QR code avec votre application d'authentification.",
      });
    });
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('doit régénérer le QR Code après un clic sur le bouton', async () => {
    renderPage([emailMock, generateMock(qrCodeUrl), generateMock(secondQrCodeUrl)]);

    expect(await screen.findByAltText('QR Code pour 2FA')).toHaveAttribute('src', qrCodeUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Générer le QR Code' }));

    await waitFor(() => {
      expect(screen.getByAltText('QR Code pour 2FA')).toHaveAttribute('src', secondQrCodeUrl);
    });
    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(2));
    expect(mockToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'QR Code généré' }));
  });

  it('doit afficher une erreur si la génération du 2FA échoue', async () => {
    renderPage([
      emailMock,
      {
        request: { query: GENERATE_2FA_SECRET_MUTATION, variables: { email } },
        error: new Error('Erreur réseau'),
      },
    ]);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la génération du 2FA.',
      });
    });

    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'QR Code généré' }));
    expect(screen.queryByAltText('QR Code pour 2FA')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Générer le QR Code' })).toBeInTheDocument();
  });
});
