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

  it("ne doit rien afficher sur le tableau de bord", () => {
    mockPathname = '/dashboard';
    const { container } = render(<Breadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });
});
