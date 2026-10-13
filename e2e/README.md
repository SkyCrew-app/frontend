# Browser journeys

End-to-end tests that replay the main journeys of SkyCrew in a real browser (Playwright, headless Chromium), against a running stack: this frontend, the API and a database holding the demo data set.

## Running them

```bash
npm ci --legacy-peer-deps
npx playwright install chromium   # once per machine

npm run e2e                       # the whole suite
npx playwright test 06-           # one journey
npm run e2e:report                # open the HTML report of the last run
```

The suite does not start anything. It expects:

- the frontend on `http://localhost:5173` (override with `E2E_BASE_URL`), talking to the API;
- the API with the **demo data set** (`npm run seed:demo` in the backend) and **writes enabled**;
- the three demo accounts — administrator `demo@skycrew.fr`, pilot `jean.dupont@skycrew.fr`, instructor `marie.laurent@skycrew.fr` — with the shared demo password (override with `E2E_DEMO_PASSWORD`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:5173` | Frontend under test |
| `E2E_DEMO_PASSWORD` | the demo seeder's password | Password of the three accounts |
| `E2E_ALLOWED_HOSTS` | — | Extra hosts of the stack (comma-separated), e.g. the API when it is not on `localhost` |
| `E2E_DB_CONTAINER` | `backend-db-1` | Docker container of the stack's PostgreSQL, used by the one database fixture (see below) |

## How the suite is built

- `auth.setup.ts` signs each role in once and saves the session in `e2e/.auth/`; journeys start already signed in. A saved session is reused by the next run while it is valid, because the API allows only 10 sign-in attempts a minute per address. Delete `e2e/.auth/` to force new sign-ins.
- One worker, no parallelism: every journey writes to the same database.
- The interface is forced to French (`localStorage["skycrew-language"] = "fr"`); elements are found by role and visible name, as a member would.
- **Third parties are never reached.** Any request outside the stack (Mapbox, OpenWeather, Stripe, PayPal, openAIP) is refused by `support/test.ts`. The airport picker of the flight plan is answered by a small stub (`support/airports.ts`) in openAIP's format; the frontend still needs `NEXT_PUBLIC_OPENAIP_API_KEY` set to any value, or it does not query at all.
- **One database fixture, for tests only.** The API refuses a booking in the past and closes a flight only once its booking has started; a member can therefore never prepare "a flight to close" through the application, and the API is not given a way around its own rule. `06-pilot-flight` books ahead like any member, then `support/database.ts` moves that single booking (found by its unique purpose) to a free one-hour slot at least a day in the past, with `docker exec <container> psql` inside the PostgreSQL container of the stack, using the container's own `POSTGRES_USER` / `POSTGRES_DB`. It needs `docker` on the machine that runs the suite and must only ever point at a test database.
- Each journey creates what it needs under a unique name (`E2E <timestamp>`) and removes it at the end; an `afterEach` removes it too when the journey stops halfway.

| File | Journey |
| --- | --- |
| `01-auth` | Sign-in, sign-out, wrong password, a pilot is kept out of the administration |
| `02-admin-aircraft` | Create an aircraft in three steps, edit it, delete it |
| `03-admin-maintenance` | Plan a maintenance, find it in the list, delete it |
| `04-admin-member` | Add a member (a pilot by default), find them with the search, deactivate and reactivate the account, delete it; a member with history cannot be deleted |
| `05-admin-article` | Publish an article, read it in the news, delete it |
| `06-pilot-flight` | Book a free cell of the calendar, generate the flight plan LFPG → LFPO, check that the flight cannot be closed before the slot starts, cancel the reservation. Then book and plan again, have the booking start (database fixture, see below), close the flight in three steps and find it in the logbook. Last, a cancellation gives the price back |
| `07-pilot-checklist` | Start a checklist, tick every item, complete it |
| `08-pilot-evaluation` | Take an assessment up to the result screen |
| `09-instructor-session` | Schedule a course, see it in the list, delete it |
| `10-admin-settings` | Change the club's contact phone, restore it |
| `11-language` | Switch to English from the top bar, check labels and a date, switch back |
| `12-smoke` | Every main page loads for the administrator: no error screen, no raw translation key, no console error |

## What a run leaves in the database

The application offers no deletion for these, so each run adds:

- one open flight plan LFPG → LFPO of the pilot, whose reservation is cancelled at the end (the aircraft `F-EEEE` is kept);
- one closed flight of 25 minutes in the pilot's logbook, on a one-hour booking of `F-EEEE` in the past (a closed flight and its booking cannot be removed): the pilot's and the aircraft's total hours grow by 25 minutes per run, and each run takes the latest free past hour, so runs never collide;
- the aircraft `F-EMNT`, kept for the maintenance journey;
- one completed checklist "Visite pré-vol Robin DR400" for the pilot;
- one failed attempt (0 %) at an assessment for the pilot;
- what the API records along the way: notifications, e-mails, and the payments of the two reservations.

The pilot's balance drops by one cent per run: the price of the booking whose flight is closed. Re-seed the demo data to start clean.

## Rules of the API the journeys depend on

- A booking needs a licence valid on the day of the flight. The demo pilot's licence expires 365 days after the data is seeded, and `support/calendar.ts` books two to four months ahead: on demo data older than about seven months, `06-pilot-flight` is refused with "Vous n'avez pas de licence valide". Re-seed.
- A booking cannot start in the past, must fit in the club's opening hours and cannot be changed or cancelled by the pilot once it has started; the journeys only book future days, at 08:00 and 10:00.
- A flight is closed only once its booking has started: hence the database fixture above.
- Cancelling refunds exactly what was charged for the booking, shown as "Prix payé" in its detail panel.

## Reading a failure

- The terminal shows the failed step, the locator it was waiting for and the call log. With `retries: 1`, a test that passes on its second attempt is reported as *flaky*: treat it as a defect to investigate, not as a pass.
- `npm run e2e:report` opens the HTML report: each failed attempt has a screenshot and a **trace** (timeline, DOM snapshot before and after each action, console, network). A trace can also be opened directly: `npx playwright show-trace e2e/.results/<test>/trace.zip`.
- `e2e/.results/<test>/error-context.md` holds the accessibility snapshot of the page at the moment of the failure: the quickest way to see which role or name changed.
- A sign-in failing with "Identifiants incorrects" right after several runs is usually the API's rate limit: wait a minute.
- A journey that stopped halfway cleans up in `afterEach`. If that cleanup failed too, look for `E2E …` names (aircraft `F-E…`, maintenance on F-GPIL, article, course with Emma Girard) and delete them by hand.

## Running in CI (not set up yet)

The API lives in another, private repository, so there is no workflow for now. A CI job would need:

0. **Access to the database container** for the fixture of `06-pilot-flight`: `docker` available to the job and `E2E_DB_CONTAINER` set to the PostgreSQL container.
1. **The API image** (`ghcr.io` package of the backend) and a token allowed to pull it, plus PostgreSQL and whatever the API requires to boot (Redis, an SMTP sink such as MailHog); the simplest is the Docker Compose kit of `backend/deploy`.
2. **The demo data**: run the migrations and the demo seeder on a fresh database for every job, with writes enabled. A fresh database also removes the residue listed above.
3. **The frontend built** (`npm run build && npm start`, or its Docker image) and reachable under the same host as the API — the session cookie is shared, as locally or behind the Caddy of the kit — with `NEXT_PUBLIC_API_URL` pointing at the API and a placeholder `NEXT_PUBLIC_OPENAIP_API_KEY`. A production build is also faster and steadier than `next dev`.
4. `npx playwright install --with-deps chromium`, then `npm run e2e` with `E2E_BASE_URL` (and `E2E_ALLOWED_HOSTS` if the API is not on `localhost`) and `CI=1`.
5. Uploading `e2e/.report/` and `e2e/.results/` as artifacts when the job fails.
6. The API's sign-in rate limit left as is: a run signs in five times.

No secret of a third party is needed: the suite blocks them all.
