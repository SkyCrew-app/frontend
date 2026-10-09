import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Setup2FA from '../page';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';

const mockToast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

describe('Setup2FA Component', () => {
  const qrCodeUrl = 'data:image/png;base64,PREMIER_QR_CODE';
  const secondQrCodeUrl = 'data:image/png;base64,SECOND_QR_CODE';

  const generateMock = (url: string): MockedResponse => ({
    request: { query: GENERATE_2FA_SECRET_MUTATION },
    result: { data: { generate2FASecret: url } },
  });

  const renderPage = (mocks: MockedResponse[] = []) =>
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Setup2FA />
      </MockedProvider>
    );

  const generateButton = () => screen.getByRole('button', { name: 'Générer le QR Code' });

  beforeEach(() => {
    mockToast.mockClear();
  });

  it("doit afficher le bouton sans générer de secret à l'ouverture de la page", async () => {
    const generated = jest.fn(() => ({ data: { generate2FASecret: qrCodeUrl } }));
    renderPage([{ request: { query: GENERATE_2FA_SECRET_MUTATION }, result: generated }]);

    expect(screen.getByText('Configurer la vérification 2FA')).toBeInTheDocument();
    expect(generateButton()).toBeEnabled();

    // Laisse aux effets le temps de se déclencher : aucune mutation ne doit partir.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(generated).not.toHaveBeenCalled();
    expect(screen.queryByAltText('QR Code pour 2FA')).not.toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('doit générer et afficher le QR Code après un clic sur le bouton', async () => {
    const user = userEvent.setup();
    renderPage([generateMock(qrCodeUrl)]);

    await user.click(generateButton());

    const qrCodeImage = await screen.findByAltText('QR Code pour 2FA');
    expect(qrCodeImage).toHaveAttribute('src', qrCodeUrl);
    expect(screen.getByText('Scannez ce QR code avec votre authentificateur.')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: 'QR Code généré',
        description: "Veuillez scanner le QR code avec votre application d'authentification.",
      }),
    );
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('doit remplacer le QR Code après un second clic', async () => {
    const user = userEvent.setup();
    renderPage([generateMock(qrCodeUrl), generateMock(secondQrCodeUrl)]);

    await user.click(generateButton());
    expect(await screen.findByAltText('QR Code pour 2FA')).toHaveAttribute('src', qrCodeUrl);

    await user.click(generateButton());
    await waitFor(() =>
      expect(screen.getByAltText('QR Code pour 2FA')).toHaveAttribute('src', secondQrCodeUrl),
    );
    expect(mockToast).toHaveBeenCalledTimes(2);
  });

  it('doit afficher une erreur si la génération du 2FA échoue', async () => {
    const user = userEvent.setup();
    renderPage([
      { request: { query: GENERATE_2FA_SECRET_MUTATION }, error: new Error('Erreur réseau') },
    ]);

    await user.click(generateButton());

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la génération du 2FA.',
      }),
    );
    expect(screen.queryByAltText('QR Code pour 2FA')).not.toBeInTheDocument();
    expect(generateButton()).toBeEnabled();
  });
});
