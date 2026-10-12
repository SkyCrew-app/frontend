import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { TemplateManagement } from '../template-management';
import { CREATE_AUDIT_TEMPLATE, GET_AUDIT_ENUMS, GET_AUDIT_TEMPLATE } from '@/graphql/audit';

const toast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

jest.mock('@/components/hooks/userHooks', () => ({
  useCurrentUser: () => 'admin@example.test',
  useUserData: () => ({ id: '7' }),
}));

const templatesMock = (): MockedResponse => ({
  request: { query: GET_AUDIT_TEMPLATE },
  result: { data: { auditTemplates: [] } },
});

const enumsMock: MockedResponse = {
  request: { query: GET_AUDIT_ENUMS },
  result: {
    data: {
      auditResultTypes: ['CONFORME', 'NON_CONFORME'],
      auditFrequencyTypes: ['ANNUEL'],
      auditCategoryTypes: ['AUTRE'],
      criticalityLevels: ['MINEUR'],
    },
  },
};

describe('TemplateManagement', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver, which the Radix switches of the item form need.
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => toast.mockClear());

  it("crée un modèle en passant par les étapes, avec les contrôles de chaque étape", async () => {
    const user = userEvent.setup();
    const created = jest.fn();
    const createMock: MockedResponse = {
      request: { query: CREATE_AUDIT_TEMPLATE },
      variableMatcher: (variables) => {
        created(variables);
        return true;
      },
      result: {
        data: {
          createAuditTemplate: {
            id: 1,
            name: 'Visite annuelle',
            description: '',
            recommended_frequency: 'ANNUEL',
            applicable_aircraft_types: [],
            is_active: true,
            version: 1,
          },
        },
      },
    };

    render(
      <MockedProvider mocks={[templatesMock(), templatesMock(), enumsMock, createMock]} addTypename={false}>
        <TemplateManagement />
      </MockedProvider>,
    );

    await user.click((await screen.findAllByRole('button', { name: 'Nouveau modèle' }))[0]);

    const panel = await screen.findByRole('dialog', { name: "Créer un modèle d'audit" });

    // Step 1 keeps the user until the name is given.
    await user.click(within(panel).getByRole('button', { name: 'Suivant' }));
    expect(within(panel).getByText('Indiquez le nom du modèle.')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Créer le modèle' })).not.toBeInTheDocument();

    await user.type(within(panel).getByLabelText(/Nom du modèle/), 'Visite annuelle');
    await user.click(within(panel).getByRole('button', { name: 'Suivant' }));

    // Step 2: a template without item is refused.
    await user.click(within(panel).getByRole('button', { name: 'Créer le modèle' }));
    expect(within(panel).getByText('Ajoutez au moins un élément à vérifier.')).toBeInTheDocument();
    expect(created).not.toHaveBeenCalled();

    await user.click(within(panel).getByRole('button', { name: 'Ajouter un élément' }));
    const itemPanel = await screen.findByRole('dialog', { name: 'Ajouter un élément' });

    await user.click(within(itemPanel).getByRole('button', { name: 'Suivant' }));
    expect(within(itemPanel).getByText("Indiquez le titre de l'élément.")).toBeInTheDocument();

    await user.type(within(itemPanel).getByLabelText(/Titre/), "Niveau d'huile");
    await user.click(within(itemPanel).getByRole('button', { name: 'Suivant' }));
    await user.type(within(itemPanel).getByLabelText("Méthode d'inspection"), 'Contrôle visuel');
    await user.click(within(itemPanel).getByRole('button', { name: "Ajouter l'élément" }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Ajouter un élément' })).not.toBeInTheDocument(),
    );
    // Adding an item must not submit the template itself.
    expect(created).not.toHaveBeenCalled();

    const templatePanel = screen.getByRole('dialog', { name: "Créer un modèle d'audit" });
    expect(within(templatePanel).getByText("Niveau d'huile")).toBeInTheDocument();

    await user.click(within(templatePanel).getByRole('button', { name: 'Créer le modèle' }));

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created.mock.calls[0][0].input).toEqual(
      expect.objectContaining({
        name: 'Visite annuelle',
        recommended_frequency: 'ANNUEL',
        applicable_aircraft_types: [],
        createdById: '7',
        items: [
          expect.objectContaining({
            title: "Niveau d'huile",
            category: 'AUTRE',
            inspection_method: 'Contrôle visuel',
            order_index: 0,
          }),
        ],
      }),
    );
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Modèle créé' })));
  });
});
