import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SuspendedPage from '../suspended/page';

describe('SuspendedPage', () => {
  const reload = jest.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    reload.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, reload } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('dit que le service est suspendu et que les données sont conservées', () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    render(<SuspendedPage />);

    expect(screen.getByText('Service suspendu')).toBeInTheDocument();
    expect(screen.getByText('L’accès à l’espace de votre club est suspendu. Vos données sont conservées.')).toBeInTheDocument();
    expect(
      screen.getByText('Contactez l’administrateur de votre club, ou le prestataire SkyCrew, pour le rétablir.'),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('recharge la page avec « Réessayer »', () => {
    render(<SuspendedPage />);
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
