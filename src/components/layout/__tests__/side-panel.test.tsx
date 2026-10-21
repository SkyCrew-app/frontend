import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidePanel } from '../SidePanel';

describe('SidePanel', () => {
  it('fait défiler un long panneau avec son fond, comme une page, sans zone qui défile à l’intérieur', async () => {
    render(
      <SidePanel open onOpenChange={() => {}} title="F-GABC" footer={<button type="button">Terminé</button>}>
        <p>Caractéristiques</p>
      </SidePanel>,
    );
    const body = (await screen.findByText('Caractéristiques')).parentElement;
    expect(body?.className).not.toMatch(/overflow/);
    expect(body).not.toHaveAttribute('tabindex');
    // The backdrop is what scrolls; the title and the buttons stay in view.
    expect(body?.closest('[data-scroll-overlay]')).toHaveClass('overflow-y-auto');
    expect(screen.getByRole('heading', { name: 'F-GABC' }).parentElement).toHaveClass('sticky');
    expect(screen.getByRole('button', { name: 'Terminé' }).closest('.sticky')).toHaveClass('bottom-0');
  });

  it('garde le bouton de fermeture dans l’en-tête', async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    render(
      <SidePanel open onOpenChange={onOpenChange} title="Nouveau" onSubmit={() => {}}>
        <input aria-label="Nom" />
      </SidePanel>,
    );
    const header = screen.getByRole('heading', { name: 'Nouveau' }).parentElement as HTMLElement;
    const close = header.querySelector('button') as HTMLButtonElement;
    expect(close).toHaveTextContent('Fermer');

    await user.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
