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

describe("calendarDayToISOString", () => {
  const { calendarDayToISOString } = jest.requireActual("../datetime")

  it("keeps the picked day whatever the timezone of the browser", () => {
    // Midnight local time on 1 October, as a date picker returns it.
    expect(calendarDayToISOString(new Date(2026, 9, 1))).toBe("2026-10-01T12:00:00.000Z")
    expect(calendarDayToISOString(new Date(2026, 0, 31, 23, 30))).toBe("2026-01-31T12:00:00.000Z")
  })

  it("leaves an empty or invalid day out of the request", () => {
    expect(calendarDayToISOString(null)).toBeUndefined()
    expect(calendarDayToISOString(undefined)).toBeUndefined()
    expect(calendarDayToISOString(new Date("nope"))).toBeUndefined()
  })
})
