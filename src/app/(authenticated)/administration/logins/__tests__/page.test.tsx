import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LoginLogPage from '../page';
import { GET_LOGIN_EVENTS } from '@/graphql/login-events';
import { GET_USERS } from '@/graphql/user';
import { formatDateTime } from '@/lib/format';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// Radix selects rely on pointer APIs jsdom does not have.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

let mockSearch = '';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/administration/logins',
}));

const NOW = new Date('2026-10-18T12:00:00.000Z').getTime();

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  created_at: '2026-10-12T14:30:00.000Z',
  user_id: 7,
  member_name: 'Jean Dupont',
  attempted_email: null,
  outcome: 'SUCCESS',
  method: 'PASSWORD',
  ip_address: '203.0.113.7',
  browser: 'Firefox 131',
  os: 'Windows',
  device_type: 'DESKTOP',
  ...overrides,
});

type Variables = {
  memberId?: number | null;
  outcome?: string | null;
  from?: string | null;
  page?: number;
};

const variablesOf = (variables: Variables) => ({
  memberId: null,
  outcome: null,
  from: null,
  to: null,
  page: 1,
  pageSize: 25,
  ...variables,
});

const eventsMock = (
  variables: Variables,
  items: ReturnType<typeof event>[],
  total = items.length,
): MockedResponse => ({
  request: { query: GET_LOGIN_EVENTS, variables: variablesOf(variables) },
  result: { data: { loginEvents: { total, page: variables.page ?? 1, pageSize: 25, items } } },
});

const membersMock: MockedResponse = {
  request: { query: GET_USERS },
  result: {
    data: {
      getUsers: [
        {
          id: '7',
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean@club.fr',
          phone_number: null,
          date_of_birth: null,
          is2FAEnabled: false,
          isEmailConfirmed: true,
          is_active: true,
          role: { id: 2, role_name: 'Pilote' },
        },
      ],
    },
  },
};

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={[membersMock, ...mocks]} addTypename={false}>
      <LoginLogPage />
    </MockedProvider>,
  );

describe('Journal des connexions', () => {
  beforeEach(() => {
    mockSearch = '';
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => jest.restoreAllMocks());

  it('liste qui s’est connecté, quand, avec quel appareil, depuis quelle adresse et avec quel résultat', async () => {
    renderPage([
      eventsMock({}, [
        event(),
        event({
          id: 2,
          user_id: null,
          member_name: null,
          attempted_email: 'inconnu@exemple.fr',
          outcome: 'UNKNOWN_ACCOUNT',
          ip_address: '2001:db8::7',
          browser: 'Safari 18',
          os: 'iOS',
          device_type: 'MOBILE',
        }),
        event({ id: 3, outcome: 'SECOND_FACTOR_FAILED', method: 'TWO_FACTOR_CODE' }),
        event({ id: 4, outcome: 'LOGOUT', method: null, browser: null, os: null, device_type: 'UNKNOWN' }),
      ]),
    ]);

    expect(screen.getByRole('heading', { level: 1, name: 'Journal des connexions' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    const rows = await within(table).findAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveTextContent(formatDateTime('2026-10-12T14:30:00.000Z').replace(/\s/g, ' '));
    expect(rows[1]).toHaveTextContent('Jean Dupont');
    expect(rows[1]).toHaveTextContent('Connexion réussie');
    // The usual way in goes without saying; the second step says how it was checked.
    expect(rows[1]).not.toHaveTextContent('par mot de passe');
    expect(rows[1]).toHaveTextContent('Firefox 131 · Windows · Ordinateur');
    expect(rows[1]).toHaveTextContent('203.0.113.7');
    expect(rows[2]).toHaveTextContent('Adresse inconnue : inconnu@exemple.fr');
    expect(rows[2]).toHaveTextContent('Compte inconnu');
    expect(rows[2]).toHaveTextContent('Safari 18 · iOS · Téléphone');
    expect(rows[3]).toHaveTextContent('Code de double authentification erroné');
    expect(rows[3]).toHaveTextContent('par code de double authentification');
    expect(rows[4]).toHaveTextContent('Déconnexion');
    expect(rows[4]).toHaveTextContent('Appareil inconnu');
    expect(screen.getByText(/1–4 sur 4 connexions/)).toBeInTheDocument();

    // On a phone, the same lines as stacked cards.
    const cards = screen.getByRole('list', { name: 'Journal des connexions' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(4);
    expect(within(cards).getAllByRole('listitem')[1]).toHaveTextContent('Adresse inconnue : inconnu@exemple.fr');
  });

  it("demande à l'API les connexions d'un compte, d'un résultat et d'une période", async () => {
    const user = userEvent.setup();
    const filtered = jest.fn(() => ({
      data: { loginEvents: { total: 1, page: 1, pageSize: 25, items: [event({ id: 9, outcome: 'WRONG_PASSWORD' })] } },
    }));
    const weekAgo = new Date(NOW - 7 * 24 * 3600 * 1000).toISOString();
    renderPage([
      eventsMock({}, [event()]),
      eventsMock({ memberId: 7 }, [event()]),
      eventsMock({ memberId: 7, outcome: 'WRONG_PASSWORD' }, [event({ outcome: 'WRONG_PASSWORD' })]),
      {
        request: {
          query: GET_LOGIN_EVENTS,
          variables: variablesOf({ memberId: 7, outcome: 'WRONG_PASSWORD', from: weekAgo }),
        },
        result: filtered,
      },
    ]);
    await screen.findAllByText('Jean Dupont');

    await user.click(screen.getByRole('combobox', { name: 'Compte' }));
    await user.click(await screen.findByRole('option', { name: 'Dupont Jean' }));
    await user.click(screen.getByRole('combobox', { name: 'Résultat' }));
    await user.click(await screen.findByRole('option', { name: 'Mot de passe erroné' }));
    await user.click(screen.getByRole('combobox', { name: 'Période' }));
    await user.click(await screen.findByRole('option', { name: '7 derniers jours' }));

    await waitFor(() => expect(filtered).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Effacer les filtres' })).toBeInTheDocument();
  });

  it("ouvre le journal d'un membre depuis sa fiche", async () => {
    mockSearch = 'member=7';
    const forMember = jest.fn(() => ({
      data: { loginEvents: { total: 1, page: 1, pageSize: 25, items: [event()] } },
    }));
    renderPage([{ request: { query: GET_LOGIN_EVENTS, variables: variablesOf({ memberId: 7 }) }, result: forMember }]);

    await waitFor(() => expect(forMember).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Effacer les filtres' })).toBeInTheDocument();
  });

  it('passe à la page suivante', async () => {
    const user = userEvent.setup();
    const secondPage = jest.fn(() => ({
      data: { loginEvents: { total: 30, page: 2, pageSize: 25, items: [event({ id: 26, member_name: 'Paul Durand' })] } },
    }));
    renderPage([
      eventsMock({}, [event()], 30),
      { request: { query: GET_LOGIN_EVENTS, variables: variablesOf({ page: 2 }) }, result: secondPage },
    ]);
    await screen.findAllByText('Jean Dupont');

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect((await screen.findAllByText('Paul Durand')).length).toBeGreaterThan(0);
    expect(secondPage).toHaveBeenCalledTimes(1);
  });

  it("dit qu'il n'y a encore rien quand le journal est vide, et quand un filtre ne trouve rien", async () => {
    const user = userEvent.setup();
    renderPage([eventsMock({}, []), eventsMock({ outcome: 'LOCKED_OR_THROTTLED' }, [])]);

    expect((await screen.findAllByText('Aucune connexion enregistrée')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('combobox', { name: 'Résultat' }));
    await user.click(await screen.findByRole('option', { name: 'Trop de tentatives' }));
    expect((await screen.findAllByText('Aucune connexion ne correspond')).length).toBeGreaterThan(0);
  });

  it("propose de réessayer quand le journal n'a pas pu être chargé", async () => {
    renderPage([{ request: { query: GET_LOGIN_EVENTS, variables: variablesOf({}) }, error: new Error('network') }]);

    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
