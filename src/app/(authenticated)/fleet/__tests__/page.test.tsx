import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import FleetDashboard from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { GET_AIRCRAFTS } from '@/graphql/planes';

jest.mock('react-chartjs-2', () => ({
  Pie: () => <div>Mocked Pie Chart</div>,
}));

describe('FleetDashboard Component', () => {
  const mockAircrafts = [
    {
      id: 1,
      registration_number: 'F-ABCD',
      model: 'Airbus A320',
      availability_status: 'available',
      maintenance_status: 'Préventive',
      hourly_cost: 1500,
      year_of_manufacture: 2015,
      total_flight_hours: 5000,
      image_url: '/images/aircraft1.jpg',
      documents_url: ['/docs/aircraft1.pdf'],
    },
  ];

  const mocks = [
    {
      request: {
        query: GET_AIRCRAFTS,
      },
      result: {
        data: {
          getAircrafts: mockAircrafts,
        },
      },
    },
  ];

  test('affiche les avions dans la table après le chargement', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FleetDashboard />
      </MockedProvider>
    );

    await waitFor(() => expect(screen.getByText(/F-ABCD/i)).toBeInTheDocument());

    expect(screen.getByText('Airbus A320')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
    expect(screen.getByText('Préventive')).toBeInTheDocument();
    expect(screen.getByText('1500.00')).toBeInTheDocument();
  });

  test('ouvre le drawer avec les détails de l\'avion lorsque le bouton Voir est cliqué', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FleetDashboard />
      </MockedProvider>
    );

    await waitFor(() => expect(screen.getByText(/F-ABCD/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Voir/i));

    const drawer = await waitFor(() => screen.getByRole('dialog'));

    const drawerContent = within(drawer);

    expect(drawerContent.getByText(/Détails de l'avion/i)).toBeInTheDocument();
    expect(drawerContent.getByText(/Immatriculation :/i)).toBeInTheDocument();
    expect(drawerContent.getByText(/F-ABCD/i)).toBeInTheDocument();
  });

  test('affiche la pagination et change de page lorsqu\'on clique sur les numéros de page', async () => {
    const manyAircrafts = Array.from({ length: 15 }, (_, i) => ({
      ...mockAircrafts[0],
      id: i + 1,
      registration_number: `F-ABC${i}`,
    }));

    const mocksPagination = [
      {
        request: {
          query: GET_AIRCRAFTS,
        },
        result: {
          data: {
            getAircrafts: manyAircrafts,
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={mocksPagination} addTypename={false}>
        <FleetDashboard />
      </MockedProvider>
    );

    await waitFor(() => expect(screen.getByText(/F-ABC0/i)).toBeInTheDocument());

    expect(screen.getByText(/F-ABC0/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('2'));

    await waitFor(() => expect(screen.getByText(/F-ABC5/i)).toBeInTheDocument());
  });

  test('affiche les graphiques après le chargement des données', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <FleetDashboard />
      </MockedProvider>
    );

    await waitFor(() => expect(screen.getAllByText(/Mocked Pie Chart/i).length).toBe(3));
  });
});
