import { datetimeLocalToISOString } from '../datetime';

describe('datetimeLocalToISOString', () => {
  it("convertit l'heure locale saisie en chaîne ISO complète", () => {
    expect(datetimeLocalToISOString('2026-03-10T14:30')).toBe(new Date(2026, 2, 10, 14, 30).toISOString());
  });

  it('produit une chaîne avec fuseau horaire explicite (UTC)', () => {
    expect(datetimeLocalToISOString('2026-03-10T14:30')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('omet un champ vide', () => {
    expect(datetimeLocalToISOString('')).toBeUndefined();
    expect(datetimeLocalToISOString(null)).toBeUndefined();
  });

  it('omet une valeur qui ne représente pas une date', () => {
    expect(datetimeLocalToISOString('pas une date')).toBeUndefined();
  });
});
