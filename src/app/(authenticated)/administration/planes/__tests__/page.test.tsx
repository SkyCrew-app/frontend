import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import FleetManagementPage from '../page';
import { CREATE_AIRCRAFT, DELETE_AIRCRAFT, GET_AIRCRAFTS, UPDATE_AIRCRAFT } from '@/graphql/planes';
import { GET_PLAN } from '@/graphql/plan';
import type { ClubPlan } from '@/lib/plan';

const mockToast = jest.fn();
jest.mock('@/components/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// Radix Select s'appuie sur des API absentes de jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

const buildAircraft = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  registration_number: `F-TEST${id}`,
  model: 'Cessna 172',
  availability_status: 'AVAILABLE',
  maintenance_status: 'OK',
  hourly_cost: 150,
  year_of_manufacture: 2010,
  total_flight_hours: 1250,
  image_url: null,
  documents_url: [],
  consumption: 35,
  cruiseSpeed: 226,
  maxAltitude: 4100,
  fuel_capacity: null,
  fuel_type: null,
  empty_weight: null,
  max_takeoff_weight: null,
  maintenances: [],
  ...overrides,
});

const robin = buildAircraft(1, {
  registration_number: 'F-GABC',
  model: 'Robin DR400',
  documents_url: ['/uploads/1/manuel.pdf'],
});
const diamond = buildAircraft(2, {
  registration_number: 'F-HDIA',
  model: 'Diamond DA40',
  availability_status: 'UNAVAILABLE',
  maintenance_status: 'Visite 100h en cours',
});

const listMock = (aircrafts: unknown[] = [robin, diamond]): MockedResponse => ({
  request: { query: GET_AIRCRAFTS },
  result: { data: { getAircrafts: aircrafts } },
});

// Champs renvoyés par les mutations de création et de modification.
const mutationResult = (aircraft: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(aircraft).filter(([field]) => field !== 'maintenances'));

// The page asks for the plan of the club: without a limit unless a test gives its own first.
const unlimitedPlan: MockedResponse = {
  request: { query: GET_PLAN },
  result: {
    data: {
      plan: {
        plan: 'ECOLE',
        features: ['INSTRUCTION'],
        maxAircraft: null,
        aircraftInService: 2,
        maxMembers: null,
        activeMembers: 12,
      },
    },
  },
};

const renderPage = (mocks: MockedResponse[] = [listMock()]) =>
  render(
    <MockedProvider mocks={[...mocks, unlimitedPlan]} addTypename={false}>
      <FleetManagementPage />
    </MockedProvider>,
  );

const getCard = (registration: string) => {
  const card = screen.getByRole('heading', { level: 2, name: registration }).closest('[data-aircraft-card]');
  if (!card) throw new Error(`Carte introuvable pour ${registration}`);
  return within(card as HTMLElement);
};

describe('FleetManagementPage', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it("affiche l'en-tête, un seul bouton d'ajout et les aéronefs triés par immatriculation", async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Gestion de la flotte' })).toBeInTheDocument();
    expect(screen.getByLabelText('Chargement des aéronefs')).toHaveAttribute('aria-busy', 'true');

    expect(await screen.findByRole('heading', { level: 2, name: 'F-GABC' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ajouter un aéronef' })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'F-GABC',
      'F-HDIA',
    ]);

    const available = getCard('F-GABC');
    expect(available.getByText('Robin DR400')).toBeInTheDocument();
    expect(available.getByText('Disponible')).toBeInTheDocument();
    expect(available.getByText('1250 h')).toBeInTheDocument();
    // Un aéronef opérationnel n'affiche pas de badge de maintenance.
    expect(available.queryByText('Opérationnel')).not.toBeInTheDocument();
    expect(available.queryByText('OK')).not.toBeInTheDocument();

    const unavailable = getCard('F-HDIA');
    expect(unavailable.getByText('Indisponible')).toBeInTheDocument();
    expect(unavailable.getByText('Visite 100h en cours')).toBeInTheDocument();
  });

  it('filtre les aéronefs par recherche et par disponibilité', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'F-GABC' });

    await user.type(screen.getByRole('textbox', { name: 'Rechercher un aéronef' }), 'diamond');
    expect(screen.queryByRole('heading', { level: 2, name: 'F-GABC' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'F-HDIA' })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Filtrer par disponibilité' }));
    // « Réservé » is never set by the application: not offered when no aircraft has it.
    expect(screen.queryByRole('option', { name: 'Réservé' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: 'Disponible' }));
    expect(screen.getByText('Aucun aéronef ne correspond')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it("propose d'ajouter le premier aéronef quand la flotte est vide", async () => {
    const user = userEvent.setup();
    renderPage([listMock([])]);

    expect(await screen.findByText('Aucun aéronef')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Ajouter un aéronef' });
    await user.click(buttons[buttons.length - 1]);

    expect(await screen.findByRole('dialog', { name: 'Ajouter un aéronef' })).toBeInTheDocument();
  });

  it('valide le formulaire de création puis crée l’aéronef et rafraîchit la liste', async () => {
    const user = userEvent.setup();
    const created = buildAircraft(3, {
      registration_number: 'F-NEUF',
      model: 'Tecnam P2008',
      year_of_manufacture: 2019,
      hourly_cost: 132.5,
      total_flight_hours: 0,
      consumption: null,
      cruiseSpeed: null,
      maxAltitude: null,
    });
    renderPage([
      listMock(),
      {
        request: {
          query: CREATE_AIRCRAFT,
          variables: {
            createAircraftInput: {
              registration_number: 'F-NEUF',
              model: 'Tecnam P2008',
              year_of_manufacture: 2019,
              availability_status: 'AVAILABLE',
              maintenance_status: 'OK',
              hourly_cost: 132.5,
            },
            file: null,
            image: null,
          },
        },
        result: { data: { createAircraft: mutationResult(created) } },
      },
      listMock([robin, diamond, created]),
    ]);
    await screen.findByRole('heading', { level: 2, name: 'F-GABC' });

    await user.click(screen.getByRole('button', { name: 'Ajouter un aéronef' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Ajouter un aéronef' }));

    // Le formulaire est découpé en étapes, sans onglet ; on commence par la première.
    expect(dialog.queryByRole('tab')).not.toBeInTheDocument();
    const steps = within(dialog.getByRole('list', { name: 'Étapes' }));
    expect(steps.getAllByRole('listitem')).toHaveLength(3);
    expect(steps.getByRole('button', { name: /Identification/ })).toHaveAttribute('aria-current', 'step');
    expect(dialog.getByRole('heading', { name: 'État' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: "Ajouter l'aéronef" })).not.toBeInTheDocument();

    // Étape incomplète : chaque champ obligatoire dit ce qui manque, on ne passe pas à la suite.
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    expect(steps.getByRole('button', { name: /Identification/ })).toHaveAttribute('aria-current', 'step');
    expect(dialog.getByText("Indiquez l'immatriculation.")).toBeInTheDocument();
    expect(dialog.getByText('Indiquez le modèle.')).toBeInTheDocument();
    expect(dialog.getByText(/Indiquez une année entre 1903 et/)).toBeInTheDocument();
    expect(dialog.getByText("Indiquez le coût d'une heure de vol, en euros.")).toBeInTheDocument();

    await user.type(dialog.getByLabelText(/Immatriculation/), 'F-NEUF');
    await user.type(dialog.getByLabelText(/Modèle/), 'Tecnam P2008');
    await user.type(dialog.getByLabelText(/Année de fabrication/), '2019');
    await user.type(dialog.getByLabelText(/Coût horaire/), '132.5');
    expect(dialog.queryByText("Indiquez l'immatriculation.")).not.toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    ['Performances', 'Carburant et masses'].forEach((section) =>
      expect(dialog.getByRole('heading', { name: section })).toBeInTheDocument(),
    );
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));
    expect(steps.getByRole('button', { name: /Photo et document/ })).toHaveAttribute('aria-current', 'step');
    expect(dialog.getByRole('button', { name: 'Choisir une photo' })).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: "Ajouter l'aéronef" }));

    expect(await screen.findByRole('heading', { level: 2, name: 'F-NEUF' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Aéronef ajouté' }));
  });

  it("modifie un aéronef sans renvoyer ses documents et vide un champ effacé", async () => {
    const user = userEvent.setup();
    const updated = { ...robin, model: 'Robin DR400-120', consumption: null };
    renderPage([
      listMock(),
      {
        request: {
          query: UPDATE_AIRCRAFT,
          variables: {
            aircraftId: 1,
            updateAircraftInput: {
              registration_number: 'F-GABC',
              model: 'Robin DR400-120',
              year_of_manufacture: 2010,
              availability_status: 'AVAILABLE',
              maintenance_status: 'OK',
              hourly_cost: 150,
              maxAltitude: 4100,
              cruiseSpeed: 226,
              consumption: null,
            },
            file: null,
            image: null,
          },
        },
        result: { data: { updateAircraft: mutationResult(updated) } },
      },
      listMock([updated, diamond]),
    ]);
    await screen.findByRole('heading', { level: 2, name: 'F-GABC' });

    await user.click(getCard('F-GABC').getByRole('button', { name: 'Modifier' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Modifier F-GABC' }));

    expect(dialog.getByLabelText(/Immatriculation/)).toHaveValue('F-GABC');
    expect(dialog.getByLabelText(/Coût horaire/)).toHaveValue(150);
    expect(dialog.getByRole('combobox', { name: /État de maintenance/ })).toHaveTextContent('Opérationnel');

    await user.clear(dialog.getByLabelText(/Modèle/));
    await user.type(dialog.getByLabelText(/Modèle/), 'Robin DR400-120');
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));

    expect(dialog.getByRole('spinbutton', { name: 'Consommation' })).toHaveValue(35);
    await user.clear(dialog.getByLabelText('Consommation'));
    await user.click(dialog.getByRole('button', { name: 'Suivant' }));

    expect(dialog.getByText('manuel.pdf')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Robin DR400-120')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Aéronef mis à jour' }));
  });

  it("garde dans le formulaire un état de maintenance saisi à la main", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'F-HDIA' });

    await user.click(getCard('F-HDIA').getByRole('button', { name: 'Modifier' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Modifier F-HDIA' }));

    expect(dialog.getByRole('combobox', { name: /État de maintenance/ })).toHaveTextContent('Visite 100h en cours');
    expect(dialog.getByRole('combobox', { name: /Disponibilité/ })).toHaveTextContent('Indisponible');
  });

  it("ouvre les détails d'un aéronef et permet de passer à la modification", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'F-GABC' });

    await user.click(getCard('F-GABC').getByRole('button', { name: 'Détails' }));
    const details = within(await screen.findByRole('dialog', { name: 'F-GABC' }));
    expect(details.getByText('Opérationnel')).toBeInTheDocument();
    expect(details.getByRole('link', { name: /manuel\.pdf/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https?:\/\/.+\/uploads\/1\/manuel\.pdf$/),
    );

    await user.click(details.getByRole('button', { name: 'Modifier' }));
    expect(await screen.findByRole('dialog', { name: 'Modifier F-GABC' })).toBeInTheDocument();
  });

  it("supprime un aéronef après une confirmation qui le nomme, et rien si on annule", async () => {
    const user = userEvent.setup();
    renderPage([
      listMock(),
      {
        request: { query: DELETE_AIRCRAFT, variables: { aircraftId: 2 } },
        result: { data: { deleteAircraft: true } },
      },
      listMock([robin]),
    ]);
    await screen.findByRole('heading', { level: 2, name: 'F-HDIA' });

    await user.click(screen.getByRole('button', { name: 'Supprimer F-HDIA' }));
    let confirmation = await screen.findByRole('alertdialog', { name: 'Supprimer F-HDIA ?' });
    expect(confirmation).toHaveTextContent(/F-HDIA \(Diamond DA40\) sera définitivement/);
    await user.click(within(confirmation).getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: 'F-HDIA' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Supprimer F-HDIA' }));
    confirmation = await screen.findByRole('alertdialog', { name: 'Supprimer F-HDIA ?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'F-HDIA' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: 'F-GABC' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Aéronef supprimé' }));
  });

  const askToDelete = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByRole('heading', { level: 2, name: 'F-HDIA' });
    await user.click(screen.getByRole('button', { name: 'Supprimer F-HDIA' }));
    const confirmation = await screen.findByRole('alertdialog', { name: 'Supprimer F-HDIA ?' });
    // The dialog says what happens to an aircraft that has a history.
    expect(confirmation).toHaveTextContent(/n'est pas supprimé : il est retiré du service/);
    await user.click(within(confirmation).getByRole('button', { name: 'Supprimer' }));
  };

  it("annonce le retrait du service, et non une suppression, quand l'aéronef a un historique", async () => {
    const user = userEvent.setup();
    renderPage([
      listMock(),
      {
        request: { query: DELETE_AIRCRAFT, variables: { aircraftId: 2 } },
        // The API keeps the aircraft and its history: it answers false.
        result: { data: { deleteAircraft: false } },
      },
      listMock(),
    ]);

    await askToDelete(user);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Aéronef retiré du service',
          description: expect.stringContaining("F-HDIA a un historique : il n'a pas été supprimé"),
        }),
      ),
    );
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Aéronef supprimé' }));
    expect(screen.getByRole('heading', { level: 2, name: 'F-HDIA' })).toBeInTheDocument();
  });

  it("explique le refus de l'API quand des réservations à venir empêchent le retrait", async () => {
    const user = userEvent.setup();
    const refusal = 'Cet avion a 2 réservation(s) à venir : annulez-les ou déplacez-les avant de le retirer';
    renderPage([
      listMock(),
      {
        request: { query: DELETE_AIRCRAFT, variables: { aircraftId: 2 } },
        result: { errors: [new GraphQLError(refusal)] },
      },
    ]);

    await askToDelete(user);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Suppression impossible', description: refusal, variant: 'destructive' }),
      ),
    );
    // The aircraft is still there, behind the confirmation left open.
    expect(screen.getByRole('heading', { level: 2, name: 'F-HDIA', hidden: true })).toBeInTheDocument();
  });

  const clubPlan = (overrides: Partial<ClubPlan> = {}): MockedResponse => ({
    request: { query: GET_PLAN },
    result: {
      data: {
        plan: {
          plan: 'CLUB',
          features: [],
          maxAircraft: 2,
          aircraftInService: 2,
          maxMembers: null,
          activeMembers: 12,
          ...overrides,
        },
      },
    },
  });

  it("n'ouvre pas le formulaire et dit pourquoi quand la formule n'a plus de place pour un avion", async () => {
    const user = userEvent.setup();
    renderPage([listMock(), clubPlan()]);
    await screen.findByRole('heading', { level: 2, name: 'F-GABC' });

    const add = screen.getByRole('button', { name: 'Ajouter un aéronef' });
    await waitFor(() => expect(add).toHaveAttribute('aria-disabled', 'true'));
    expect(add).toHaveAccessibleDescription(
      'Votre formule permet 2 avions en service : retirez-en un ou contactez votre fournisseur pour changer de formule',
    );
    await user.click(add);
    expect(screen.queryByRole('dialog', { name: 'Ajouter un aéronef' })).not.toBeInTheDocument();
  });

  it('propose de nouveau un avion une fois un aéronef retiré, la formule étant relue', async () => {
    const user = userEvent.setup();
    renderPage([
      listMock(),
      clubPlan(),
      {
        request: { query: DELETE_AIRCRAFT, variables: { aircraftId: 2 } },
        result: { data: { deleteAircraft: true } },
      },
      listMock([robin]),
      clubPlan({ aircraftInService: 1 }),
    ]);
    await screen.findByRole('heading', { level: 2, name: 'F-HDIA' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ajouter un aéronef' })).toHaveAttribute('aria-disabled', 'true'),
    );

    await user.click(screen.getByRole('button', { name: 'Supprimer F-HDIA' }));
    const confirmation = await screen.findByRole('alertdialog', { name: 'Supprimer F-HDIA ?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'F-HDIA' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const add = await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Ajouter un aéronef' });
      expect(button).not.toHaveAttribute('aria-disabled');
      return button;
    });
    await user.click(add);
    expect(await screen.findByRole('dialog', { name: 'Ajouter un aéronef' })).toBeInTheDocument();
  });

  it("propose l'ajout quand la formule laisse de la place", async () => {
    const user = userEvent.setup();
    renderPage([listMock(), clubPlan({ maxAircraft: 3 })]);
    await screen.findByRole('heading', { level: 2, name: 'F-GABC' });

    const add = screen.getByRole('button', { name: 'Ajouter un aéronef' });
    expect(add).not.toHaveAttribute('aria-disabled');
    await user.click(add);
    expect(await screen.findByRole('dialog', { name: 'Ajouter un aéronef' })).toBeInTheDocument();
  });

  it("affiche un état d'erreur avec Réessayer quand la liste ne se charge pas", async () => {
    const user = userEvent.setup();
    renderPage([{ request: { query: GET_AIRCRAFTS }, error: new Error('Erreur réseau') }, listMock()]);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.queryByText(/Erreur réseau/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Gestion de la flotte' })).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'F-GABC' })).toBeInTheDocument();
  });
});
