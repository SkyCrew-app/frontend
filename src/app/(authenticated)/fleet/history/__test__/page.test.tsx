import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AircraftHistory from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { GET_FLIGHT_HISTORY } from '../page';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


describe('AircraftHistory Component', () => {
  const mockData = {
    getHistoryAircraft: [
      {
        id: '1',
        registration_number: 'F-ABCD',
        model: 'Airbus A320',
        reservations: [
          {
            id: 'r1',
            start_time: '2023-10-01T00:00:00Z',
            end_time: '2023-10-05T00:00:00Z',
            user: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        ],
        maintenances: [
          {
            id: 'm1',
            maintenance_type: 'Révision',
            start_date: '2023-09-01T00:00:00Z',
            end_date: '2023-09-10T00:00:00Z',
            technician: {
              first_name: 'Jane',
              last_name: 'Smith',
            },
          },
        ],
      },
    ],
  };

  const mocks = [
    {
      request: {
        query: GET_FLIGHT_HISTORY,
      },
      result: {
        data: mockData,
      },
    },
  ];

  it('doit afficher le titre de la page', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <AircraftHistory />
      </MockedProvider>
    );

    expect(screen.getByText(/Chargement des données.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Historique des Vols et Maintenances/i)).toBeInTheDocument();
    });
  });

  it('doit afficher les informations des avions', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <AircraftHistory />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/F-ABCD - Airbus A320/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Historique des Réservations/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique des Maintenances/i)).toBeInTheDocument();
  });

  it('doit afficher les réservations après avoir ouvert l\'accordéon', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <AircraftHistory />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/F-ABCD - Airbus A320/i)).toBeInTheDocument();
    });

    const reservationTrigger = screen.getByText(/Historique des Réservations/i);
    fireEvent.click(reservationTrigger);

    const startDate = '2023-10-01T00:00:00Z';
    const endDate = '2023-10-05T00:00:00Z';

    const formattedStartDate = format(new Date(startDate), 'dd/MM/yyyy', { locale: fr });
    const formattedEndDate = format(new Date(endDate), 'dd/MM/yyyy', { locale: fr });

    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(`Du ${formattedStartDate} au ${formattedEndDate} - Réservé par John Doe`, 'i')
        )
      ).toBeInTheDocument();
    });
  });

  it('doit afficher un message lorsqu\'il n\'y a pas de réservations', async () => {
    const mockNoReservations = {
      getHistoryAircraft: [
        {
          ...mockData.getHistoryAircraft[0],
          reservations: [],
        },
      ],
    };

    const mocksNoReservations = [
      {
        request: {
          query: GET_FLIGHT_HISTORY,
        },
        result: {
          data: mockNoReservations,
        },
      },
    ];

    render(
      <MockedProvider mocks={mocksNoReservations} addTypename={false}>
        <AircraftHistory />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/F-ABCD - Airbus A320/i)).toBeInTheDocument();
    });

    const reservationTrigger = screen.getByText(/Historique des Réservations/i);
    fireEvent.click(reservationTrigger);

    await waitFor(() => {
      expect(screen.getByText(/Aucune réservation récente\./i)).toBeInTheDocument();
    });
  });

  it('doit afficher une erreur si la requête échoue', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_FLIGHT_HISTORY,
        },
        error: new Error('Erreur réseau'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <AircraftHistory />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Erreur lors du chargement des données : Erreur réseau/i)).toBeInTheDocument();
    });
  });
});
