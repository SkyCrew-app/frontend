/** @jest-environment node */
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

// A session token as the API signs it; the proxy only decodes it.
const tokenFor = (role: string, expiresInSeconds: number) => {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: 1, role, exp })}.signature`;
};

const ask = (pathname: string, options: { token?: string; prefetch?: boolean } = {}) => {
  const headers = new Headers({ host: 'club.example' });
  if (options.token) headers.set('cookie', `token=${options.token}`);
  if (options.prefetch) {
    headers.set('next-router-prefetch', '1');
    headers.set('rsc', '1');
  }
  return proxy(new NextRequest(`http://club.example${pathname}`, { headers }));
};

const isServed = (response: Response) => response.headers.get('x-middleware-next') === '1';
const redirection = (response: Response) => response.headers.get('location')?.replace('http://club.example', '') ?? null;

describe('proxy', () => {
  let maintenance: boolean;
  const fetchMock = jest.fn();

  beforeEach(() => {
    maintenance = false;
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => ({ json: async () => ({ data: { getSiteStatus: maintenance } }) }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('cookie de session', () => {
    const pilot = tokenFor('Pilote', 3600);
    const admin = tokenFor('Administrateur', 3600);

    // A cookie sent back here would reach the browser after the API cleared it at
    // sign-out (answers to prefetches still on their way) and reopen the session.
    it.each([
      ['une page protégée', '/dashboard', { token: pilot }],
      ['le préchargement d’un lien', '/reservations', { token: pilot, prefetch: true }],
      ["une page d'administration", '/administration/users', { token: admin, prefetch: true }],
      ['une page refusée au rôle', '/administration/users', { token: pilot }],
      ['une page publique', '/', { token: pilot }],
      ['un fichier public', '/manifest.json', { token: pilot }],
      ['un jeton expiré', '/dashboard', { token: tokenFor('Pilote', -10) }],
      ['un jeton illisible', '/dashboard', { token: 'not-a-token' }],
      ['une demande sans session', '/dashboard', {}],
    ])("n'écrit jamais le cookie de session : %s", async (_case, pathname, options) => {
      const response = await ask(pathname, options);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.cookies.getAll()).toEqual([]);
    });

    it("n'écrit pas le cookie non plus pendant une maintenance", async () => {
      maintenance = true;
      const response = await ask('/dashboard', { token: pilot });
      expect(redirection(response)).toBe('/system/maintenance');
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('laisse le membre connecté naviguer tant que son jeton est valide', async () => {
      for (const pathname of ['/dashboard', '/reservations', '/logbook', '/profile']) {
        const response = await ask(pathname, { token: pilot });
        expect(isServed(response)).toBe(true);
        expect(redirection(response)).toBeNull();
      }
    });

    it('renvoie vers la page « non connecté » sans session, ou avec un jeton expiré ou illisible', async () => {
      expect(redirection(await ask('/dashboard'))).toBe('/system/notconnected');
      expect(redirection(await ask('/dashboard', { token: tokenFor('Pilote', -10) }))).toBe('/system/notconnected');
      expect(redirection(await ask('/dashboard', { token: 'not-a-token' }))).toBe('/system/notconnected');
    });

    it("refuse l'administration à un pilote", async () => {
      expect(redirection(await ask('/administration/users', { token: pilot }))).toBe('/system/unauthorized');
    });
  });

  describe('fichiers publics', () => {
    it.each(['/manifest.json', '/images/icon-192.png', '/images/logo.svg', '/favicon.ico', '/robots.txt', '/placeholder.svg'])(
      'sert %s sans session, avec la politique de sécurité',
      async (pathname) => {
        const response = await ask(pathname);
        expect(isServed(response)).toBe(true);
        expect(redirection(response)).toBeNull();
        expect(response.headers.get('content-security-policy')).toContain("script-src 'self' 'nonce-");
      },
    );

    it.each(['/sw.js', '/swe-worker-f61931bc2770d10b.js'])('sert %s sans session et sans politique de page', async (pathname) => {
      const response = await ask(pathname);
      expect(isServed(response)).toBe(true);
      expect(response.headers.get('content-security-policy')).toBeNull();
    });

    it("sert les fichiers publics pendant une maintenance, sans interroger l'API", async () => {
      maintenance = true;
      expect(isServed(await ask('/manifest.json'))).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(['/dashboard', '/images/members/list', '/dashboard/manifest.json', '/administration/users.png'])(
      'demande toujours une session pour %s',
      async (pathname) => {
        expect(redirection(await ask(pathname))).toBe('/system/notconnected');
      },
    );
  });
});
