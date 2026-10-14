import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { LicensesSection } from '../licenses-section';
import { ADD_MY_LICENSE, MY_LICENSES, UPDATE_MY_LICENSE } from '@/graphql/licences';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

// The calendar popover does not open inside a side panel under jsdom: a plain button picks a day.
jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ onSelect, placeholder }: { onSelect: (date: Date) => void; placeholder?: string }) => (
    <button type="button" onClick={() => onSelect(new Date(2024, 0, 15))}>
      {placeholder}
    </button>
  ),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  // The date picker's popover measures itself.
  global.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const licence = (overrides: Record<string, unknown> = {}) => ({
  id: 4,
  license_type: 'PPL',
  license_number: 'FRA.FCL.PA001',
  issue_date: '2020-03-01T12:00:00.000Z',
  expiration_date: '2035-03-01T12:00:00.000Z',
  certification_authority: 'DGAC',
  status: 'active',
  is_valid: true,
  documents_url: ['/uploads/licences/ppl.pdf'],
  ...overrides,
});

const mine = (list: unknown[]): MockedResponse => ({
  request: { query: MY_LICENSES },
  result: { data: { myLicenses: list } },
});

const renderSection = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <LicensesSection />
    </MockedProvider>,
  );

describe('Mes licences', () => {
  beforeEach(() => mockToast.mockClear());

  it("montre une licence en attente et explique qu'elle attend un administrateur", async () => {
    renderSection([mine([licence({ id: 5, license_type: 'CPL', status: 'pending', is_valid: false })])]);

    expect(await screen.findByText('En attente')).toBeInTheDocument();
    expect(screen.getByText(/En attente de validation par un administrateur/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Justificatif 1' })).toHaveAttribute(
      'href',
      expect.stringContaining('/uploads/licences/ppl.pdf'),
    );
  });

  it('ajoute une licence avec son justificatif ; elle part en validation', async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | undefined;
    const added: MockedResponse = {
      request: { query: ADD_MY_LICENSE },
      variableMatcher: (variables) => {
        sent = variables;
        return true;
      },
      result: { data: { addMyLicense: licence({ id: 9, status: 'pending', is_valid: false }) } },
    };
    renderSection([mine([]), added, mine([licence({ id: 9, status: 'pending', is_valid: false })])]);

    await user.click(await screen.findByRole('button', { name: 'Ajouter une licence' }));
    const panel = within(await screen.findByRole('dialog', { name: 'Ajouter une licence' }));
    expect(panel.getByText(/attend la validation d'un administrateur/)).toBeInTheDocument();

    // Nothing is sent without the type, the number and the issue date.
    await user.click(panel.getByRole('button', { name: 'Ajouter la licence' }));
    expect(panel.getByText('Choisissez le type de licence.')).toBeInTheDocument();
    expect(panel.getByText('Indiquez le numéro de licence.')).toBeInTheDocument();
    expect(panel.getByText('Indiquez la date de délivrance.')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    // The issue date.
    await user.click(panel.getByRole('button', { name: /Choisir une date/ }));
    await user.click(panel.getByRole('combobox', { name: /Type de licence/ }));
    await user.click(await screen.findByRole('option', { name: /PPL/ }));
    await user.type(panel.getByLabelText(/^Numéro/), 'FRA.FCL.PA001');
    const file = new File(['%PDF'], 'ppl.pdf', { type: 'application/pdf' });
    await user.upload(panel.getByLabelText('Justificatifs'), file);
    await user.click(panel.getByRole('button', { name: 'Ajouter la licence' }));

    await waitFor(() => expect(sent).toBeDefined());
    expect(sent).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({
          license_type: 'PPL',
          license_number: 'FRA.FCL.PA001',
          // Calendar days travel as noon UTC, like every date of the forms.
          issue_date: '2024-01-15T12:00:00.000Z',
        }),
        documents: [file],
      }),
    );
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Licence ajoutée',
      description: "Elle attend la validation d'un administrateur.",
    });
  });

  it('modifie une licence sans renvoyer ses justificatifs', async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | undefined;
    const updated: MockedResponse = {
      request: { query: UPDATE_MY_LICENSE },
      variableMatcher: (variables) => {
        sent = variables;
        return true;
      },
      result: { data: { updateMyLicense: licence({ license_number: 'FRA.FCL.PA002', status: 'pending' }) } },
    };
    renderSection([mine([licence()]), updated, mine([licence({ license_number: 'FRA.FCL.PA002', status: 'pending' })])]);

    await user.click(await screen.findByRole('button', { name: 'Modifier la licence PPL' }));
    const panel = within(await screen.findByRole('dialog', { name: 'Modifier la licence' }));
    expect(panel.getByText(/Le justificatif déjà envoyé est conservé/)).toBeInTheDocument();
    const number = panel.getByLabelText(/^Numéro/);
    await user.clear(number);
    await user.type(number, 'FRA.FCL.PA002');
    await user.click(panel.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(sent).toBeDefined());
    expect(sent).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({ id: 4, license_number: 'FRA.FCL.PA002' }),
        documents: null,
      }),
    );
    expect(await screen.findByText('FRA.FCL.PA002')).toBeInTheDocument();
  });
});
