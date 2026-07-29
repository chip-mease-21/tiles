/**
 * Routines: the standing obligations of a role, as opposed to its rocks.
 *
 * A rock gets done. A routine never does — checking the cash position is
 * surveillance, and the value is in noticing when something is off rather than
 * in having performed the check.
 *
 * Occurrences are anchored to real days rather than floating N days from
 * whenever you last got to it. "Expenses on Mondays" is a commitment you can
 * plan around; "expenses every 7 days" drifts until it means nothing.
 *
 * There is no backlog. One row per routine carrying the date it last actually
 * happened, which is permanent truth and never reset. Missing a day does not
 * create an item to clear; it widens a gap.
 */

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Days past due before a routine stops shouting and drops to the bottom. Chip's number. */
export const QUIET_AFTER_DAYS = 4;

export type Outcome = 'clean' | 'attention';

export interface Routine {
  id: string;
  title: string;
  cadence: Cadence;
  /**
   * Which day it lands on. Weekday 0-6 for weekly, day of month 1-28 for
   * monthly and quarterly, null for daily. Capped at 28 so a routine never
   * silently skips February.
   */
  anchor: number | null;
  roleId: string | null;
  link: string | null;
  lastDoneOn: string | null;
  lastOutcome: Outcome | null;
  /** What you saw last time, so the row says something useful at a glance. */
  lastNote: string;
  /**
   * Roughly how long it takes. Not for precision — for seeing that Monday is
   * two hours of routine work before Monday arrives.
   */
  minutes: number | null;
  /**
   * One-off moves, keyed by the day it should have happened, valued by the day
   * it will instead. A busy Monday can push the expense check to Tuesday without
   * touching the cadence, because the cadence is the commitment and the calendar
   * is the week you are actually having.
   */
  shifts: Record<string, string>;
  /**
   * Which occurrences have actually been logged, keyed by the day the work was
   * due and valued by the day you did it.
   *
   * Keyed by occurrence rather than carried on a single `lastDoneOn`, because a
   * calendar has to know which square is finished. One date cannot answer that:
   * logging Monday's expense check on Wednesday and logging Wednesday's cash
   * check both write the same value and the grid cannot tell them apart.
   */
  done: Record<string, string>;
  order: number;
  active: boolean;
}

/**
 * Only http and https ever become a clickable link. You are the only person who
 * can write your own routines, so this guards against a paste gone wrong rather
 * than an attacker — but a field whose value becomes an href is exactly the
 * shape of thing that causes trouble later.
 */
export function safeLinkOf(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function fmtMins(total: number): string {
  if (total <= 0) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const minutesOf = (rs: Routine[]) => rs.reduce((n, r) => n + (r.minutes ?? 0), 0);

const MS_DAY = 86400000;
const at = (iso: string) => new Date(iso + 'T12:00:00');

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((at(toIso).getTime() - at(fromIso).getTime()) / MS_DAY);
}

export function addDays(iso: string, n: number): string {
  const d = at(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Where the cadence alone says it lands, before any one-off move. */
function baseOccursOn(r: Routine, iso: string): boolean {
  const d = at(iso);
  switch (r.cadence) {
    case 'daily':
      return true;
    case 'weekly':
      return d.getDay() === (r.anchor ?? 1);
    case 'monthly':
      return d.getDate() === (r.anchor ?? 1);
    case 'quarterly':
      return d.getDate() === (r.anchor ?? 1) && d.getMonth() % 3 === 0;
  }
}

/** Does this routine land on this date, one-off moves included? */
export function occursOn(r: Routine, iso: string): boolean {
  const shifts = r.shifts ?? {};
  if (shifts[iso]) return false;
  for (const to of Object.values(shifts)) if (to === iso) return true;
  return baseOccursOn(r, iso);
}

/**
 * Move one occurrence by a number of days, leaving the cadence alone.
 *
 * Moving a day that is itself already a destination rewrites the original
 * mapping rather than chaining, so a routine nudged twice ends up where you last
 * put it instead of somewhere neither of you intended. A move that lands back on
 * its own cadence day drops the override entirely.
 */
export function withShift(r: Routine, occurrence: string, days: number): Record<string, string> {
  const shifts = { ...(r.shifts ?? {}) };
  let source = occurrence;
  for (const [from, to] of Object.entries(shifts)) if (to === occurrence) source = from;
  const target = addDays(occurrence, days);
  if (target === source) delete shifts[source];
  else shifts[source] = target;
  // Keep the map from growing forever; anything long past is history nobody reads.
  const cutoff = addDays(occurrence, -120);
  for (const from of Object.keys(shifts)) if (from < cutoff) delete shifts[from];
  return shifts;
}

/**
 * The most recent day this should have happened, on or before `iso`.
 *
 * Walked day by day rather than calculated. A quarterly routine costs at most
 * about ninety iterations, which is nothing, and the alternative is arithmetic
 * that is wrong in February and nobody notices for a year.
 */
export function lastOccurrenceOnOrBefore(r: Routine, iso: string): string | null {
  for (let i = 0; i < 400; i += 1) {
    const day = addDays(iso, -i);
    if (occursOn(r, day)) return day;
  }
  return null;
}

/** The next day it lands, strictly after `iso`. */
export function nextOccurrenceAfter(r: Routine, iso: string): string | null {
  for (let i = 1; i < 400; i += 1) {
    const day = addDays(iso, i);
    if (occursOn(r, day)) return day;
  }
  return null;
}

/**
 * The day a particular occurrence was logged, or null if it is still open.
 *
 * The fallback covers routines logged before per occurrence records existed:
 * with no map at all, a `lastDoneOn` on or after the occurrence means that
 * occurrence was satisfied. Once anything has been logged the map is the only
 * authority, so un-logging one square cannot be quietly overruled by a date
 * left over from the old shape.
 */
export function doneOn(r: Routine, occurrence: string): string | null {
  const map = r.done ?? {};
  if (map[occurrence]) return map[occurrence];
  if (Object.keys(map).length > 0) return null;
  return r.lastDoneOn && occurrence <= r.lastDoneOn ? r.lastDoneOn : null;
}

export const isDone = (r: Routine, occurrence: string) => doneOn(r, occurrence) !== null;

/** Record one occurrence as logged, pruning anything too old to be read again. */
export function withDone(r: Routine, occurrence: string, on: string): Record<string, string> {
  const done = { ...(r.done ?? {}), [occurrence]: on };
  const cutoff = addDays(on, -120);
  for (const key of Object.keys(done)) if (key < cutoff) delete done[key];
  return done;
}

/**
 * Undo one logged occurrence.
 *
 * `lastDoneOn` is rebuilt from what is left rather than guessed at, so "done
 * three days ago" keeps telling the truth after an undo. With nothing left the
 * note goes too: it described a check that no longer happened.
 */
export function withoutDone(r: Routine, occurrence: string) {
  const done = { ...(r.done ?? {}) };
  delete done[occurrence];
  const dates = Object.values(done).sort();
  const lastDoneOn = dates.length ? dates[dates.length - 1] : null;
  return lastDoneOn
    ? { done, lastDoneOn }
    : { done, lastDoneOn: null, lastOutcome: null, lastNote: '' };
}

/** Overdue by how many days, or null if it is not currently due. */
export function overdueBy(r: Routine, today: string): number | null {
  const should = lastOccurrenceOnOrBefore(r, today);
  if (!should) return null;
  if (isDone(r, should)) return null;
  return daysBetween(should, today);
}

export type RoutineState = 'ok' | 'due' | 'quiet';

export function stateOf(r: Routine, today: string): RoutineState {
  const late = overdueBy(r, today);
  if (late === null) return 'ok';
  return late >= QUIET_AFTER_DAYS ? 'quiet' : 'due';
}

export function sinceLabel(r: Routine, today: string): string {
  // Fall back to the completion map so a row can never read "never done" while
  // sitting next to a logged occurrence.
  const dates = Object.values(r.done ?? {}).sort();
  const last = r.lastDoneOn ?? (dates.length ? dates[dates.length - 1] : null);
  if (!last) return 'never done';
  const gap = daysBetween(last, today);
  if (gap === 0) return 'done today';
  if (gap === 1) return 'done yesterday';
  if (gap < 0) return 'logged ahead';
  return `done ${gap} days ago`;
}

export function anchorLabel(r: Routine): string {
  if (r.cadence === 'daily') return 'every day';
  if (r.cadence === 'weekly') return `${WEEKDAYS[r.anchor ?? 1]}s`;
  const n = r.anchor ?? 1;
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return r.cadence === 'monthly'
    ? `${n}${suffix} of the month`
    : `${n}${suffix} of Jan, Apr, Jul, Oct`;
}

export interface DayItemCell {
  r: Routine;
  done: boolean;
}

export interface DayCell {
  date: string;
  past: boolean;
  isToday: boolean;
  items: DayItemCell[];
  /** Minutes still outstanding that day, daily work included. */
  minutes: number;
}

/**
 * A calendar grid, aligned to weeks.
 *
 * Starts at the Sunday of the current week and runs forward, so the columns are
 * always the same weekday. Days already past this week are returned too, marked,
 * so the grid keeps its shape instead of starting mid-row.
 *
 * The longer view is a rolling month rather than the calendar month. Late in
 * July the calendar month is four empty rows of days you have already lived,
 * which is the opposite of looking ahead.
 */
export function calendarWeeks(routines: Routine[], today: string, weeks = 3): DayCell[][] {
  const start = addDays(today, -at(today).getDay());
  // Daily work is not listed in a cell — it lands in every one, which buries the
  // periodic things that actually collide, and collisions are the only reason to
  // look at a calendar. It is still real time, so it counts toward the total.
  const dailies = routines.filter((r) => r.cadence === 'daily');
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const past = date < today;
      const items = past
        ? []
        : routines
            .filter((r) => r.cadence !== 'daily' && occursOn(r, date))
            .map((r) => ({ r, done: isDone(r, date) }));
      const dailyLeft = past ? [] : dailies.filter((r) => !isDone(r, date));
      return {
        date,
        past,
        isToday: date === today,
        items,
        minutes: minutesOf(items.filter((i) => !i.done).map((i) => i.r)) + minutesOf(dailyLeft),
      };
    }),
  );
}

/** Everything currently due, however late. The only list that has to be read. */
export function dueNow(routines: Routine[], today: string) {
  return routines.filter((r) => overdueBy(r, today) !== null);
}

/**
 * Which occurrence the Today list is actually asking about.
 *
 * A Monday routine looked at on Wednesday is still Monday's occurrence. Logging
 * it against Wednesday would write a completion nothing ever reads and leave the
 * row sitting there due, which is the worst of both.
 */
export const dueOccurrence = (r: Routine, today: string) =>
  lastOccurrenceOnOrBefore(r, today) ?? today;

/** The next periodic occurrences, flattened. The phone view; a grid is unreadable there. */
export function comingUp(routines: Routine[], today: string, days = 21) {
  const out: { date: string; routine: Routine; done: boolean }[] = [];
  for (let i = 1; i <= days; i += 1) {
    const date = addDays(today, i);
    for (const r of routines) {
      if (r.cadence !== 'daily' && occursOn(r, date)) {
        out.push({ date, routine: r, done: isDone(r, date) });
      }
    }
  }
  return out;
}
