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
  let suspended: boolean;
  // An API older than the suspension rejects any question about it.
  let knowsSuspension: boolean;
  const fetchMock = jest.fn();
  const askedQueries = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).query as string);

  beforeEach(() => {
    maintenance = false;
    suspended = false;
    knowsSuspension = true;
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const { query } = JSON.parse(init.body) as { query: string };
      if (query.includes('serviceSuspended')) {
        if (!knowsSuspension) {
          return { json: async () => ({ errors: [{ message: 'Cannot query field "serviceSuspended" on type "Query".' }] }) };
        }
        return { json: async () => ({ data: { getSiteStatus: maintenance, serviceSuspended: suspended } }) };
      }
      return { json: async () => ({ data: { getSiteStatus: maintenance } }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('installation suspendue', () => {
    const pilot = tokenFor('Pilote', 3600);

    it('pose les deux questions en une seule demande', async () => {
      await ask('/dashboard', { token: pilot });
      expect(askedQueries()).toEqual(['query GetSiteStatus { getSiteStatus serviceSuspended }']);
    });

    it.each([
      ['une page protégée', '/dashboard', { token: pilot }],
      ['la page de connexion', '/', {}],
      ['une page sans session', '/reservations', {}],
      ['la page de maintenance', '/system/maintenance', {}],
    ])('renvoie vers la page « service suspendu » : %s', async (_case, pathname, options) => {
      suspended = true;
      expect(redirection(await ask(pathname, options))).toBe('/system/suspended');
    });

    it("l'emporte sur la maintenance", async () => {
      suspended = true;
      maintenance = true;
      expect(redirection(await ask('/dashboard', { token: pilot }))).toBe('/system/suspended');
    });

    it('sert la page « service suspendu » elle-même, sans boucle, avec la politique de sécurité', async () => {
      suspended = true;
      const response = await ask('/system/suspended');
      expect(isServed(response)).toBe(true);
      expect(redirection(response)).toBeNull();
      expect(response.headers.get('content-security-policy')).toContain("script-src 'self' 'nonce-");
    });

    it('sert les fichiers publics sans interroger l’API', async () => {
      suspended = true;
      expect(isServed(await ask('/manifest.json'))).toBe(true);
      expect(isServed(await ask('/_next/static/chunks/main.js'))).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('renvoie à l’accueil depuis la page « service suspendu » une fois le service rétabli', async () => {
      expect(redirection(await ask('/system/suspended'))).toBe('/');
    });

    it('garde la maintenance quand le service n’est pas suspendu', async () => {
      maintenance = true;
      expect(redirection(await ask('/dashboard', { token: pilot }))).toBe('/system/maintenance');
    });

    describe('API antérieure à la suspension', () => {
      beforeEach(() => {
        knowsSuspension = false;
      });

      it("repose l'ancienne question une fois et laisse naviguer", async () => {
        const response = await ask('/dashboard', { token: pilot });
        expect(isServed(response)).toBe(true);
        expect(redirection(response)).toBeNull();
        expect(askedQueries()).toEqual([
          'query GetSiteStatus { getSiteStatus serviceSuspended }',
          'query GetSiteStatus { getSiteStatus }',
        ]);
      });

      it('garde la maintenance', async () => {
        maintenance = true;
        expect(redirection(await ask('/dashboard', { token: pilot }))).toBe('/system/maintenance');
      });

      it("garde les contrôles de session", async () => {
        expect(redirection(await ask('/dashboard'))).toBe('/system/notconnected');
      });
    });

    it("affiche la page « site indisponible » quand l'API ne répond pas", async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const response = await ask('/dashboard', { token: pilot });
      consoleError.mockRestore();
      expect(response.headers.get('x-middleware-rewrite')).toBe('http://club.example/system/sitedown');
      expect(redirection(response)).toBeNull();
    });
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
