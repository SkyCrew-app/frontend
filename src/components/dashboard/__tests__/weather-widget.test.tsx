import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import WeatherWidget from '../widgets/WeatherWidget';
import { AERODROME_BY_ICAO, WEATHER_AT } from '@/graphql/aviation';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const aerodrome: MockedResponse = {
  request: { query: AERODROME_BY_ICAO, variables: { icao: 'LFPG' } },
  result: {
    data: { aerodromeByIcao: { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle', latitude: 49.01, longitude: 2.55 } },
  },
};

const weather = (weatherAt: object | null): MockedResponse => ({
  request: { query: WEATHER_AT, variables: { latitude: 49.01, longitude: 2.55 } },
  result: { data: { weatherAt } },
});

const CONDITIONS = {
  temperature: 12.4,
  feelsLike: 10,
  humidity: 71,
  cloudCover: 40,
  windSpeed: 5.4,
  windDegrees: 250,
  sunrise: 1791871200,
  sunset: 1791910800,
};

const renderWidget = (mocks: MockedResponse[], preferredAerodrome: string | null = 'LFPG') =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <WeatherWidget preferredAerodrome={preferredAerodrome} />
    </MockedProvider>,
  );

describe('WeatherWidget', () => {
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche les conditions de l’aérodrome préféré, lues par l’API', async () => {
    renderWidget([aerodrome, weather(CONDITIONS)]);

    expect(await screen.findByText('12 °C')).toBeInTheDocument();
    expect(screen.getByText('Ressenti 10 °C')).toBeInTheDocument();
    expect(screen.getByText('Éclaircies')).toBeInTheDocument();
    expect(screen.getByText('Nuages 40 % · Humidité 71 %')).toBeInTheDocument();
    expect(screen.getByText('5 km/h')).toBeInTheDocument();
    expect(screen.getByText('Direction 250°')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('annonce l’actualisation demandée par le membre', async () => {
    renderWidget([aerodrome, weather(CONDITIONS), weather({ ...CONDITIONS, temperature: 15 })]);
    await screen.findByText('12 °C');

    fireEvent.click(screen.getByRole('button', { name: 'Actualiser la météo' }));

    expect(await screen.findByText('15 °C')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Météo actualisée' }));
  });

  it('propose de réessayer quand la météo n’est pas disponible', async () => {
    renderWidget([aerodrome, weather(null)]);

    expect(await screen.findByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('propose de réessayer quand l’aérodrome est introuvable', async () => {
    renderWidget([
      { request: { query: AERODROME_BY_ICAO, variables: { icao: 'ZZZZ' } }, result: { data: { aerodromeByIcao: null } } },
    ], 'ZZZZ');

    expect(await screen.findByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });

  it('invite à choisir un aérodrome quand le profil n’en a pas', async () => {
    renderWidget([], null);

    expect(screen.getByText('Aucun aérodrome préféré')).toBeInTheDocument();
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled());
  });
});
