import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { AuditList } from '../audit-list';
import { DELETE_AUDIT } from '@/graphql/audit';

const toast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

jest.mock('../audit-details', () => ({
  AuditDetails: ({ isOpen, audit }: { isOpen: boolean; audit: { id: number } }) =>
    isOpen ? <div data-testid="audit-details">détail {audit.id}</div> : null,
}));

jest.mock('../edit-audit-dialog', () => ({
  EditAuditDialog: ({ isOpen, audit }: { isOpen: boolean; audit: { id: number } }) =>
    isOpen ? <div data-testid="audit-edit">édition {audit.id}</div> : null,
}));

const audits = [
  {
    id: 1,
    audit_date: '2026-03-10T09:00:00Z',
    audit_result: 'CONFORME',
    audit_notes: 'RAS',
    next_audit_date: '2099-03-10T09:00:00Z',
    is_closed: false,
    aircraft: { id: 1, registration_number: 'F-GABC', model: 'DR400' },
    auditor: { id: 1, first_name: 'Alice', last_name: 'Martin' },
  },
  {
    id: 2,
    audit_date: '2026-05-02T09:00:00Z',
    audit_result: 'NON_CONFORME',
    audit_notes: null,
    next_audit_date: '2020-01-01T09:00:00Z',
    is_closed: false,
    aircraft: { id: 2, registration_number: 'F-HXYZ', model: 'PA28' },
    auditor: { id: 2, first_name: 'Bruno', last_name: 'Petit' },
  },
];

const renderList = (props: Partial<React.ComponentProps<typeof AuditList>> = {}, mocks: MockedResponse[] = []) => {
  const onRefetch = jest.fn();
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AuditList loading={false} error={undefined} audits={audits} searchTerm="" onRefetch={onRefetch} {...props} />
    </MockedProvider>,
  );
  return { onRefetch };
};

const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('AuditList', () => {
  beforeEach(() => toast.mockClear());

  it('affiche des libellés français, jamais les codes', () => {
    renderList();

    expect(screen.getByText('Conforme')).toBeInTheDocument();
    expect(screen.getByText('Non conforme')).toBeInTheDocument();
    expect(screen.getByText('En retard')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('NON_CONFORME')).not.toBeInTheDocument();
  });

  it("trie par date décroissante puis inverse l'ordre au clic sur l'en-tête", async () => {
    const user = userEvent.setup();
    renderList();

    expect(within(bodyRows()[0]).getByText('F-HXYZ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Date' }));

    expect(within(bodyRows()[0]).getByText('F-GABC')).toBeInTheDocument();
  });

  it('filtre sur le terme recherché', () => {
    renderList({ searchTerm: 'bruno' });

    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('F-HXYZ')).toBeInTheDocument();
  });

  it("propose de créer un audit quand la liste est vide et qu'aucun filtre n'est actif", async () => {
    const user = userEvent.setup();
    const onCreate = jest.fn();
    renderList({ audits: [], onCreate });

    await user.click(screen.getByRole('button', { name: 'Nouvel audit' }));

    expect(onCreate).toHaveBeenCalled();
  });

  it('ne propose pas de créer un audit quand un filtre vide la liste', () => {
    renderList({ audits: [], hasActiveFilters: true, onCreate: jest.fn() });

    expect(screen.getByText('Aucun audit ne correspond')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouvel audit' })).not.toBeInTheDocument();
  });

  it("ouvre le détail au clic sur une ligne", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByText('F-GABC'));

    expect(screen.getByTestId('audit-details')).toHaveTextContent('détail 1');
  });

  it("demande confirmation en nommant l'audit, puis le supprime et rafraîchit la liste", async () => {
    const user = userEvent.setup();
    const { onRefetch } = renderList({}, [
      { request: { query: DELETE_AUDIT, variables: { id: 1 } }, result: { data: { deleteAudit: true } } },
    ]);

    await user.click(screen.getByRole('button', { name: /Actions pour l'audit du 10 mars 2026/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Supprimer' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('F-GABC');
    expect(onRefetch).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(onRefetch).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Audit supprimé' }));
  });
});
