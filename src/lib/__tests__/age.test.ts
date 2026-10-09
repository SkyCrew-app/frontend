import { getAge } from '../age';

describe('getAge', () => {
  const today = new Date(2026, 5, 15); // 15 juin 2026

  it("compte l'année en cours quand l'anniversaire est passé", () => {
    expect(getAge(new Date(2010, 0, 20), today)).toBe(16);
  });

  it("compte l'année en cours le jour de l'anniversaire", () => {
    expect(getAge(new Date(2010, 5, 15), today)).toBe(16);
  });

  it("ne compte pas l'année en cours la veille de l'anniversaire", () => {
    expect(getAge(new Date(2010, 5, 16), today)).toBe(15);
  });

  it("ne compte pas l'année en cours quand l'anniversaire tombe plus tard dans l'année", () => {
    expect(getAge(new Date(2010, 11, 1), today)).toBe(15);
  });
});
