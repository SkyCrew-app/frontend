import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { DEFAULT_WIDGETS, WIDGET_REGISTRY } from '@/interfaces/dashboard';
import FleetAvailabilityWidget from '../widgets/FleetAvailabilityWidget';
import { aircraftAvailability, normalizeWidgets } from '../widget-config';

const aircraft = (id: number, availability_status: string) => ({
  id,
  registration_number: `F-TEST${id}`,
  model: 'DR400',
  availability_status,
  maintenance_status: 'OPERATIONAL',
  hourly_cost: 150,
  year_of_manufacture: 2000,
  total_flight_hours: 100,
  image_url: null,
  documents_url: [],
  consumption: 30,
  cruiseSpeed: 200,
  maxAltitude: 10000,
  maintenances: [],
});

describe('aircraftAvailability', () => {
  it('reconnaît les statuts renvoyés par l’API', () => {
    expect(aircraftAvailability('AVAILABLE')).toEqual({ label: 'Disponible', variant: 'success' });
    expect(aircraftAvailability('UNAVAILABLE')).toEqual({ label: 'Indisponible', variant: 'warning' });
    expect(aircraftAvailability('RESERVATED')).toEqual({ label: 'Réservé', variant: 'info' });
  });

  it('ne montre jamais un code brut pour un statut inconnu', () => {
    expect(aircraftAvailability('SOMETHING_NEW').label).toBe('Statut inconnu');
    expect(aircraftAvailability(null).label).toBe('Statut inconnu');
  });
});

describe('normalizeWidgets', () => {
  it('retourne la disposition par défaut quand rien n’est enregistré', () => {
    expect(normalizeWidgets(null)).toEqual(DEFAULT_WIDGETS);
    expect(normalizeWidgets([])).toEqual(DEFAULT_WIDGETS);
  });

  it('garde l’ordre enregistré, écarte les widgets inconnus et ajoute les nouveaux', () => {
    const result = normalizeWidgets([
      { widgetId: 'articles', visible: false, order: 1, size: 'lg' },
      { widgetId: 'gone', visible: true, order: 0, size: 'md' },
      { widgetId: 'weather', visible: true, order: 5, size: 'lg' },
    ]);

    expect(result.slice(0, 2)).toEqual([
      { widgetId: 'articles', visible: false, order: 0, size: 'lg' },
      { widgetId: 'weather', visible: true, order: 1, size: 'lg' },
    ]);
    expect(result).toHaveLength(Object.keys(WIDGET_REGISTRY).length);
    expect(result.map((w) => w.order)).toEqual(result.map((_, index) => index));
    expect(result.find((w) => w.widgetId === 'gone')).toBeUndefined();
  });
});

describe('FleetAvailabilityWidget', () => {
  it('affiche le statut réel de chaque avion', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: GET_AIRCRAFTS },
            result: {
              data: {
                getAircrafts: [
                  aircraft(1, 'UNAVAILABLE'),
                  aircraft(2, 'AVAILABLE'),
                  aircraft(3, 'AVAILABLE'),
                  aircraft(4, 'RESERVATED'),
                ],
              },
            },
          },
        ]}
        addTypename={false}
      >
        <FleetAvailabilityWidget />
      </MockedProvider>,
    );

    expect(await screen.findByText('2 disponibles sur 4')).toBeInTheDocument();
    expect(screen.getAllByText('Disponible')).toHaveLength(2);
    expect(screen.getByText('Indisponible')).toBeInTheDocument();
    expect(screen.getByText('Réservé')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir la flotte/i })).toHaveAttribute('href', '/fleet');
  });
});
