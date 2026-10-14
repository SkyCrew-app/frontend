import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import InvoiceList from '../InvoiceList';
import { GET_INVOICE_DOCUMENT, GET_MEMBER_INVOICES } from '@/graphql/account';
import { downloadBase64Pdf } from '@/lib/download';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));
jest.mock('@/components/hooks/userHooks', () => ({
  useCurrentUser: () => 'pilote@club.fr',
  useUserData: () => ({ id: 42 }),
}));
jest.mock('@/lib/download', () => ({ downloadBase64Pdf: jest.fn() }));

const invoice = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  invoice_number: '2026-00005',
  invoice_date: '2026-10-10T09:00:00.000Z',
  amount: 150,
  payment_status: 'completed',
  payment_method: 'account_balance',
  invoice_items: null as string | null,
  ...overrides,
});

const invoicesMock = (invoices: ReturnType<typeof invoice>[]): MockedResponse => ({
  request: { query: GET_MEMBER_INVOICES, variables: { userId: 42 } },
  result: { data: { invoicesByUser: invoices } },
});

const renderList = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <InvoiceList />
    </MockedProvider>,
  );

describe('Mes factures', () => {
  beforeEach(() => {
    mockToast.mockClear();
    (downloadBase64Pdf as jest.Mock).mockClear();
  });

  it('liste les factures du membre avec leur numéro, la plus récente en premier', async () => {
    renderList([
      invoicesMock([
        invoice(),
        invoice({ id: 6, invoice_number: '2026-00006', invoice_date: '2026-10-12T09:00:00.000Z', payment_method: 'stripe', amount: 50 }),
      ]),
    ]);

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('2026-00006');
    expect(rows[1]).toHaveTextContent('Rechargement du compte');
    expect(rows[2]).toHaveTextContent('2026-00005');
    expect(rows[2]).toHaveTextContent('Réservation');
    expect(rows[2]).toHaveTextContent('150,00 €');
  });

  it('dit l’objet de chaque facture d’après ses lignes, comme son PDF', async () => {
    renderList([
      invoicesMock([
        invoice({
          id: 7,
          invoice_number: '2026-00007',
          invoice_date: '2026-10-13T09:00:00.000Z',
          invoice_items: JSON.stringify([
            { kind: 'booking', amount: 150, registration: 'F-GSKY', start: '2026-10-12T08:00:00.000Z' },
          ]),
        }),
        // A flight paid by PayPal: its line, not its payment method, says what it was for.
        invoice({
          id: 8,
          invoice_number: '2026-00008',
          invoice_date: '2026-10-11T09:00:00.000Z',
          payment_method: 'paypal',
          invoice_items: '2.2h de vol Cirrus SR22 (F-GPIL)',
        }),
        invoice({
          id: 9,
          invoice_number: '2026-00009',
          invoice_date: '2026-10-10T09:00:00.000Z',
          payment_method: 'Carte bancaire',
        }),
      ]),
    ]);

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('Vol en F-GSKY du 12 oct. 2026');
    expect(rows[2]).toHaveTextContent('2.2h de vol Cirrus SR22 (F-GPIL)');
    expect(rows[2]).not.toHaveTextContent('Rechargement');
    expect(rows[3]).toHaveTextContent('Autre paiement');
  });

  it('télécharge la facture demandée, sous le nom donné par l’API', async () => {
    const user = userEvent.setup();
    const document = jest.fn(() => ({
      data: { invoiceDocument: { fileName: 'facture-2026-00005.pdf', content: 'JVBERi0=' } },
    }));
    renderList([
      invoicesMock([invoice()]),
      { request: { query: GET_INVOICE_DOCUMENT, variables: { id: 5 } }, result: document },
    ]);

    await user.click(await screen.findByRole('button', { name: 'Télécharger la facture 2026-00005' }));

    await waitFor(() => expect(downloadBase64Pdf).toHaveBeenCalledWith('JVBERi0=', 'facture-2026-00005.pdf'));
    expect(document).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("le dit quand la facture n'a pas pu être téléchargée", async () => {
    const user = userEvent.setup();
    renderList([
      invoicesMock([invoice()]),
      { request: { query: GET_INVOICE_DOCUMENT, variables: { id: 5 } }, error: new Error('network') },
    ]);

    await user.click(await screen.findByRole('button', { name: 'Télécharger la facture 2026-00005' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: "La facture n'a pas pu être téléchargée",
        description: 'Réessayez dans un instant.',
      }),
    );
    expect(downloadBase64Pdf).not.toHaveBeenCalled();
  });

  it('montre les dix plus récentes, puis les autres sur demande', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 12 }, (_, index) =>
      invoice({
        id: index + 1,
        invoice_number: `2026-${String(index + 1).padStart(5, '0')}`,
        invoice_date: `2026-09-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
      }),
    );
    renderList([invoicesMock(many)]);

    expect(await screen.findAllByRole('row')).toHaveLength(11);
    await user.click(screen.getByRole('button', { name: 'Afficher les factures plus anciennes' }));
    expect(screen.getAllByRole('row')).toHaveLength(13);
  });

  it("dit qu'il n'y a pas encore de facture", async () => {
    renderList([invoicesMock([])]);

    expect(await screen.findByText('Aucune facture')).toBeInTheDocument();
    expect(within(document.body).queryByRole('table')).not.toBeInTheDocument();
  });
});
