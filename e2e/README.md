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
- the four demo accounts of `support/accounts.ts` — administrator `demo@skycrew.fr`, pilot `jean.dupont@skycrew.fr`, instructor `marie.laurent@skycrew.fr`, student `emma.girard@skycrew.fr` (a member without a valid licence, who only flies with an instructor) — with the shared demo password (override with `E2E_DEMO_PASSWORD`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:5173` | Frontend under test |
| `E2E_DEMO_PASSWORD` | the demo seeder's password | Password of the four accounts |
| `E2E_ALLOWED_HOSTS` | — | Extra hosts of the stack (comma-separated), e.g. the API when it is not on `localhost` |
| `E2E_DB_CONTAINER` | `backend-db-1` | Docker container of the stack's PostgreSQL, used by the one database fixture (see below) |
| `E2E_DOCKER` | `/usr/local/bin/docker` | Full path of the `docker` command used by that fixture |
| `E2E_SLOW` | `1` | Stretches every delay of the suite at once on a loaded machine (`E2E_SLOW=2` doubles them) |
| `CI` | — | When set, a journey that only passes on its second attempt fails the run (see "Slow servers and flaky journeys") |
| `SKYCREW_PLAN` | — | Plan of the API under test, also read by `stack.sh`, which passes it on with `SKYCREW_MAX_AIRCRAFT` / `SKYCREW_MAX_MEMBERS`. With `club` (no instruction), the booking form of `06-pilot-flight` is expected without an instructor field; the journeys about instruction (`08`, `09-*`, `15`, `18`, and the instruction pages of `12-smoke`) do not apply |

### Against a production build (faster, and what members really get)

A development server compiles each page on demand and serves unoptimised code; the same suite takes about 2 minutes against a production build instead of 4 to 10. A production build also runs what a development server leaves out: the service worker, the link prefetching and the scripts as they are shipped.

The quickest way is the throwaway stack below. To point the suite at a production build of this frontend talking to the API you already run on port 3000 instead, stop the development server (the local API only accepts the frontend on port 5173) and:

```bash
npm run build
cp -R .next/static .next/standalone/.next/static && cp -R public .next/standalone/public
PORT=5173 HOSTNAME=127.0.0.1 node .next/standalone/server.js   # in another terminal, then: npm run e2e
```

`HOSTNAME` matters: the shell sets it to the name of the machine, and the server would listen on that address only. Addresses read by the browser (`NEXT_PUBLIC_*`, from `.env`) are fixed by `npm run build`.

### A throwaway stack, apart from the development one

`e2e/support/stack.sh` starts everything the journeys need on ports of its own, without touching the development stack or its database: PostgreSQL, Redis and a mail sink in Docker, the API built from a checkout of the backend (schema from the migrations, fresh demo data, writes enabled) and this frontend as a production build. It is what the continuous integration runs.

```bash
BACKEND_DIR=../backend e2e/support/stack.sh up    # about 30 s once both projects have been built, a few minutes the first time
eval "$(e2e/support/stack.sh env)"                # E2E_BASE_URL, E2E_DB_CONTAINER, E2E_DOCKER
npm run e2e
e2e/support/stack.sh logs                         # end of the logs of the API and of the frontend
e2e/support/stack.sh down
```

Both checkouts need their dependencies installed. Ports and other settings are listed at the top of the script; its logs are in `e2e/.stack/`. Each `up` starts from an empty database, so nothing of "What a run leaves in the database" accumulates there.

## How the suite is built

- `auth.setup.ts` signs each role in once and saves the session in `e2e/.auth/`; journeys start already signed in. A saved session is reused by the next run while it is valid, because the API allows only 10 sign-in attempts a minute per address. Delete `e2e/.auth/` to force new sign-ins.
- `support/warm-up.ts` runs first, once (Playwright's global setup): it asks the frontend for every page of `src/app` over plain HTTP, waiting up to three minutes for each. A development server has then compiled every page before the first journey; against a production build this takes a second. A frontend that is down, or a page that cannot be served, stops the run there with the address in the message. The protected pages need a session: the administrator's saved one is reused, or the warm-up signs in once and saves it for `auth.setup.ts`.
- One worker, no parallelism: every journey writes to the same database.
- The interface is forced to French (`localStorage["skycrew-language"] = "fr"`); elements are found by role and visible name, as a member would.
- **Third parties are never reached.** Any request outside the stack (the OpenFreeMap base map, Stripe, PayPal…) is refused by `support/test.ts`. The flight preparation searches aerodromes and points in the API's own navigation data (`navSearch`), so the stack must have imported them (at least the OurAirports aerodromes LFPG and LFPO used by `06-pilot-flight`); without its tiles the map stays blank, which is not an error of the page.
- **The weather of the dashboard is answered by the suite** (`support/weather.ts`). The API asks a provider for it when it has a key (`API_NINJAS_KEY`), and a request made by the API cannot be refused from the browser: the three queries concerned (`AerodromeByIcao`, `AerodromeByIata`, `WeatherAt`) are answered in the browser instead, every other query reaches the API. A stack that has a key (a developer's own) spends no quota, and the dashboard shows the same conditions everywhere. `12-smoke` also answers as an API *without* a key does ("nothing found") and checks that the card then says "Météo indisponible" quietly, with no failed-load screen and no console error.
- **The Content-Security-Policy is part of every journey.** `12-smoke` and `01-auth` verify that each page is served with an enforced policy tying scripts to a nonce. Beyond that, whatever the browser refuses under the policy while a journey runs — on any screen, in any window the journey opens, a form, a dialog or a download — fails that journey when it ends (`prepareContext` in `support/test.ts` collects the refusals, the `context` fixture and `asRole` check them). A refusal counts even about a third party: the browser applies the policy before the suite refuses the request.
- **Signing out is checked for good.** After a sign-out `01-auth` waits for the network to settle, then checks that the session cookie is gone, that a protected page is refused and that no answer of the frontend wrote the session cookie (it belongs to the API alone); it does so several times in a row from the saved session, each time as soon as the page shows. Only a production build prefetches the links of the menu, and it was the answers to those prefetches that used to bring the session back.
- **One database fixture, for tests only.** The API refuses a booking in the past and closes a flight only once its booking has started; a member can therefore never prepare "a flight to close" through the application, and the API is not given a way around its own rule. `06-pilot-flight` books ahead like any member, then `support/database.ts` moves that single booking (found by its unique purpose) to a free one-hour slot at least a day in the past, with `docker exec <container> psql` inside the PostgreSQL container of the stack, using the container's own `POSTGRES_USER` / `POSTGRES_DB`. It needs `docker` on the machine that runs the suite and must only ever point at a test database.
- Each journey creates what it needs under a unique name (`E2E <timestamp>`) and removes it at the end; an `afterEach` removes it too when the journey stops halfway.

| File | Journey |
| --- | --- |
| `01-auth` | Sign-in, sign-out (the session cookie is gone and stays gone, three sign-outs in a row while the links are still prefetching), a signed-in member stays signed in while navigating with an untouched cookie, wrong password, the pages open without a session respect the Content-Security-Policy, a pilot is kept out of the administration, an instructor only reaches the checklist templates |
| `02-admin-aircraft` | Create an aircraft in three steps, edit it, delete it |
| `03-admin-maintenance` | Plan a maintenance, find it in the list, delete it |
| `04-admin-member` | Add a member (a pilot by default), find them with the search, deactivate the account (the dialog says there is no upcoming booking) and reactivate it, delete it; a member with history cannot be deleted |
| `05-admin-article` | Publish an article, read it in the news, delete it |
| `06-pilot-flight` | Book a free cell of the calendar, prepare the flight plan LFPG → LFPO in the builder (a point typed as coordinates, results computed live by the API, plan saved), check that the flight cannot be closed before the slot starts, cancel the reservation. Then book and plan again, have the booking start (database fixture, see below), close the flight in three steps and find it in the logbook, as pilot in command. Last, a cancellation gives the price back |
| `07-pilot-checklist` | Start a checklist, tick every item, complete it |
| `08-pilot-evaluation` | Take an assessment up to the result screen |
| `09-instruction-flight` | The student, who has no valid licence, cannot book without an instructor; she books with one, the booking shows the instructor, the instructor finds it under "Comme instructeur" and declines it, the slot is free again |
| `09-instructor-session` | Schedule a course, see it in the list, open it and find the aircraft booking pre-filled for the student, delete the course |
| `10-admin-settings` | Change the club's contact phone, restore it |
| `11-language` | Switch to English from the top bar, check labels and a date, switch back |
| `12-smoke` | Every main page loads for the administrator: enforced Content-Security-Policy, no error screen, no raw translation key, no console error. The finance tabs, the export dialog and the detail of an incident open without an error. The dashboard stays quiet when the club has no weather provider. Without a session, every file of `public/` and the site icon are served, while pages still ask for a session |
| `13-admin-account` | The administrator credits then debits a member's account (the form refuses an entry without amount or reason), the balance follows, both entries are in the action log with their author, amount, means and reason |
| `14-pilot-documents` | The pilot downloads one of his invoices and exports his logbook: both files are real PDFs |
| `15-admin-departure` | The student books with an instructor; the administrator deactivates her account and asks for her upcoming bookings to be cancelled: she is refunded what she paid, the slot is free again, she can no longer sign in, the action log keeps the deactivation with its cancellations and refund; the account is reactivated. Deactivating closes the member's sessions: the journey ends by signing her in again and saving the new session |
| `16-member-licence` | The pilot adds a licence with its issue date from his profile: it is shown waiting for an administrator. The administrator finds it among the licences to validate on the members page, opens the pilot's sheet on his licences and validates it; the pilot then sees it valid. The administrator deletes it at the end |
| `17-member-incident` | From the fleet, the detail of `F-EEEE` opens the incident report on that aircraft. From the incidents page, the pilot reports a low-severity incident on `F-EEEE` without a flight (the form first refuses an empty report) and finds it open; the administrator resolves it with a note |
| `19-login-journal` | An address nobody has and a wrong password for the pilot are refused, then the pilot signs in: his profile (Sécurité) lists the wrong password and the sign-in, the administrator finds the unknown address in the sign-in log filtered on « Compte inconnu », the pilot's lines with device and IP filtered on his account and the last 24 hours, his last sign-in on his sheet with a link to his lines, and on a phone one card per sign-in without horizontal scroll |

## What a run leaves in the database

The application offers no deletion for these, so each run adds:

- one open flight plan LFPG → LFPO of the pilot, whose reservation is cancelled at the end (the aircraft `F-EEEE` is kept);
- one closed flight of 25 minutes in the pilot's logbook, on a one-hour booking of `F-EEEE` in the past (a closed flight and its booking cannot be removed): the pilot's and the aircraft's total hours grow by 25 minutes per run, and each run takes the latest free past hour, so runs never collide;
- the aircraft `F-EMNT`, kept for the maintenance journey;
- one completed checklist "Visite pré-vol Robin DR400" for the pilot;
- one failed attempt (0 %) at an assessment for the pilot;
- one resolved incident of low severity on `F-EEEE`, reported by the pilot without a flight (`17-member-incident`; the application offers no deletion of an incident);
- two lines in the account history of Antoine Roux (a credit and a debit of one cent, `13-admin-account`): his balance ends where it started;
- two cancelled bookings of `F-EEEE` for the student, each with its payment and its refund (`09-instruction-flight` at 14:00, `15-admin-departure` at 16:00): her balance ends where it started. The **first** run on a data set also cancels and refunds the upcoming booking the demo data gives her (`F-GAER`), because the departure cancels every upcoming booking of the member;
- lines in the administrators' action log, which nothing deletes: the two manual entries, the changes of the club's phone (`10-admin-settings`), the deactivations, reactivations and deletion of members (`04`, `15`), the aircraft deleted by `02`, the validation of the pilot's test licence (`16`), the change of status of the test incident (`17`);
- lines in the sign-in log, which nothing deletes before six months: every sign-in of the suite, and the three attempts of `19-login-journal`;
- what the API records along the way: notifications, e-mails, invoices, and the payments of the reservations.

The pilot's balance drops by one cent per run: the price of the booking whose flight is closed. Re-seed the demo data to start clean.

## Rules of the API the journeys depend on

- A booking needs a licence valid on the day of the flight. The demo pilot's licence expires 365 days after the data is seeded, and `support/calendar.ts` books two to four months ahead: on demo data older than about seven months, `06-pilot-flight` is refused with "Vous n'avez pas de licence valide". Re-seed.
- A booking cannot start in the past, must fit in the club's opening hours and cannot be changed or cancelled by the pilot once it has started; the journeys only book future days, at 08:00 and 10:00.
- A flight is closed only once its booking has started: hence the database fixture above.
- Cancelling refunds exactly what was charged for the booking, shown as "Prix payé" in its detail panel.

## Slow servers and flaky journeys

- Three delays, on purpose different (`playwright.config.ts`): an assertion or an action gives up after 15 s, so a real defect shows quickly; loading a page (`page.goto`) may take 60 s; a whole journey 2 minutes. `E2E_SLOW=2` doubles them all on a machine that is busy with something else.
- What made journeys fail on a slow development server was the first compilation of a page, sometimes more than 15 s under load. The warm-up above takes that cost before the journeys, with patience, and `next.config.mjs` tells the development server to keep its compiled pages for an hour (`onDemandEntries`) instead of dropping them after a minute.
- With `retries: 1`, a test that passes on its second attempt is reported as *flaky*. Locally the run still ends with status 0, the flaky test listed apart: treat it as a defect to investigate, not as a pass. With `CI` set (the workflow sets it), a flaky test fails the run.
- The development server shows a badge at the bottom left when a page logged an error ("1 Issue"); it covers the sign-out button and a click on it then fails with `<nextjs-portal> … intercepts pointer events`. The cause is the logged error, not the button: open the trace, or run against a production build.

## Reading a failure

- The terminal shows the failed step, the locator it was waiting for and the call log.
- `npm run e2e:report` opens the HTML report: each failed attempt has a screenshot and a **trace** (timeline, DOM snapshot before and after each action, console, network). A trace can also be opened directly: `npx playwright show-trace e2e/.results/<test>/trace.zip`.
- `e2e/.results/<test>/error-context.md` holds the accessibility snapshot of the page at the moment of the failure: the quickest way to see which role or name changed.
- A sign-in failing with "Identifiants incorrects" right after several runs is usually the API's rate limit: wait a minute.
- A journey that stopped halfway cleans up in `afterEach`. If that cleanup failed too, look for `E2E …` names (aircraft `F-E…`, maintenance on F-GPIL, article, course with Emma Girard) and delete them by hand.

## Running in CI

`.github/workflows/e2e.yml` ("Browser journeys") runs the whole suite on every pull request to `main` — the promotion of `dev` — and by hand from the Actions tab ("Run workflow", with an optional branch or tag of the backend). It does not run on pull requests to `dev`, and it is not a required check: a red run is to be read, not a lock.

What it does:

1. Checks out this repository and the backend (`SkyCrew-app/backend`): its `main` for a pull request to `main`; by hand, the branch the run is on when that is `main` or `dev`, otherwise `dev`, or the branch or tag typed in.
2. Installs both projects and Chromium, then runs `e2e/support/stack.sh up`: PostgreSQL, Redis and a mail sink in Docker, the API with the schema built by its migrations and a fresh demo data set (`--demo --fresh`, `DEMO_MODE=false`), this frontend as a production build.
3. Runs the suite with `CI` set. The database fixture of `06-pilot-flight` reaches PostgreSQL in the container `skycrew-e2e-db`, which the script names itself.
4. On failure, shows the end of the logs of the API and of the frontend and uploads the artifact `browser-journeys-report` (kept 7 days): the HTML report with a screenshot and a trace per failed attempt (`e2e/.report/`, `e2e/.results/`) and the logs of the stack.

About ten to fifteen minutes in all, most of it installing; the job is cut at 30.

- **No secret is needed while the backend repository is public.** If it becomes private, add a repository secret `BACKEND_REPO_TOKEN` (a fine-grained token with read access to the contents of the backend). When the backend cannot be read, the job ends green with the notice "Browser journeys skipped" instead of failing.
- No key of a third party is needed: the suite blocks them all and answers the weather itself (the stack has no weather key, so the API would answer "nothing found" anyway).
- The API runs in the `Europe/Paris` time zone there (`TZ`), like the machines the journeys were written on: bookings are made at local hours of the club.
- The API's sign-in rate limit (10 attempts a minute per address) is left as is: a run signs in eight times — the four accounts, one sign-in and one wrong password in `01-auth`, then, minutes later in `15-admin-departure`, one refused sign-in of the deactivated member and her sign-in once reactivated.
