import { execFileSync } from "node:child_process"

// TEST-ONLY DATABASE FIXTURE. The API refuses a booking in the past and closes a flight only
// once its booking has started, so the closing journey cannot be prepared through the
// application alone. Rather than give the API a way around its own rule, the journey books
// ahead like any member and this fixture then moves that one booking into the past, straight
// in the local database. It only ever runs against the Postgres container of the local stack.
const CONTAINER = process.env.E2E_DB_CONTAINER ?? "backend-db-1"

function sql(statement: string): string {
  try {
    // The container knows its own user and database: no credential lives in the tests.
    return execFileSync(
      "docker",
      ["exec", "-i", CONTAINER, "sh", "-c", 'psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
      { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim()
  } catch (error) {
    const detail = (error as { stderr?: string }).stderr || (error as Error).message
    throw new Error(
      `The database fixture could not reach Postgres in the container "${CONTAINER}" ` +
        `(set E2E_DB_CONTAINER to the container of the stack under test): ${detail}`,
    )
  }
}

/**
 * Moves the booking with this purpose to a one-hour slot that is over, as if it had been booked
 * then: the latest hour, at least a day ago, during which neither its aircraft nor its pilot has
 * another booking. A day of margin, because the API stores times without a zone.
 */
export function moveBookingIntoThePast(purpose: string) {
  if (!/^[\w ]+$/.test(purpose)) throw new Error(`Unexpected booking purpose: ${purpose}`)

  const moved = sql(`
    WITH booking AS (
      SELECT id, "aircraftId", "userId" FROM reservations WHERE purpose = '${purpose}'
    ),
    slot AS (
      SELECT hour AS start
      FROM booking,
        generate_series(
          date_trunc('hour', now()::timestamp) - interval '26 hours',
          now()::timestamp - interval '120 days',
          interval '-1 hour'
        ) AS hour
      WHERE NOT EXISTS (
        SELECT 1 FROM reservations other
        WHERE other.id <> booking.id
          AND (other."aircraftId" = booking."aircraftId" OR other."userId" = booking."userId")
          AND other.start_time < hour + interval '1 hour'
          AND other.end_time > hour
      )
      ORDER BY hour DESC
      LIMIT 1
    )
    UPDATE reservations
    SET start_time = slot.start, end_time = slot.start + interval '1 hour', reservation_date = slot.start
    FROM booking, slot
    WHERE reservations.id = booking.id
    RETURNING reservations.id;
  `)
  // psql prints the returned id, then the command tag.
  if (!/^\d+$/m.test(moved)) throw new Error(`No booking "${purpose}" was moved into the past: ${moved || "no row"}`)
}
