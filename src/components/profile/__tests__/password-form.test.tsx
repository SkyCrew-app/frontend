import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { PasswordForm } from '../password-form';
import { UPDATE_PASSWORD } from '@/graphql/user';

const toast = jest.fn();

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

const renderForm = (mocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <PasswordForm />
    </MockedProvider>,
  );

const currentField = () => screen.getByLabelText('Mot de passe actuel');
const newField = () => screen.getByLabelText('Nouveau mot de passe');
const confirmField = () => screen.getByLabelText('Confirmer le nouveau mot de passe');

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirmation: string,
) => {
  await user.type(currentField(), current);
  await user.type(newField(), next);
  await user.type(confirmField(), confirmation);
};

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));

describe('PasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('doit confirmer le changement et vider le formulaire quand le serveur accepte', async () => {
    const user = userEvent.setup();
    renderForm([
      {
        request: {
          query: UPDATE_PASSWORD,
          variables: { currentPassword: 'ancienMotDePasse', newPassword: 'nouveauMotDePasse' },
        },
        result: { data: { updatePassword: { id: 42, email: 'alex@example.com' } } },
      },
    ]);

    await fillForm(user, 'ancienMotDePasse', 'nouveauMotDePasse', 'nouveauMotDePasse');
    await submit(user);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: 'Succès',
        description: 'Votre mot de passe a été modifié avec succès.',
      }),
    );
    expect(toast).toHaveBeenCalledTimes(1);
    expect(currentField()).toHaveValue('');
    expect(newField()).toHaveValue('');
    expect(confirmField()).toHaveValue('');
  });

  it('doit signaler une erreur et conserver la saisie quand le serveur refuse', async () => {
    const user = userEvent.setup();
    renderForm([
      {
        request: {
          query: UPDATE_PASSWORD,
          variables: { currentPassword: 'mauvaisMotDePasse', newPassword: 'nouveauMotDePasse' },
        },
        error: new Error('Current password is incorrect'),
      },
    ]);

    await fillForm(user, 'mauvaisMotDePasse', 'nouveauMotDePasse', 'nouveauMotDePasse');
    await submit(user);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la modification du mot de passe.',
      }),
    );
    expect(currentField()).toHaveValue('mauvaisMotDePasse');
    expect(newField()).toHaveValue('nouveauMotDePasse');
  });

  it("doit refuser une confirmation différente sans appeler le serveur", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillForm(user, 'ancienMotDePasse', 'nouveauMotDePasse', 'autreMotDePasse');
    await submit(user);

    expect(await screen.findByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('doit exiger un nouveau mot de passe de 8 caractères au moins', async () => {
    const user = userEvent.setup();
    renderForm();

    await fillForm(user, 'ancienMotDePasse', 'court', 'court');
    await submit(user);

    expect(
      await screen.findByText('Le nouveau mot de passe doit contenir au moins 8 caractères.'),
    ).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });
});
