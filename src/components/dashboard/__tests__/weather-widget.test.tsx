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

const aerodromeIn = (timezone: string | null): MockedResponse => ({
  request: { query: AERODROME_BY_ICAO, variables: { icao: 'LFPG' } },
  result: {
    data: { aerodromeByIcao: { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle', latitude: 49.01, longitude: 2.55, timezone } },
  },
});

const aerodrome: MockedResponse = {
  request: { query: AERODROME_BY_ICAO, variables: { icao: 'LFPG' } },
  result: {
    data: { aerodromeByIcao: { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle', latitude: 49.01, longitude: 2.55, timezone: 'Europe/Paris' } },
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
  windSpeedKmh: 19.4,
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
    expect(screen.getByText('19 km/h')).toBeInTheDocument();
    expect(screen.getByText('Direction 250°')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 1791871200 = 2026-10-13 06:00 UTC, 1791910800 = 17:00 UTC.
  it('donne le lever et le coucher du soleil à l’heure de l’aérodrome', async () => {
    renderWidget([aerodromeIn('America/New_York'), weather(CONDITIONS)]);

    expect(await screen.findByText('02:00 – 13:00')).toBeInTheDocument();
    expect(screen.getByText("Lever – coucher (heure locale de l'aérodrome)")).toBeInTheDocument();
  });

  it('suit le fuseau de chaque aérodrome, pas celui de Paris', async () => {
    renderWidget([aerodromeIn('Asia/Tokyo'), weather(CONDITIONS)]);

    expect(await screen.findByText('15:00 – 02:00')).toBeInTheDocument();
  });

  it.each([null, 'Mars/Olympus'])('se rabat sur l’heure du navigateur quand le fuseau est %p', async (timezone) => {
    renderWidget([aerodromeIn(timezone), weather(CONDITIONS)]);
    const local = (timestamp: number) =>
      new Date(timestamp * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    expect(
      await screen.findByText(`${local(CONDITIONS.sunrise)} – ${local(CONDITIONS.sunset)}`),
    ).toBeInTheDocument();
    expect(screen.getByText('Lever – coucher (votre heure locale)')).toBeInTheDocument();
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
