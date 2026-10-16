import { optionalIdField, toIntId } from '../graphql-inputs';

describe('toIntId', () => {
  it('conserve un entier', () => {
    expect(toIntId(12)).toBe(12);
  });

  it('convertit une chaîne numérique', () => {
    expect(toIntId('7')).toBe(7);
  });

  it.each([undefined, null, '', '  ', 'abc', Number.NaN, 1.5])('retourne null pour %p', (value) => {
    expect(toIntId(value)).toBeNull();
  });
});

describe('optionalIdField', () => {
  it("inclut le champ quand l'identifiant est un vrai nombre", () => {
    expect(optionalIdField('courseId', '4')).toEqual({ courseId: 4 });
  });

  it("omet le champ quand l'identifiant est absent", () => {
    expect(optionalIdField('moduleId', undefined)).toEqual({});
  });
});
