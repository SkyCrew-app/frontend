import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { AerodromeCombobox } from '../comboboAerodrome';
import { AERODROME_BY_IATA, AERODROME_BY_ICAO, SEARCH_AERODROMES } from '@/graphql/aviation';

// cmdk and the popover rely on browser APIs jsdom does not provide.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = jest.fn();
});

const LFPG = { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle', latitude: 49.01, longitude: 2.55 };

const renderCombobox = (mocks: MockedResponse[], props: Partial<React.ComponentProps<typeof AerodromeCombobox>> = {}) => {
  const onAerodromeChange = jest.fn();
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AerodromeCombobox onAerodromeChange={onAerodromeChange} {...props} />
    </MockedProvider>,
  );
  return { onAerodromeChange };
};

const type = async (text: string) => {
  if (!screen.queryByPlaceholderText('Rechercher un aérodrome...')) {
    fireEvent.click(screen.getByRole('combobox'));
  }
  fireEvent.change(await screen.findByPlaceholderText('Rechercher un aérodrome...'), { target: { value: text } });
};

describe('AerodromeCombobox', () => {
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  it('affiche le nom de l’aérodrome déjà choisi, cherché par son code OACI', async () => {
    renderCombobox(
      [{ request: { query: AERODROME_BY_ICAO, variables: { icao: 'LFPG' } }, result: { data: { aerodromeByIcao: LFPG } } }],
      { defaultValue: 'lfpg' },
    );

    expect(await screen.findByText('Charles de Gaulle (CDG)')).toBeInTheDocument();
  });

  it('cherche un code de trois lettres comme un code IATA', async () => {
    renderCombobox(
      [{ request: { query: AERODROME_BY_IATA, variables: { iata: 'CDG' } }, result: { data: { aerodromeByIata: LFPG } } }],
      { defaultValue: 'CDG' },
    );

    expect(await screen.findByText('Charles de Gaulle (CDG)')).toBeInTheDocument();
  });

  it('garde le code quand l’aérodrome est inconnu ou que la recherche échoue', async () => {
    renderCombobox(
      [{ request: { query: AERODROME_BY_ICAO, variables: { icao: 'ZZZZ' } }, error: new Error('boom') }],
      { defaultValue: 'ZZZZ' },
    );

    expect(await screen.findByText('ZZZZ')).toBeInTheDocument();
  });

  it('propose les aérodromes trouvés par l’API, y compris par leur nom, et transmet le code choisi', async () => {
    const { onAerodromeChange } = renderCombobox([
      {
        request: { query: SEARCH_AERODROMES, variables: { query: 'gaulle' } },
        result: {
          data: {
            searchAerodromes: [
              { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle' },
              { icao: null, iata: null, name: 'Sans code' },
            ],
          },
        },
      },
    ]);

    await type('  gaulle ');

    fireEvent.click(await screen.findByText('Charles de Gaulle (CDG)'));

    expect(screen.queryByText(/Sans code/)).not.toBeInTheDocument();
    expect(onAerodromeChange).toHaveBeenCalledWith('LFPG');
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Charles de Gaulle (CDG)'));
  });

  it('n’interroge pas l’API pour une saisie trop courte ou non prise en charge', async () => {
    renderCombobox([]);

    await type('a');
    expect(screen.getByText('Aucun aérodrome trouvé.')).toBeInTheDocument();

    await type('<script>');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(screen.getByText('Aucun aérodrome trouvé.')).toBeInTheDocument();
  });

  it('n’affiche rien quand la recherche échoue', async () => {
    renderCombobox([{ request: { query: SEARCH_AERODROMES, variables: { query: 'paris' } }, error: new Error('boom') }]);

    await type('paris');

    await waitFor(() => expect(screen.getByText('Aucun aérodrome trouvé.')).toBeInTheDocument());
  });

  it('ne contacte jamais directement le fournisseur de données', async () => {
    renderCombobox(
      [
        { request: { query: AERODROME_BY_ICAO, variables: { icao: 'LFPG' } }, result: { data: { aerodromeByIcao: LFPG } } },
        { request: { query: SEARCH_AERODROMES, variables: { query: 'paris' } }, result: { data: { searchAerodromes: [] } } },
      ],
      { defaultValue: 'LFPG' },
    );

    await screen.findByText('Charles de Gaulle (CDG)');
    await type('paris');
    await waitFor(() => expect(screen.getByText('Aucun aérodrome trouvé.')).toBeInTheDocument());

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
