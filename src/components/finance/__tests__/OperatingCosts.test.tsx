import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import OperatingCosts from '../OperatingCoast';
import { GET_RESERVATIONS } from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { GET_ALL_MAINTENANCES } from '@/graphql/maintenance';
import { GET_ADMINISTRATION } from '@/graphql/settings';

// The chart measures its container.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const october = new Date(2026, 9, 15);

// One aircraft: two hours booked and charged 300 €, 30 l/h, one maintenance at 120 €.
const mocks = (fuelPrice: number | null): MockedResponse[] => [
  {
    request: { query: GET_AIRCRAFTS },
    result: { data: { getAircrafts: [{ id: 1, registration_number: 'F-GABC', hourly_cost: 150, consumption: 30 }] } },
  },
  {
    request: { query: GET_RESERVATIONS },
    result: {
      data: {
        reservations: [
          {
            id: 5,
            aircraft: { id: 1, registration_number: 'F-GABC', hourly_cost: 150 },
            start_time: new Date(2026, 9, 10, 9).toISOString(),
            end_time: new Date(2026, 9, 10, 11).toISOString(),
            status: 'CONFIRMED',
            charged_amount: 300,
          },
        ],
      },
    },
  },
  {
    request: { query: GET_ALL_MAINTENANCES },
    result: {
      data: {
        getAllMaintenances: [
          {
            id: 8,
            start_date: new Date(2026, 9, 12).toISOString(),
            end_date: new Date(2026, 9, 13).toISOString(),
            maintenance_cost: 120,
            aircraft: { id: 1, registration_number: 'F-GABC' },
          },
        ],
      },
    },
  },
  {
    request: { query: GET_ADMINISTRATION },
    result: { data: { getAllAdministrations: [{ id: 1, fuelPrice }] } },
  },
];

// The mocks only carry the fields the tab reads.
const renderTab = (fuelPrice: number | null) =>
  render(
    <MockedProvider mocks={mocks(fuelPrice)} addTypename={false} defaultOptions={{ query: { errorPolicy: 'all' } }}>
      <OperatingCosts period="monthly" date={october} />
    </MockedProvider>,
  );

const money = (amount: string) => new RegExp(`^${amount.replace(' ', '\\s')}\\s€$`);

describe("Coûts d'exploitation", () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    // Partial mock results and the chart without a size are expected here.
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
  });

  it("calcule le résultat sur les montants enregistrés, sans y compter l'estimation de carburant", async () => {
    renderTab(2);

    const row = (await screen.findByRole('cell', { name: 'F-GABC' })).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    // Aircraft, revenue, maintenance, result, fuel estimate.
    expect(cells[1]).toHaveTextContent(money('300,00'));
    expect(cells[2]).toHaveTextContent(money('120,00'));
    // 300 − 120: the 120 € of estimated fuel (2 h × 30 l × 2 €) are not taken off.
    expect(cells[3]).toHaveTextContent(money('180,00'));
    expect(cells[4]).toHaveTextContent(money('120,00'));

    // The estimate is named as one, in the table and in the figures above it.
    expect(screen.getByRole('columnheader', { name: 'Carburant (estimation)' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Carburant' })).not.toBeInTheDocument();
    expect(screen.getByText(/2,00\s€ le litre\. Non compté dans le résultat\./)).toBeInTheDocument();
    expect(screen.getByText(/Le carburant est une estimation indicative, hors totaux/)).toBeInTheDocument();
    expect(screen.getByText('Flotte rentable sur la période')).toBeInTheDocument();
  });

  it("n'invente pas de prix du carburant quand le club n'en a pas renseigné", async () => {
    renderTab(null);

    const row = (await screen.findByRole('cell', { name: 'F-GABC' })).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[3]).toHaveTextContent(money('180,00'));
    expect(cells[4]).toHaveTextContent('—');
    expect(
      screen.getByText('Renseignez le prix du carburant dans les paramètres du club pour obtenir une estimation.'),
    ).toBeInTheDocument();
  });
});
