import { isNextAsset, sessionCookieMaxAge } from '../proxy-rules';

describe('isNextAsset', () => {
  it.each(['/_next/static/chunks/main.js', '/_next/image', '/_next/webpack-hmr'])('laisse passer %s', (pathname) => {
    expect(isNextAsset(pathname)).toBe(true);
  });

  it.each([
    '/static',
    '/static/report',
    '/administration/static',
    '/fleet/static/1',
    '/reservations/_next/static',
    '/_nextfoo',
    '/',
  ])('contrôle la session pour %s', (pathname) => {
    expect(isNextAsset(pathname)).toBe(false);
  });
});

describe('sessionCookieMaxAge', () => {
  const now = 1_800_000_000_000;
  const nowSeconds = now / 1000;

  it('donne au cookie la durée restante du jeton', () => {
    expect(sessionCookieMaxAge(nowSeconds + 7200, now)).toBe(7200);
    expect(sessionCookieMaxAge(nowSeconds + 90, now)).toBe(90);
  });

  it('ne prolonge jamais un jeton expiré', () => {
    expect(sessionCookieMaxAge(nowSeconds - 1, now)).toBe(0);
    expect(sessionCookieMaxAge(nowSeconds, now)).toBe(0);
  });

  it('arrondit à la seconde inférieure', () => {
    expect(sessionCookieMaxAge(nowSeconds + 10, now + 400)).toBe(9);
  });

  it.each([undefined, null, '1800000000', Number.NaN, Infinity])('ne garde pas de cookie quand l’expiration est %p', (exp) => {
    expect(sessionCookieMaxAge(exp, now)).toBe(0);
  });
});
