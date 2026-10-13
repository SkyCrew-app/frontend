import { canOpenPage, isNextAsset, sessionCookieMaxAge } from '../proxy-rules';

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

describe('canOpenPage', () => {
  const ROLES = ['Administrateur', 'Instructeur', 'Technicien', 'Pilote'];
  const ADMIN_ONLY = [
    '/administration',
    '/administration/users',
    '/administration/finance',
    '/administration/audits',
    '/administration/articles',
    '/administration/planes',
    '/administration/e-learning',
    '/administration/settings',
    '/administration/unknown-page',
  ];

  it.each(ADMIN_ONLY)("réserve %s à l'administrateur", (pathname) => {
    expect(ROLES.filter((role) => canOpenPage(role, pathname))).toEqual(['Administrateur']);
    expect(canOpenPage(undefined, pathname)).toBe(false);
  });

  it('ouvre les modèles de checklist aux instructeurs et aux techniciens', () => {
    for (const pathname of ['/administration/checklists', '/administration/checklists/12']) {
      expect(ROLES.filter((role) => canOpenPage(role, pathname))).toEqual([
        'Administrateur',
        'Instructeur',
        'Technicien',
      ]);
    }
  });

  it('ouvre le suivi des incidents aux techniciens', () => {
    expect(ROLES.filter((role) => canOpenPage(role, '/administration/incidents'))).toEqual([
      'Administrateur',
      'Technicien',
    ]);
  });

  it('laisse chaque membre régler sa double authentification', () => {
    expect(ROLES.every((role) => canOpenPage(role, '/administration/2fa'))).toBe(true);
    expect(canOpenPage(undefined, '/administration/2fa')).toBe(true);
  });

  it.each(['/dashboard', '/fleet/maintenance', '/profile', '/administrationx', '/admin'])(
    "ne restreint pas %s, qui n'est pas dans l'administration",
    (pathname) => {
      expect(ROLES.every((role) => canOpenPage(role, pathname))).toBe(true);
    },
  );

  it("ne se laisse pas tromper par une page dont le nom commence comme une page ouverte", () => {
    expect(canOpenPage('Technicien', '/administration/incidents-export')).toBe(false);
    expect(canOpenPage('Pilote', '/administration/2fa-admin')).toBe(false);
  });
});
