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

/** The original four. Kept only to read routines written before `repeat` existed. */
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * How often a routine comes round.
 *
 * An interval alone is not enough to place an occurrence on a calendar. "Every
 * other Tuesday" has two possible answers on any given week, so anything with an
 * interval above one carries `from`: a real date the pattern is measured from.
 * Without it the phase would drift every time the code changed, and a routine
 * that quietly moves week is worse than one that never existed.
 */
export type Repeat =
  /**
   * Days of the week, and how often the week comes round.
   *
   * Daily is not a separate idea, it is all seven days selected. Keeping it
   * separate is what produced a "daily" routine booking Fridays and Saturdays
   * for someone who works Monday to Thursday.
   */
  | { kind: 'weeks'; every: number; weekdays: number[]; from: string }
  | { kind: 'months'; every: number; day: number; from: string }
  /** Two fixed days of the month. Payroll and cash live here; nothing else fits. */
  | { kind: 'twiceMonthly'; days: [number, number] }
  /** Second Tuesday and friends. `nth` 1-4, or 5 meaning the last one. */
  | { kind: 'weekdayOfMonth'; every: number; nth: number; weekday: number; from: string };

export type RepeatKind = Repeat['kind'];

export const REPEAT_LABEL: Record<RepeatKind, string> = {
  weeks: 'Days of the week',
  months: 'Months',
  twiceMonthly: 'Twice a month',
  weekdayOfMonth: 'A weekday each month',
};

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WORK_DAYS = [1, 2, 3, 4, 5];

export const NTH_LABEL = ['First', 'Second', 'Third', 'Fourth', 'Last'];

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
  /**
   * The repeat rule. Absent on routines written before this existed, which are
   * read from `cadence` and `anchor` instead — see `repeatOf`. Nothing is
   * rewritten in place; a routine converts the first time you save it.
   */
  repeat?: Repeat;
  /**
   * The day the routine came into existence. Nothing lands before it.
   *
   * Without this, a rule applies backwards forever: add "every other Tuesday"
   * today and the routine is instantly eight days late for a Tuesday you never
   * agreed to. A gap you did not have is worse than no history at all — it
   * teaches you to ignore the late marker, which is the only thing on the page
   * that has to mean something.
   *
   * Absent on routines written before this existed. Those keep their real
   * history, which is what you want: the gap on those is a gap you actually had.
   */
  startOn?: string;
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

/** A fixed January so a legacy quarterly still means Jan, Apr, Jul and Oct. */
const QUARTER_EPOCH = '2026-01-01';

/**
 * The repeat rule for a routine, converting the old two-field shape on the fly.
 *
 * Reading rather than migrating is deliberate. A migration script that runs
 * against live data has to be right the first time; a reader can be fixed and
 * redeployed, and the original fields are still sitting there untouched.
 */
/**
 * Normalise a stored rule to the current shape.
 *
 * Three generations exist in live data now: no `repeat` at all, a `repeat` with
 * the separate `daily` kind, and a `weeks` rule carrying a single `weekday`.
 * All three are read here rather than migrated, so nothing has to be rewritten
 * under a running app and the original fields stay put if this needs undoing.
 */
function normalise(rep: Repeat | { kind: string; [k: string]: unknown }): Repeat {
  const any = rep as { kind: string; [k: string]: unknown };
  if (any.kind === 'daily') {
    return { kind: 'weeks', every: 1, weekdays: [...ALL_DAYS], from: QUARTER_EPOCH };
  }
  if (any.kind === 'weeks') {
    const days = Array.isArray(any.weekdays) && (any.weekdays as number[]).length
      ? (any.weekdays as number[])
      : [typeof any.weekday === 'number' ? (any.weekday as number) : 1];
    return {
      kind: 'weeks',
      every: typeof any.every === 'number' ? any.every : 1,
      weekdays: [...days].sort((a, b) => a - b),
      from: typeof any.from === 'string' ? any.from : QUARTER_EPOCH,
    };
  }
  return rep as Repeat;
}

export function repeatOf(r: Routine): Repeat {
  if (r.repeat) return normalise(r.repeat);
  switch (r.cadence) {
    case 'daily':
      return { kind: 'weeks', every: 1, weekdays: [...ALL_DAYS], from: QUARTER_EPOCH };
    case 'monthly':
      return { kind: 'months', every: 1, day: r.anchor ?? 1, from: QUARTER_EPOCH };
    case 'quarterly':
      return { kind: 'months', every: 3, day: r.anchor ?? 1, from: QUARTER_EPOCH };
    default:
      return { kind: 'weeks', every: 1, weekdays: [r.anchor ?? 1], from: QUARTER_EPOCH };
  }
}

/** All seven days, every week. Only this counts as daily. */
export function isDaily(r: Routine): boolean {
  const rep = repeatOf(r);
  return rep.kind === 'weeks' && rep.every === 1 && rep.weekdays.length === 7;
}

/** A bare routine carrying only a repeat rule, for previewing dates in the editor. */
export const previewOf = (repeat: Repeat): Routine => ({
  id: '', title: '', cadence: 'weekly', anchor: null, repeat,
  roleId: null, link: null, lastDoneOn: null, lastOutcome: null, lastNote: '',
  minutes: null, shifts: {}, done: {}, order: 0, active: true,
});

/**
 * Move which week or month the pattern falls on, without changing the interval.
 *
 * "Every other Tuesday" is two different schedules depending on where you start,
 * and only you know which one you meant.
 */
export function shiftPhase(rep: Repeat, steps: number): Repeat {
  if (rep.kind === 'weeks') return { ...rep, from: addDays(rep.from, 7 * steps) };
  if (rep.kind === 'months' || rep.kind === 'weekdayOfMonth') {
    const d = at(rep.from);
    // Land on the 15th first: adding a month to the 31st lands in the month
    // after next, which would silently move the phase by two.
    d.setDate(15);
    d.setMonth(d.getMonth() + steps);
    return { ...rep, from: d.toISOString().slice(0, 10) };
  }
  return rep;
}

/** The next few dates a rule produces. The editor shows these instead of explaining. */
export function nextDates(rep: Repeat, from: string, count = 3): string[] {
  const stub = previewOf(rep);
  const out: string[] = [];
  let cursor = addDays(from, -1);
  for (let i = 0; i < count; i += 1) {
    const next = nextOccurrenceAfter(stub, cursor);
    if (!next) break;
    out.push(next);
    cursor = next;
  }
  return out;
}

/** The old two-field shape, written alongside `repeat` so a rollback still reads. */
export function legacyCadence(rep: Repeat): Cadence {
  if (rep.kind === 'weeks') return rep.weekdays.length === 7 ? 'daily' : 'weekly';
  if (rep.kind === 'months' && rep.every === 3) return 'quarterly';
  return 'monthly';
}

export function legacyAnchor(rep: Repeat): number | null {
  switch (rep.kind) {
    case 'weeks': return rep.weekdays.length === 7 ? null : (rep.weekdays[0] ?? 1);
    case 'months': return rep.day;
    case 'twiceMonthly': return rep.days[0];
    case 'weekdayOfMonth': return null;
  }
}

const startOfWeek = (iso: string) => addDays(iso, -at(iso).getDay());

const weeksBetween = (fromIso: string, toIso: string) =>
  Math.round(daysBetween(startOfWeek(fromIso), startOfWeek(toIso)) / 7);

function monthsBetween(fromIso: string, toIso: string): number {
  const a = at(fromIso);
  const b = at(toIso);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Modulo that behaves for dates before the phase date, which % does not. */
const onBeat = (n: number, every: number) => every <= 1 || ((n % every) + every) % every === 0;

/** Which occurrence of its weekday this date is within its month: 1-4, or 5 for the last. */
function nthWeekdayIn(iso: string): { nth: number; isLast: boolean } {
  const d = at(iso);
  const nth = Math.floor((d.getDate() - 1) / 7) + 1;
  const next = new Date(d.getTime());
  next.setDate(d.getDate() + 7);
  return { nth, isLast: next.getMonth() !== d.getMonth() };
}

/** Where the repeat rule alone says it lands, before any one-off move. */
function baseOccursOn(r: Routine, iso: string): boolean {
  const rep = repeatOf(r);
  const d = at(iso);
  switch (rep.kind) {
    case 'weeks':
      return rep.weekdays.includes(d.getDay())
        && onBeat(weeksBetween(rep.from, iso), rep.every);
    case 'months':
      return d.getDate() === rep.day && onBeat(monthsBetween(rep.from, iso), rep.every);
    case 'twiceMonthly':
      return d.getDate() === rep.days[0] || d.getDate() === rep.days[1];
    case 'weekdayOfMonth': {
      if (d.getDay() !== rep.weekday) return false;
      const { nth, isLast } = nthWeekdayIn(iso);
      const hit = rep.nth >= 5 ? isLast : nth === rep.nth;
      return hit && onBeat(monthsBetween(rep.from, iso), rep.every);
    }
  }
}

/** Does this routine land on this date, one-off moves included? */
export function occursOn(r: Routine, iso: string): boolean {
  const shifts = r.shifts ?? {};
  if (shifts[iso]) return false;
  for (const to of Object.values(shifts)) if (to === iso) return true;
  if (r.startOn && iso < r.startOn) return false;
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

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/** Weekday sets people already have words for, so the row does not read as a list. */
export function daysLabel(weekdays: number[]): string {
  const days = [...weekdays].sort((a, b) => a - b);
  if (days.length === 0) return 'no days';
  if (sameDays(days, ALL_DAYS)) return 'every day';
  if (sameDays(days, WORK_DAYS)) return 'weekdays';
  if (sameDays(days, [0, 6])) return 'weekends';
  // A run of consecutive days is a span, which is how you would say it out loud.
  const run = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (run && days.length > 2) {
    return `${WEEKDAYS[days[0]].slice(0, 3)} to ${WEEKDAYS[days[days.length - 1]].slice(0, 3)}`;
  }
  return days.map((d) => WEEKDAYS[d].slice(0, 3)).join(', ');
}

export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  const suffix = n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/**
 * How the repeat reads on a row.
 *
 * The common intervals get their own words, because "every 3 months" is what a
 * computer calls it and "quarterly" is what you call it. Anything unusual falls
 * back to plain counting rather than being forced into a name nobody uses.
 */
export function anchorLabel(r: Routine): string {
  const rep = repeatOf(r);
  switch (rep.kind) {
    case 'weeks': {
      const days = daysLabel(rep.weekdays);
      if (rep.every <= 1) {
        // One day a week reads better pluralised: "Mondays", not "Mon".
        return rep.weekdays.length === 1
          ? `${WEEKDAYS[rep.weekdays[0]] ?? 'Monday'}s`
          : days;
      }
      if (rep.weekdays.length === 1) {
        const day = WEEKDAYS[rep.weekdays[0]] ?? 'Monday';
        return rep.every === 2 ? `every other ${day}` : `every ${rep.every} weeks on ${day}`;
      }
      return rep.every === 2 ? `${days}, every other week` : `${days}, every ${rep.every} weeks`;
    }
    case 'months': {
      const day = `${ordinal(rep.day)} of the month`;
      if (rep.every <= 1) return day;
      if (rep.every === 2) return `${ordinal(rep.day)}, every other month`;
      if (rep.every === 3) return `${ordinal(rep.day)}, quarterly`;
      if (rep.every === 6) return `${ordinal(rep.day)}, twice a year`;
      if (rep.every === 12) return `${ordinal(rep.day)}, once a year`;
      return `${ordinal(rep.day)}, every ${rep.every} months`;
    }
    case 'twiceMonthly': {
      const [a, b] = [...rep.days].sort((x, y) => x - y);
      return `${ordinal(a)} and ${ordinal(b)} of the month`;
    }
    case 'weekdayOfMonth': {
      const nth = (NTH_LABEL[Math.min(rep.nth, 5) - 1] ?? 'First').toLowerCase();
      const day = WEEKDAYS[rep.weekday] ?? 'Monday';
      if (rep.every <= 1) return `${nth} ${day} of the month`;
      if (rep.every === 3) return `${nth} ${day}, quarterly`;
      return `${nth} ${day}, every ${rep.every} months`;
    }
  }
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
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const past = date < today;
      // Daily work sits in every square like everything else. It was hidden here
      // once, on the argument that repeating it 35 times buries the periodic
      // things that collide. True, but a routine you cannot find on the calendar
      // reads as a routine that did not save, and that costs more than clutter.
      // The periodic items lead each cell so collisions still read first.
      const hits = past ? [] : routines.filter((r) => occursOn(r, date));
      const items = [...hits.filter((r) => !isDaily(r)), ...hits.filter(isDaily)]
        .map((r) => ({ r, done: isDone(r, date) }));
      return {
        date,
        past,
        isToday: date === today,
        items,
        minutes: minutesOf(items.filter((i) => !i.done).map((i) => i.r)),
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
      if (!isDaily(r) && occursOn(r, date)) {
        out.push({ date, routine: r, done: isDone(r, date) });
      }
    }
  }
  return out;
}
