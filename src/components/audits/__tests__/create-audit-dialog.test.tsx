import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { CreateAuditDialog } from '../create-audit-dialog';
import { GET_AIRCRAFT_FOR_AUDIT, GET_AUDIT_ENUMS, GET_USERS_FOR_AUDIT } from '@/graphql/audit';

const mocks: MockedResponse[] = [
  { request: { query: GET_AIRCRAFT_FOR_AUDIT }, result: { data: { getAircrafts: [] } } },
  { request: { query: GET_USERS_FOR_AUDIT }, result: { data: { getUsers: [] } } },
  {
    request: { query: GET_AUDIT_ENUMS },
    result: {
      data: {
        auditResultTypes: ['CONFORME'],
        auditFrequencyTypes: ['ANNUEL'],
        auditCategoryTypes: ['AUTRE'],
        criticalityLevels: ['MINEUR'],
      },
    },
  },
];

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('../template-selector', () => ({
  TemplateSelector: () => null,
}));

describe('CreateAuditDialog', () => {
  it("reste sur la première étape tant que l'aéronef et l'auditeur ne sont pas choisis", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CreateAuditDialog isOpen onClose={jest.fn()} onSuccess={jest.fn()} />
      </MockedProvider>,
    );

    const panel = await screen.findByRole('dialog', { name: 'Créer un audit' });
    expect(within(panel).getByRole('button', { name: /Audit/ })).toHaveAttribute('aria-current', 'step');

    await user.click(within(panel).getByRole('button', { name: 'Suivant' }));

    expect(within(panel).getByText("Choisissez l'aéronef audité.")).toBeInTheDocument();
    expect(within(panel).getByText("Choisissez l'auditeur.")).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Audit/ })).toHaveAttribute('aria-current', 'step');
    expect(within(panel).queryByRole('button', { name: "Créer l'audit" })).not.toBeInTheDocument();
  });
});
