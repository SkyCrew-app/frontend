import { aerodromeLabel, findAerodromeByCode, isAerodromeQuery } from '../aerodromes';
import { AERODROME_BY_IATA, AERODROME_BY_ICAO } from '@/graphql/aviation';

describe('isAerodromeQuery', () => {
  it.each(['LF', 'lfpg', 'Saint-Cyr-l’École', "L'Aigle", ' Nîmes Garons '])('accepte « %s »', (query) => {
    expect(isAerodromeQuery(query)).toBe(true);
  });

  it.each(['', 'a', ' a ', 'x'.repeat(51), 'paris&icao=LFPG', '<b>', 'a/b'])('refuse %p', (query) => {
    expect(isAerodromeQuery(query)).toBe(false);
  });
});

describe('aerodromeLabel', () => {
  it('ajoute le code IATA, à défaut le code OACI', () => {
    expect(aerodromeLabel({ name: 'Charles de Gaulle', icao: 'LFPG', iata: 'CDG' })).toBe('Charles de Gaulle (CDG)');
    expect(aerodromeLabel({ name: 'Chavenay', icao: 'LFPX', iata: null })).toBe('Chavenay (LFPX)');
    expect(aerodromeLabel({ name: 'Terrain' })).toBe('Terrain (—)');
  });
});

describe('findAerodromeByCode', () => {
  const client = { query: jest.fn() };
  const find = (code: string) => findAerodromeByCode(client as never, code);

  beforeEach(() => jest.clearAllMocks());

  it('cherche quatre lettres comme un code OACI', async () => {
    client.query.mockResolvedValue({ data: { aerodromeByIcao: { name: 'A' } } });

    await expect(find(' lfpg ')).resolves.toEqual({ name: 'A' });
    expect(client.query).toHaveBeenCalledWith({ query: AERODROME_BY_ICAO, variables: { icao: 'LFPG' } });
  });

  it('cherche trois lettres comme un code IATA', async () => {
    client.query.mockResolvedValue({ data: { aerodromeByIata: null } });

    await expect(find('cdg')).resolves.toBeNull();
    expect(client.query).toHaveBeenCalledWith({ query: AERODROME_BY_IATA, variables: { iata: 'CDG' } });
  });

  it.each(['', 'LF', 'LFPGX', 'LF12', 'LFPG&x=1'])('n’interroge pas l’API pour « %s »', async (code) => {
    await expect(find(code)).resolves.toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });
});
