import React from 'react';
import { render, screen } from '@testing-library/react';
import DemoBanner from '../DemoBanner';

describe('DemoBanner', () => {
  const previous = process.env.NEXT_PUBLIC_DEMO_MODE;
  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = previous;
  });

  it('est un repère de la page, en texte foncé sur l’orange de la marque', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    render(<DemoBanner />);

    const banner = screen.getByRole('complementary', { name: /démonstration/i });
    expect(banner).toHaveClass('bg-brand', 'text-brand-foreground');
  });

  it("n'apparaît pas hors du mode démonstration", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    const { container } = render(<DemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
