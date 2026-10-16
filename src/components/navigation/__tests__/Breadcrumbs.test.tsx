import React from 'react';
import { render, screen } from '@testing-library/react';
import Breadcrumbs from '../Breadcrumbs';

let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('Breadcrumbs', () => {
  it('doit nommer la page de suivi des incidents sous Administration', () => {
    mockPathname = '/administration/incidents';
    render(<Breadcrumbs />);

    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/administration');
    expect(screen.getByText('Incidents')).toHaveAttribute('aria-current', 'page');
  });

  it("ne doit pas faire un lien vers la fiche d'un avion, qui n'a pas de page", () => {
    mockPathname = '/administration/planes/3/flight-data';
    render(<Breadcrumbs />);

    expect(screen.getByRole('link', { name: 'Avions' })).toHaveAttribute('href', '/administration/planes');
    expect(screen.queryByRole('link', { name: 'Détail' })).not.toBeInTheDocument();
    expect(screen.getByText('Détail')).toBeInTheDocument();
  });

  it("ne doit rien afficher sur le tableau de bord", () => {
    mockPathname = '/dashboard';
    const { container } = render(<Breadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });
});
