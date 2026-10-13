import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import AdminChecklistsPage from '../page';
import { DELETE_CHECKLIST_TEMPLATE, GET_CHECKLIST_TEMPLATES } from '@/graphql/checklist';
import { GET_ME, GET_USER_BY_EMAIL } from '@/graphql/user';

const mockPush = jest.fn();
const mockToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}));

const EMAIL = 'admin@example.com';

const template = (id: number, name: string, is_active = true) => ({
  id,
  name,
  description: null,
  aircraft_model: 'Robin DR400',
  is_active,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  items: [],
});

const templatesMock = (templates: ReturnType<typeof template>[]): MockedResponse => ({
  request: { query: GET_CHECKLIST_TEMPLATES },
  result: { data: { checklistTemplates: templates } },
});

const meMock: MockedResponse = {
  request: { query: GET_ME },
  result: { data: { me: { id: 1, email: EMAIL } } },
};

const userMock = (role_name: string): MockedResponse => ({
  request: { query: GET_USER_BY_EMAIL, variables: { email: EMAIL } },
  result: { data: { userByEmail: { id: 1, email: EMAIL, role: { id: 1, role_name } } } },
});

const deleteMock = (id: number, response: Partial<MockedResponse>): MockedResponse => ({
  request: { query: DELETE_CHECKLIST_TEMPLATE, variables: { id } },
  ...response,
});

const renderPage = (mocks: MockedResponse[], role = 'Administrateur') =>
  render(
    <MockedProvider mocks={[meMock, userMock(role), ...mocks]} addTypename={false}>
      <AdminChecklistsPage />
    </MockedProvider>,
  );

const deleteButton = (name: string) => screen.findByRole('button', { name: `Supprimer le modèle ${name}` });

describe('AdminChecklistsPage — suppression d’un modèle', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockToast.mockClear();
  });

  it('demande confirmation en nommant le modèle, puis le supprime et rafraîchit la liste', async () => {
    const user = userEvent.setup();
    renderPage([
      templatesMock([template(4, 'Prévol DR400'), template(5, 'Prévol C172')]),
      deleteMock(4, {
        result: {
          data: {
            deleteChecklistTemplate: {
              deleted: true,
              deactivated: false,
              submissions_count: 0,
              message: 'Le modèle « Prévol DR400 » a été supprimé.',
            },
          },
        },
      }),
      templatesMock([template(5, 'Prévol C172')]),
    ]);

    await user.click(await deleteButton('Prévol DR400'));

    const dialog = within(screen.getByRole('alertdialog', { name: 'Supprimer le modèle « Prévol DR400 » ?' }));
    expect(dialog.getByText(/il sera seulement désactivé afin de conserver l'historique/)).toBeInTheDocument();
    // Ouvrir la confirmation n'ouvre pas le modèle.
    expect(mockPush).not.toHaveBeenCalled();

    await user.click(dialog.getByRole('button', { name: 'Supprimer le modèle' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Prévol DR400')).not.toBeInTheDocument();
    expect(screen.getByText('Prévol C172')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Modèle supprimé',
      description: '« Prévol DR400 » a été supprimé.',
    });
  });

  it('ne supprime rien si on annule', async () => {
    const user = userEvent.setup();
    const deleted = jest.fn(() => ({ data: { deleteChecklistTemplate: null } }));
    renderPage([templatesMock([template(4, 'Prévol DR400')]), deleteMock(4, { result: deleted })]);

    await user.click(await deleteButton('Prévol DR400'));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(deleted).not.toHaveBeenCalled();
    expect(screen.getByText('Prévol DR400')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("explique qu'un modèle déjà rempli par des pilotes a été désactivé au lieu d'être supprimé", async () => {
    const user = userEvent.setup();
    const message =
      "Le modèle « Prévol DR400 » est utilisé par 3 checklist(s) déjà remplie(s) : il a été désactivé au lieu d'être supprimé, afin de conserver l'historique.";
    renderPage([
      templatesMock([template(4, 'Prévol DR400')]),
      deleteMock(4, {
        result: {
          data: {
            deleteChecklistTemplate: { deleted: false, deactivated: true, submissions_count: 3, message },
          },
        },
      }),
      templatesMock([template(4, 'Prévol DR400', false)]),
    ]);

    await user.click(await deleteButton('Prévol DR400'));
    await user.click(screen.getByRole('button', { name: 'Supprimer le modèle' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({ title: 'Modèle désactivé, non supprimé', description: message }),
    );
    // Le modèle reste dans la liste, désormais inactif.
    expect(screen.getByText('Prévol DR400')).toBeInTheDocument();
    expect(await screen.findByText('Inactif')).toBeInTheDocument();
  });

  it('signale un échec et laisse la confirmation ouverte', async () => {
    const user = userEvent.setup();
    renderPage([templatesMock([template(4, 'Prévol DR400')]), deleteMock(4, { error: new Error('Erreur réseau') })]);

    await user.click(await deleteButton('Prévol DR400'));
    await user.click(screen.getByRole('button', { name: 'Supprimer le modèle' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: "Le modèle n'a pas pu être supprimé",
        description: 'Réessayez dans un instant.',
      }),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it("ne propose pas la suppression à un membre qui n'est pas administrateur", async () => {
    renderPage([templatesMock([template(4, 'Prévol DR400')])], 'Instructeur');

    expect(await screen.findByRole('button', { name: 'Modifier le modèle Prévol DR400' })).toBeInTheDocument();
    // Laisse le temps au profil d'arriver : le bouton ne doit pas apparaître ensuite.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: /Supprimer le modèle/ })).not.toBeInTheDocument();
  });
});
