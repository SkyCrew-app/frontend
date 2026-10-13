import fs from 'node:fs';
import path from 'node:path';
import { canOpenPage, isNextAsset, isPublicFile, secondsLeft } from '../proxy-rules';

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

const ROOT = path.join(__dirname, '..', '..', '..');

const filesUnder = (dir: string, prefix = ''): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(path.join(dir, entry.name), `${prefix}/${entry.name}`) : [`${prefix}/${entry.name}`],
  );

// Addresses of the pages of the app router; a parameter ("[id]") becomes 0.
const pagesUnder = (dir: string, segments: string[] = []): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isFile()) return /^page\.[jt]sx?$/.test(entry.name) ? [`/${segments.join('/')}`] : [];
    if (entry.name.startsWith('_')) return [];
    const segment = entry.name.replace(/^\[.+\]$/, '0');
    return pagesUnder(path.join(dir, entry.name), /^\(.+\)$/.test(entry.name) ? segments : [...segments, segment]);
  });

describe('isPublicFile', () => {
  const publicFiles = filesUnder(path.join(ROOT, 'public')).filter((file) => !file.endsWith('.DS_Store'));
  const pages = pagesUnder(path.join(ROOT, 'src', 'app'));

  it('lit bien le dossier public et les pages', () => {
    expect(publicFiles).toEqual(expect.arrayContaining(['/manifest.json', '/images/icon-192.png', '/images/logo.svg']));
    expect(pages).toEqual(expect.arrayContaining(['/', '/dashboard', '/administration/users', '/system/notconnected']));
  });

  it('sert sans session chaque fichier du dossier public', () => {
    expect(publicFiles.filter((file) => !isPublicFile(file))).toEqual([]);
  });

  it.each(['/favicon.ico', '/robots.txt', '/sw.js', '/swe-worker-f61931bc2770d10b.js'])(
    'sert sans session %s',
    (pathname) => {
      expect(isPublicFile(pathname)).toBe(true);
    },
  );

  it("n'ouvre aucune page", () => {
    expect(pages.filter((page) => isPublicFile(page))).toEqual([]);
  });

  it.each([
    '/images',
    '/images/',
    '/images/../dashboard',
    '/images/members/list',
    '/images/logo.svg/edit',
    '/dashboard/manifest.json',
    '/administration/users.png',
    '/sw.js/dashboard',
    '/swe-worker-.js',
    '/swe-worker-abc.js.map',
    '/profile.svg',
    '/dashboard.json',
    '/api/export.ico',
  ])('contrôle la session pour %s', (pathname) => {
    expect(isPublicFile(pathname)).toBe(false);
  });
});

describe('secondsLeft', () => {
  const now = 1_800_000_000_000;
  const nowSeconds = now / 1000;

  it('donne la durée restante du jeton', () => {
    expect(secondsLeft(nowSeconds + 7200, now)).toBe(7200);
    expect(secondsLeft(nowSeconds + 90, now)).toBe(90);
  });

  it('ne prolonge jamais un jeton expiré', () => {
    expect(secondsLeft(nowSeconds - 1, now)).toBe(0);
    expect(secondsLeft(nowSeconds, now)).toBe(0);
  });

  it('arrondit à la seconde inférieure', () => {
    expect(secondsLeft(nowSeconds + 10, now + 400)).toBe(9);
  });

  it.each([undefined, null, '1800000000', Number.NaN, Infinity])('tient le jeton pour expiré quand l’expiration est %p', (exp) => {
    expect(secondsLeft(exp, now)).toBe(0);
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
    '/administration/actions',
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
