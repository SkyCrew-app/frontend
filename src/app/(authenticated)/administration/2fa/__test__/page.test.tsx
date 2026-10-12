import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Setup2FA from '../page';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { CONFIRM_2FA_MUTATION, GENERATE_2FA_SECRET_MUTATION } from '@/graphql/user';

const mockToast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

// A plain anchor: the real link schedules prefetch work the tests do not wait for.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe('Setup2FA Component', () => {
  const qrCodeUrl = 'data:image/png;base64,PREMIER_QR_CODE';
  const QR_ALT = "QR code à scanner avec votre application d'authentification";
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

  const generateButton = () => screen.getByRole('button', { name: /^Générer (le|un nouveau) QR code$/ });

  beforeEach(() => {
    mockToast.mockClear();
  });

  it("doit afficher le bouton sans générer de secret à l'ouverture de la page", async () => {
    const generated = jest.fn(() => ({ data: { generate2FASecret: qrCodeUrl } }));
    renderPage([{ request: { query: GENERATE_2FA_SECRET_MUTATION }, result: generated }]);

    expect(screen.getByRole('heading', { level: 1, name: 'Authentification à deux facteurs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour au profil' })).toHaveAttribute('href', '/profile');
    expect(screen.getByText('QR code à générer')).toBeInTheDocument();
    expect(generateButton()).toBeEnabled();

    // Laisse aux effets le temps de se déclencher : aucune mutation ne doit partir.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(generated).not.toHaveBeenCalled();
    expect(screen.queryByAltText(QR_ALT)).not.toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('doit générer et afficher le QR Code après un clic sur le bouton', async () => {
    const user = userEvent.setup();
    renderPage([generateMock(qrCodeUrl)]);

    await user.click(generateButton());

    const qrCodeImage = await screen.findByAltText(QR_ALT);
    expect(qrCodeImage).toHaveAttribute('src', qrCodeUrl);
    expect(screen.getByText('En attente du code')).toBeInTheDocument();
    expect(screen.getByText(/Saisissez le code à 6 chiffres/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activer la double authentification' })).toBeDisabled();
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: 'QR code généré',
        description: "Scannez-le avec votre application d'authentification.",
      }),
    );
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('doit remplacer le QR Code après un second clic', async () => {
    const user = userEvent.setup();
    renderPage([generateMock(qrCodeUrl), generateMock(secondQrCodeUrl)]);

    await user.click(generateButton());
    expect(await screen.findByAltText(QR_ALT)).toHaveAttribute('src', qrCodeUrl);

    await user.click(generateButton());
    await waitFor(() =>
      expect(screen.getByAltText(QR_ALT)).toHaveAttribute('src', secondQrCodeUrl),
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
        title: 'Génération impossible',
        description: "Le QR code n'a pas pu être généré. Réessayez dans un instant.",
      }),
    );
    expect(screen.queryByAltText(QR_ALT)).not.toBeInTheDocument();
    expect(generateButton()).toBeEnabled();
  });
  describe('confirmation par un premier code', () => {
    const confirmMock = (token: string, response: Partial<MockedResponse>): MockedResponse => ({
      request: { query: CONFIRM_2FA_MUTATION, variables: { token } },
      ...response,
    });

    const generateThenType = async (user: ReturnType<typeof userEvent.setup>, typed: string) => {
      await user.click(generateButton());
      await screen.findByAltText(QR_ALT);
      await user.type(screen.getByLabelText('Code de vérification'), typed);
    };

    it("n'accepte que 6 chiffres avant de permettre l'activation", async () => {
      const user = userEvent.setup();
      renderPage([generateMock(qrCodeUrl)]);

      await generateThenType(user, '12a3');

      expect(screen.getByLabelText('Code de vérification')).toHaveValue('123');
      expect(screen.getByRole('button', { name: 'Activer la double authentification' })).toBeDisabled();

      await user.type(screen.getByLabelText('Code de vérification'), '456789');

      expect(screen.getByLabelText('Code de vérification')).toHaveValue('123456');
      expect(screen.getByRole('button', { name: 'Activer la double authentification' })).toBeEnabled();
    });

    it('active la 2FA quand le code est valide', async () => {
      const user = userEvent.setup();
      renderPage([
        generateMock(qrCodeUrl),
        confirmMock('123456', { result: { data: { confirm2FA: true } } }),
      ]);

      await generateThenType(user, '123456');
      await user.click(screen.getByRole('button', { name: 'Activer la double authentification' }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        "L'authentification à deux facteurs est active.",
      );
      expect(screen.queryByAltText(QR_ALT)).not.toBeInTheDocument();
      expect(screen.getByText('Activée')).toBeInTheDocument();
      expect(mockToast).toHaveBeenLastCalledWith({
        title: 'Double authentification activée',
        description: 'Un code vous sera demandé à chaque connexion.',
      });
    });

    it('signale un code incorrect et laisse réessayer', async () => {
      const user = userEvent.setup();
      renderPage([
        generateMock(qrCodeUrl),
        confirmMock('000000', { error: new Error('Invalid 2FA code') }),
      ]);

      await generateThenType(user, '000000');
      await user.click(screen.getByRole('button', { name: 'Activer la double authentification' }));

      await waitFor(() =>
        expect(mockToast).toHaveBeenLastCalledWith({
          variant: 'destructive',
          title: 'Code incorrect',
          description: "Le code saisi n'est pas valide. Vérifiez votre application et réessayez.",
        }),
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByAltText(QR_ALT)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Activer la double authentification' })).toBeEnabled();
    });
  });
});
