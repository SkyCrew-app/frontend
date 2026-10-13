import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import CashReceived from '../CashReceived';
import { GET_CASH_RECEIVED } from '@/graphql/finance';

const october = new Date(2026, 9, 15);

const cashMock = (startDate: Date, endDate: Date, cashReceived: number, cashRefunded: number): MockedResponse => ({
  request: { query: GET_CASH_RECEIVED, variables: { startDate, endDate } },
  result: { data: { generateBudgetForecast: { cashReceived, cashRefunded } } },
});

const renderCash = (mocks: MockedResponse[], period: string) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CashReceived period={period} date={october} />
    </MockedProvider>,
  );

describe('Encaissements', () => {
  it('montre ce qui est entré sur le mois, ce qui a été remboursé et le net', async () => {
    renderCash(
      [cashMock(new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 59, 59, 999), 1250.5, 50.5)],
      'monthly',
    );

    expect(await screen.findByText('Encaissé sur la période')).toBeInTheDocument();
    expect(screen.getByText(/1\s250,50\s€/)).toBeInTheDocument();
    expect(screen.getByText(/^50,50\s€$/)).toBeInTheDocument();
    expect(screen.getByText('Encaissement net')).toBeInTheDocument();
    expect(screen.getByText(/1\s200,00\s€/)).toBeInTheDocument();
    // Said in plain words: top-ups are not revenue.
    expect(screen.getByText(/à ne pas confondre avec les vols facturés/)).toBeInTheDocument();
  });

  it("interroge l'API sur l'année entière quand la période est annuelle", async () => {
    renderCash(
      [cashMock(new Date(2026, 0, 1), new Date(2026, 11, 31, 23, 59, 59, 999), 9000, 0)],
      'annual',
    );

    expect(await screen.findAllByText(/9\s000,00\s€/)).toHaveLength(2);
  });

  it("propose de réessayer quand les encaissements n'ont pas pu être chargés", async () => {
    renderCash(
      [
        {
          request: {
            query: GET_CASH_RECEIVED,
            variables: { startDate: new Date(2026, 9, 1), endDate: new Date(2026, 9, 31, 23, 59, 59, 999) },
          },
          error: new Error('network'),
        },
      ],
      'monthly',
    );

    expect(await screen.findByText("Les encaissements n'ont pas pu être chargés.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
