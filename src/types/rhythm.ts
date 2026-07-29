/**
 * Routines: the standing obligations of a role, as opposed to its rocks.
 *
 * A rock gets done. A routine never does — checking the cash position is
 * surveillance, and the value is in noticing when something is off rather than
 * in having performed the check. That difference drives the whole design.
 *
 * There is deliberately no backlog. One row per routine, carrying the date it
 * last actually happened, which is permanent truth and never reset. Missing a
 * day does not create an item to clear; it widens a gap. A board that quietly
 * forgives a four day gap would be calmest exactly when something has gone
 * wrong, which is the opposite of what surveillance is for.
 */

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/** How many days should pass between one occurrence and the next. */
export const CADENCE_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 91,
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

/**
 * How far past due before a routine stops shouting and drops to the bottom of
 * the screen. Chip's number. It removes the noise without removing the fact.
 */
export const QUIET_AFTER_DAYS = 4;

export type Outcome = 'clean' | 'attention';

export interface Routine {
  id: string;
  title: string;
  cadence: Cadence;
  /** Optional link to one of the twelve role cards. */
  roleId: string | null;
  /** ISO yyyy-mm-dd, or null if it has never been done. */
  lastDoneOn: string | null;
  lastOutcome: Outcome | null;
  order: number;
  active: boolean;
}

/**
 * One completion. Every occurrence is recorded, clean or not, because "how many
 * days did I actually look at cash" is a question worth being able to answer.
 * Only the ones that found something are shown by default.
 */
export interface Finding {
  id: string;
  routineId: string;
  /** Copied in so the log still reads if the routine is later renamed or removed. */
  routineTitle: string;
  on: string;
  outcome: Outcome;
  note: string;
}

export type RoutineState = 'ok' | 'due' | 'quiet';

const MS_DAY = 86400000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_DAY);
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso) + n * MS_DAY).toISOString().slice(0, 10);
}

/** Days since it last happened. Null means it never has. */
export function daysSince(r: Routine, today: string): number | null {
  return r.lastDoneOn ? daysBetween(r.lastDoneOn, today) : null;
}

/** When it next falls due. A routine never done is due now. */
export function nextDue(r: Routine, today: string): string {
  if (!r.lastDoneOn) return today;
  return addDays(r.lastDoneOn, CADENCE_DAYS[r.cadence]);
}

export function stateOf(r: Routine, today: string): RoutineState {
  const gap = daysSince(r, today);
  const every = CADENCE_DAYS[r.cadence];
  if (gap === null) return 'due';
  if (gap < every) return 'ok';
  return gap >= every + QUIET_AFTER_DAYS ? 'quiet' : 'due';
}

/** The sentence a person should read, rather than a colour they must decode. */
export function sinceLabel(r: Routine, today: string): string {
  const gap = daysSince(r, today);
  if (gap === null) return 'never done';
  if (gap === 0) return 'today';
  if (gap === 1) return 'yesterday';
  return `${gap} days ago`;
}
