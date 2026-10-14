import React from 'react';
import { render, screen } from '@testing-library/react';
import { SidePanel } from '../SidePanel';

describe('SidePanel', () => {
  it("laisse le clavier faire défiler un panneau d'information sans champ", async () => {
    render(
      <SidePanel open onOpenChange={() => {}} title="F-GABC" footer={<button type="button">Fermer</button>}>
        <p>Caractéristiques</p>
      </SidePanel>,
    );
    const body = (await screen.findByText('Caractéristiques')).parentElement;
    expect(body).toHaveAttribute('tabindex', '0');
  });

  it("n'ajoute pas d'arrêt de tabulation à un formulaire", async () => {
    render(
      <SidePanel open onOpenChange={() => {}} title="Nouveau" onSubmit={() => {}}>
        <input aria-label="Nom" />
      </SidePanel>,
    );
    const body = (await screen.findByLabelText('Nom')).parentElement;
    expect(body).not.toHaveAttribute('tabindex');
  });
});
