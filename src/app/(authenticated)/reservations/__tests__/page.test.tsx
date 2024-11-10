// ReservationCalendar.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReservationCalendar from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { GET_FILTERED_RESERVATIONS } from '@/graphql/reservation';
import { GET_AIRCRAFTS } from '@/graphql/planes';
import { GET_USER_BY_EMAIL } from '@/graphql/user';

jest.mock('jwt-decode', () => () => ({ email: 'test@example.com' }));

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(() => 'mocked_token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
});

describe('ReservationCalendar Component', () => {
  const formattedDate = '2024-10-22';
  const nextDate = '2024-10-23';

  const mockAircrafts = [
    { id: 1, registration_number: 'ABC123' },
    { id: 2, registration_number: 'DEF456' },
  ];

  const mockReservations = [
    {
      id: 1,
      start_time: `${formattedDate}T10:00:00.000Z`,
      end_time: `${formattedDate}T12:00:00.000Z`,
      purpose: 'Entraînement',
      estimated_flight_hours: 2,
      status: 'PENDING',
      notes: '',
      flight_category: 'VFR',
      user: { first_name: 'John' },
      aircraft: { id: 1, registration_number: 'ABC123' },
    },
  ];

  const mockUserData = {
    userByEmail: {
      id: 1,
      first_name: 'Test User',
    },
  };

  const mocks = [
    {
      request: {
        query: GET_USER_BY_EMAIL,
        variables: { email: 'test@example.com' },
      },
      result: {
        data: mockUserData,
      },
    },
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
    {
      request: {
        query: GET_FILTERED_RESERVATIONS,
        variables: { startDate: formattedDate, endDate: nextDate },
      },
      result: {
        data: {
          filteredReservations: mockReservations,
        },
      },
    },
  ];

  test('affiche le calendrier avec les avions et les réservations', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ReservationCalendar />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Calendrier des Réservations/i)).toBeInTheDocument();
    });

    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('DEF456')).toBeInTheDocument();

    expect(screen.getAllByText('Réservé')).toHaveLength(1);
  });
});
