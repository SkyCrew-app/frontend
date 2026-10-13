import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlightPlanEditDialog } from '../flight-plan-edit-dialog';
import type { Flight } from '@/interfaces/flight';

const flight = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 12,
    flight_type: 'VFR',
    origin_icao: 'LFPG',
    destination_icao: 'LFBO',
    number_of_passengers: 2,
    ...overrides,
  }) as unknown as Flight;

const renderDialog = (value: Flight, onSave = jest.fn().mockResolvedValue(undefined)) => {
  render(<FlightPlanEditDialog isOpen onOpenChange={jest.fn()} flight={value} onSave={onSave} />);
  return onSave;
};

describe('FlightPlanEditDialog — conditions météo', () => {
  it('affiche la météo chargée avec le plan de vol et enregistre sa modification', async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(flight({ weather_conditions: 'CAVOK' }));

    const weather = screen.getByLabelText('Conditions météo');
    expect(weather).toHaveValue('CAVOK');

    await user.clear(weather);
    await user.type(weather, 'Vent 240/08');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('VFR', 'Vent 240/08', 2));
  });

  it('propose le champ vide quand aucune météo n’a encore été saisie', () => {
    renderDialog(flight({ weather_conditions: null }));

    expect(screen.getByLabelText('Conditions météo')).toHaveValue('');
  });

  it('ne touche pas à la météo quand elle n’a pas été chargée', async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(flight());

    expect(screen.queryByLabelText('Conditions météo')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('VFR', undefined, 2));
  });
});
