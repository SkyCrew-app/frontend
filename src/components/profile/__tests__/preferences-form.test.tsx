import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { PreferencesForm } from '../preferences-form';

jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('react-world-flags', () => () => null);

describe('PreferencesForm', () => {
  it('nomme ses deux listes par leur libellé et leur valeur', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PreferencesForm
          userData={{ preferred_aerodrome: 'LFPN', timezone: 'Europe/Paris', speed_unit: 'knots', distance_unit: 'nautical_miles' }}
          userId="1"
          refetch={jest.fn()}
        />
      </MockedProvider>,
    );
    // A combobox is not named by its text: without its label a screen reader announced "combobox", nothing else.
    expect(screen.getByRole('combobox', { name: 'Aérodrome préféré LFPN' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Fuseau horaire Europe/Paris' })).toBeInTheDocument();
  });
});
