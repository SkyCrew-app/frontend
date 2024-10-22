// page.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MaintenanceTable from '../page';
import { MockedProvider } from '@apollo/client/testing';
import { GET_ALL_MAINTENANCES } from '../page';

describe('MaintenanceTable Component', () => {
  const mockMaintenances = [
    {
      id: 1,
      start_date: '2023-10-01T00:00:00Z',
      end_date: '2023-10-05T00:00:00Z',
      maintenance_type: 'Préventive',
      description: 'Changement des pneus',
      maintenance_cost: 500,
      images_url: ['/images/maintenance1.jpg'],
      documents_url: ['/docs/maintenance1.pdf'],
      aircraft: {
        id: 1,
        registration_number: 'F-ABCD',
        model: 'Airbus A320',
      },
      technician: {
        id: 1,
        first_name: 'John',
        email: 'john@example.com',
      },
    },
  ];

  const mocks = [
    {
      request: {
        query: GET_ALL_MAINTENANCES,
      },
      result: {
        data: {
          getAllMaintenances: mockMaintenances,
        },
      },
    },
  ];

  it('doit afficher les maintenances dans le tableau après le chargement', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MaintenanceTable />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/F-ABCD/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Airbus A320')).toBeInTheDocument();
    expect(screen.getByText('Préventive')).toBeInTheDocument();
    expect(screen.getByText('05/10/2023')).toBeInTheDocument();
  });

  it('doit afficher un message d\'erreur en cas d\'erreur de requête', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_ALL_MAINTENANCES,
        },
        error: new Error('Erreur réseau'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <MaintenanceTable />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Impossible de charger les maintenances\. Veuillez réessayer plus tard\./i)
      ).toBeInTheDocument();
    });
  });

  it('doit filtrer les maintenances par recherche', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MaintenanceTable />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/F-ABCD/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Rechercher par immatriculation ou modèle/i);
    fireEvent.change(searchInput, { target: { value: 'Boeing' } });

    expect(screen.queryByText(/F-ABCD/i)).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Airbus' } });

    expect(screen.getByText(/F-ABCD/i)).toBeInTheDocument();
  });

  it('doit ouvrir le dialogue des détails de maintenance', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MaintenanceTable />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/F-ABCD/i)).toBeInTheDocument();
    });

    const seeMoreButton = screen.getByText(/Voir plus/i);
    fireEvent.click(seeMoreButton);

    await waitFor(() => {
      expect(screen.getByText(/Détails de la Maintenance/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Changement des pneus/i)).toBeInTheDocument();
    expect(screen.getByText(/500 €|500€/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
  });
});
