/**
 * The Rhythm tab.
 *
 * The fortnight is the interface. Every routine is logged from the day it lands
 * on, so there is no separate list to keep in sync with the calendar and no
 * second place to look. Today's row carries everything currently due, however
 * late, which makes the first row the only one you have to read on a busy
 * morning.
 *
 * Private to each person. Nothing here is shared and there is no setting to
 * share it.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useOrg } from '../context/OrgContext';
import {
  deleteRoutine, logRoutine, moveOccurrence, saveRoutine, unlogOccurrence, watchRoutines,
} from '../lib/rhythm';
import { watchRoles } from '../lib/me';
import { todayIso, type Role } from '../types/me';
import {
  NTH_LABEL, REPEAT_LABEL, WEEKDAYS, anchorLabel, calendarWeeks, doneOn, dueNow, dueOccurrence,
  isDaily, legacyAnchor, legacyCadence, nextDates, overdueBy, repeatOf, shiftPhase,
  comingUp, fmtMins, minutesOf, safeLinkOf, sinceLabel, stateOf,
  type DayCell, type Outcome, type Repeat, type RepeatKind, type Routine,
} from '../types/rhythm';
import { Button } from '../dlt/ui';

const KINDS: RepeatKind[] = ['daily', 'weeks', 'months', 'twiceMonthly', 'weekdayOfMonth'];
const newId = () => `r_${Math.random().toString(36).slice(2, 10)}`;

export function Rhythm() {
  const { user } = useOrg();
  const today = todayIso();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  // The occurrence, not just the routine: moving "next Monday's check" needs to
  // know which Monday you clicked.
  const [logging, setLogging] = useState<{ r: Routine; date: string } | null>(null);
  const [editing, setEditing] = useState<Routine | null | 'new'>(null);
  const [range, setRange] = useState<'weeks' | 'month'>('month');

  useEffect(() => (user ? watchRoutines(user.uid, setRoutines) : undefined), [user]);
  useEffect(() => (user ? watchRoles(user.uid, setRoles) : undefined), [user]);

  const live = routines.filter((r) => r.active !== false);
  const quiet = live.filter((r) => stateOf(r, today) === 'quiet');
  const notQuiet = live.filter((r) => stateOf(r, today) !== 'quiet');
  const due = useMemo(() => dueNow(notQuiet, today), [notQuiet, today]);
  // The calendar carries everything, quiet included. Going quiet demotes the
  // nagging, not the routine: a monthly report you are behind on still has a
  // 1st of next month, and hiding that is how a gap becomes permanent. Only
  // Today's list, which is the part that shouts, drops them.
  const weeks = useMemo(
    () => calendarWeeks(live, today, range === 'month' ? 5 : 3),
    [live, today, range],
  );
  const upcoming = useMemo(() => comingUp(live, today, 21), [live, today]);
  const dailies = live.filter(isDaily);

  const roleName = (id: string | null) => roles.find((x) => x.id === id)?.name ?? '';

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Rhythm</h1>
        <p className="flex-1 text-sm text-stone-500">
          Standing obligations. Not things that get done, things that get watched.
        </p>
        <Button variant="plain" onClick={() => setEditing('new')}>Add a routine</Button>
      </header>

      {live.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-stone-600">
            Nothing here yet. Start with the one you are most likely to let slide.
          </p>
        </div>
      ) : (
        <>
          {/* Today, lifted out. On a busy morning this is the only thing to read. */}
          <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-stone-200 bg-gradient-to-r from-stone-100 to-white px-5 py-3.5">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">Today</h2>
              <span className="text-sm text-stone-500">{longDay(today)}</span>
              <span className="flex-1" />
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  due.length === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-900 text-white'
                }`}
              >
                {due.length === 0
                  ? 'All clear'
                  : `${due.length} to do${minutesOf(due) ? ` · ${fmtMins(minutesOf(due))}` : ''}`}
              </span>
            </div>

            {due.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-500">
                Nothing is due. Everything on your list has been looked at inside its cadence.
              </p>
            ) : (
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
                {due.map((r) => (
                  <DayItem
                    key={r.id}
                    r={r}
                    today={today}
                    role={roleName(r.roleId)}
                    onLog={() => setLogging({ r, date: dueOccurrence(r, today) })}
                    onEdit={() => setEditing(r)}
                  />
                ))}
              </ul>
            )}
          </section>

          <Calendar
            weeks={weeks}
            dailies={dailies}
            range={range}
            onRange={setRange}
            onPick={(r, date) => setLogging({ r, date })}
          />
          <ComingUp items={upcoming} dailies={dailies} onPick={(r, date) => setLogging({ r, date })} />
        </>
      )}

      {quiet.length > 0 && (
        <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-5 py-4">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
            <h2 className="text-sm font-semibold text-stone-700">Gone quiet</h2>
            <span className="text-xs text-stone-500">
              {quiet.length} more than four days past due. Deliberately not shouting.
            </span>
          </div>
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
            {quiet.map((r) => (
              <DayItem
                key={r.id}
                r={r}
                today={today}
                role={roleName(r.roleId)}
                onLog={() => setLogging({ r, date: dueOccurrence(r, today) })}
                onEdit={() => setEditing(r)}
              />
            ))}
          </ul>
        </section>
      )}

      {logging && (
        <LogDialog
          r={logging.r}
          occurrence={logging.date}
          onClose={() => setLogging(null)}
          onEdit={() => { const r = logging.r; setLogging(null); setEditing(r); }}
        />
      )}
      {editing && (
        <RoutineEditor
          existing={editing === 'new' ? null : editing}
          roles={roles}
          nextOrder={live.length}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const longDay = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

/**
 * Three weeks, aligned to weekday columns.
 *
 * A grid rather than a list because the question it answers is spatial: is next
 * Tuesday carrying three things. Fourteen stacked rows made that invisible and
 * wasted the whole width of the screen.
 */
function Calendar({
  weeks, dailies, range, onRange, onPick,
}: {
  weeks: DayCell[][];
  dailies: Routine[];
  range: 'weeks' | 'month';
  onRange: (r: 'weeks' | 'month') => void;
  onPick: (r: Routine, date: string) => void;
}) {
  // Daily work is not listed in a cell but it is real time, so it counts toward
  // the day's total. The footnote says so, rather than leaving you to wonder why
  // one item reads as forty minutes.
  const dailyMins = minutesOf(dailies);
  const check = (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0" aria-hidden>
      <path d="M2 6.4 4.6 9 10 3.2" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <section className="mt-6 hidden sm:block">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
          The weeks ahead
        </h2>
        <span className="text-xs text-stone-400">Click anything to log it</span>
        <span className="h-px flex-1 bg-stone-200" />
        <div className="flex overflow-hidden rounded-lg border border-stone-300">
          {(['weeks', 'month'] as const).map((k) => (
            <button
              key={k}
              onClick={() => onRange(k)}
              className={`px-2.5 py-1 text-xs font-medium ${
                range === k ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {k === 'weeks' ? 'Three weeks' : 'A month'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500"
            >
              <span className="hidden sm:inline">{d.slice(0, 3)}</span>
              <span className="sm:hidden">{d.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-stone-100 last:border-0">
            {week.map((d) => {
              const dow = new Date(d.date + 'T12:00:00').getDay();
              const weekend = dow === 0 || dow === 6;
                const load = d.minutes;
                const open = d.items.filter((i) => !i.done).length;
                return (
                <div
                  key={d.date}
                  className={`min-h-[5.5rem] border-r border-stone-100 p-1.5 last:border-r-0 ${
                    d.past ? 'bg-stone-50/80' : weekend ? 'bg-stone-50/40' : 'bg-white'
                  } ${d.isToday ? 'ring-2 ring-inset ring-stone-900' : ''}`}
                >
                  <div className="mb-1 flex items-baseline gap-1">
                    <span
                      className={`text-xs tabular-nums ${
                        d.isToday
                          ? 'font-bold text-stone-900'
                          : d.past
                            ? 'text-stone-300'
                            : open
                              ? 'font-semibold text-stone-700'
                              : 'text-stone-400'
                      }`}
                    >
                      {new Date(d.date + 'T12:00:00').getDate()}
                    </span>
                    <span className="flex-1" />
                    {load > 0 && (
                      <span
                        className={`text-[10px] tabular-nums ${
                          load >= 90 ? 'font-semibold text-stone-700' : 'text-stone-400'
                        }`}
                        title="Everything due that day, daily work included"
                      >
                        {fmtMins(load)}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {d.items.map(({ r, done }) => (
                      <li key={r.id}>
                        <button
                          onClick={() => onPick(r, d.date)}
                          title={
                            done
                              ? `${r.title} · logged. Click to change it.`
                              : `${r.title} · ${anchorLabel(r)}`
                          }
                          className={`flex w-full items-center gap-1 rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight ${
                            done
                              ? 'border-emerald-600 bg-emerald-50/70 text-stone-400 hover:bg-emerald-50'
                              : 'border-stone-400 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          {done && <span className="text-emerald-700">{check}</span>}
                          <span className={`min-w-0 flex-1 truncate ${done ? 'line-through' : ''}`}>
                            {r.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
        {dailies.length > 0 && (
          <p className="border-t border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
            Every day, so not shown above but counted in each day's total:{' '}
            {dailies.map((r) => r.title).join(', ')}
            {dailyMins > 0 && <> · {fmtMins(dailyMins)} a day</>}.
          </p>
        )}
      </div>
    </section>
  );
}

/** The phone view. Seven columns at 420px truncates every title to nothing. */
function ComingUp({
  items, dailies, onPick,
}: {
  items: { date: string; routine: Routine; done: boolean }[];
  dailies: Routine[];
  onPick: (r: Routine, date: string) => void;
}) {
  const label = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  return (
    <section className="mt-6 sm:hidden">
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
        Coming up
      </h2>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {items.length === 0 ? (
          <p className="px-4 py-5 text-sm text-stone-500">
            Nothing periodic in the next three weeks.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map(({ date, routine, done }) => (
              <li key={date + routine.id}>
                <button
                  onClick={() => onPick(routine, date)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50"
                >
                  <span className="w-24 shrink-0 text-xs tabular-nums text-stone-500">
                    {label(date)}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      done ? 'text-stone-400 line-through' : 'text-stone-800'
                    }`}
                  >
                    {routine.title}
                  </span>
                  {done && <span className="shrink-0 text-[11px] text-emerald-700">Logged</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {dailies.length > 0 && (
          <p className="border-t border-stone-200 bg-stone-50 px-4 py-2 text-[11px] text-stone-500">
            Every day, so not listed: {dailies.map((r) => r.title).join(', ')}.
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * One routine in the Today grid.
 *
 * Status is a mark plus a written label, never colour alone: the amber that
 * means late measures 1.79 against white, fine for a dot and unreadable as
 * text. Cadence is a word rather than a fifth hue — four colours here would be
 * decoration, since nobody compares daily against monthly, and the palette's own
 * all-pairs check rules that fourth step out anyway.
 *
 * Gone quiet is deliberately colourless. A red badge on something four days late
 * would be the system shouting exactly where it was asked to stop.
 */
function DayItem({
  r, today, role, onLog, onEdit,
}: { r: Routine; today: string; role: string; onLog: () => void; onEdit: () => void }) {
  const late = overdueBy(r, today);
  const href = safeLinkOf(r.link);
  const isLate = late !== null && late > 0;

  return (
    <li className="flex items-start gap-2.5 border-b border-stone-100 bg-white px-4 py-3 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0">
      <span
        aria-hidden
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: isLate ? '#fab219' : '#0ca30c' }}
      />
      <div className="min-w-0 flex-1">
        <button onClick={onEdit} className="block max-w-full truncate text-left text-sm font-medium text-stone-900 hover:underline">
          {r.title}
        </button>
        <p className="truncate text-[11px] text-stone-500">
          {anchorLabel(r)}
          {r.minutes ? <> · {fmtMins(r.minutes)}</> : null}
          {isLate && <span className="font-medium text-stone-700"> · {late} days late</span>}
          {role && <> · {role}</>}
        </p>
        {r.lastOutcome === 'attention' && r.lastNote && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-500">Last time: {r.lastNote}</p>
        )}
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md px-1.5 py-1 text-[11px] text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          Open
        </a>
      )}
      <button
        onClick={onLog}
        className="shrink-0 rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-700"
      >
        Log
      </button>
    </li>
  );
}

function LogDialog({
  r, occurrence, onClose, onEdit,
}: { r: Routine; occurrence: string; onClose: () => void; onEdit: () => void }) {
  const [note, setNote] = useState('');
  const [toTiles, setToTiles] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const href = safeLinkOf(r.link);
  const logged = doneOn(r, occurrence);

  async function move(days: number) {
    setBusy(true);
    try {
      await moveOccurrence(r, occurrence, days);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function record(outcome: Outcome) {
    if (outcome === 'attention' && note.trim().length < 3) {
      setError('One sentence on what you found. That sentence is the whole point.');
      return;
    }
    setBusy(true);
    try {
      await logRoutine(r, occurrence, outcome, note, toTiles);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    try {
      await unlogOccurrence(r, occurrence);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <h2 className="text-base font-semibold text-stone-900">{r.title}</h2>
        <p className="mt-1 text-xs text-stone-500">
          {longDay(occurrence)} · {anchorLabel(r)} · {sinceLabel(r, today())}
          {href && (
            <>
              {' · '}
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
                Open the link
              </a>
            </>
          )}
        </p>

        {logged && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="text-xs font-medium text-emerald-900">
              Logged{logged === occurrence ? ' on the day' : ` on ${shortDay(logged)}`}.
            </span>
            <span className="text-[11px] text-emerald-800">Log it again to change what you wrote.</span>
            <button
              disabled={busy}
              onClick={() => void undo()}
              className="ml-auto rounded-lg border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-900 hover:border-emerald-500"
            >
              Not done after all
            </button>
          </div>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What did you find? Required only if something needs attention."
          className="mt-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />
        {/* A busy day is a reason to move something, not a reason to lie about
            having done it. Nothing to move once it is logged. */}
        {!logged && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
            <span className="text-xs text-stone-600">Not today?</span>
            <button
              disabled={busy}
              onClick={() => void move(-1)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:border-stone-400"
            >
              ← a day earlier
            </button>
            <button
              disabled={busy}
              onClick={() => void move(1)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:border-stone-400"
            >
              a day later →
            </button>
            <span className="text-[11px] text-stone-500">
              Moves this one only. The cadence stays put.
            </span>
          </div>
        )}

        <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={toTiles} onChange={(e) => setToTiles(e.target.checked)} />
          If something needs attention, put a to-do on my board for it
        </label>
        {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="brand" disabled={busy} onClick={() => void record('clean')}>Clean</Button>
          <Button variant="ghost" disabled={busy} onClick={() => void record('attention')}>
            Something to look at
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button onClick={onEdit} className="ml-auto text-xs text-stone-500 underline hover:text-stone-900">
            Edit routine
          </button>
        </div>
      </div>
    </div>
  );
}

const today = () => todayIso();

const shortDay = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const Pill = ({ on, children, onClick }: {
  on: boolean; children: ReactNode; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-3 py-1 text-xs ${
      on ? 'bg-stone-900 font-semibold text-white' : 'border border-stone-300 bg-white text-stone-600'
    }`}
  >
    {children}
  </button>
);

const Num = ({ value, min, max, onChange, width = 'w-16' }: {
  value: number; min: number; max: number; onChange: (n: number) => void; width?: string;
}) => (
  <input
    type="number"
    min={min}
    max={max}
    value={value}
    onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
    className={`${width} rounded-xl border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-sm`}
  />
);

/**
 * How often, as a rule rather than a menu.
 *
 * The interval is a number you type, so every other week and every five weeks
 * cost the same to express and nobody has to come back to me for the next one.
 *
 * Under it: the actual next three dates. An interval above one is ambiguous —
 * which Tuesday? — and no wording fixes that. Showing the dates does, and it
 * turns the phase control from a concept into "no, the other week".
 */
function RepeatPicker({ value, onChange }: { value: Repeat; onChange: (r: Repeat) => void }) {
  const today = todayIso();
  const preview = nextDates(value, today, 3);
  const phased = value.kind === 'weeks' || value.kind === 'months' || value.kind === 'weekdayOfMonth';
  const spaced = phased && value.every > 1;

  function pick(kind: RepeatKind) {
    if (kind === value.kind) return;
    const from = todayIso();
    onChange(
      kind === 'daily' ? { kind: 'daily' }
      : kind === 'weeks' ? { kind: 'weeks', every: 1, weekday: 1, from }
      : kind === 'months' ? { kind: 'months', every: 1, day: 1, from }
      : kind === 'twiceMonthly' ? { kind: 'twiceMonthly', days: [1, 15] }
      : { kind: 'weekdayOfMonth', every: 1, nth: 2, weekday: 2, from },
    );
  }

  return (
    <>
      <p className="mb-1 text-xs font-medium text-stone-500">How often</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <Pill key={k} on={value.kind === k} onClick={() => pick(k)}>{REPEAT_LABEL[k]}</Pill>
        ))}
      </div>

      {value.kind === 'weeks' && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-600">Every</span>
            <Num value={value.every} min={1} max={26} onChange={(n) => onChange({ ...value, every: n })} />
            <span className="text-xs text-stone-600">{value.every === 1 ? 'week, on' : 'weeks, on'}</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <Pill key={d} on={value.weekday === i} onClick={() => onChange({ ...value, weekday: i })}>
                {d.slice(0, 3)}
              </Pill>
            ))}
          </div>
        </>
      )}

      {value.kind === 'months' && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-600">Every</span>
          <Num value={value.every} min={1} max={24} onChange={(n) => onChange({ ...value, every: n })} />
          <span className="text-xs text-stone-600">
            {value.every === 1 ? 'month, on day' : 'months, on day'}
          </span>
          <Num value={value.day} min={1} max={28} onChange={(n) => onChange({ ...value, day: n })} />
        </div>
      )}

      {value.kind === 'twiceMonthly' && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-600">On the</span>
          <Num
            value={value.days[0]}
            min={1}
            max={28}
            onChange={(n) => onChange({ ...value, days: [n, value.days[1]] })}
          />
          <span className="text-xs text-stone-600">and the</span>
          <Num
            value={value.days[1]}
            min={1}
            max={28}
            onChange={(n) => onChange({ ...value, days: [value.days[0], n] })}
          />
        </div>
      )}

      {value.kind === 'weekdayOfMonth' && (
        <>
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {NTH_LABEL.map((label, i) => (
              <Pill key={label} on={value.nth === i + 1} onClick={() => onChange({ ...value, nth: i + 1 })}>
                {label}
              </Pill>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <Pill key={d} on={value.weekday === i} onClick={() => onChange({ ...value, weekday: i })}>
                {d.slice(0, 3)}
              </Pill>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-600">Every</span>
            <Num value={value.every} min={1} max={24} onChange={(n) => onChange({ ...value, every: n })} />
            <span className="text-xs text-stone-600">{value.every === 1 ? 'month' : 'months'}</span>
          </div>
        </>
      )}

      {value.kind !== 'daily' && (
        <div className="mb-2 rounded-xl bg-stone-50 px-3 py-2">
          <p className="text-xs text-stone-600">
            {preview.length ? (
              <>Next: <span className="font-medium text-stone-900">
                {preview.map((d) => longDay(d).replace(/,.*?(\w+ \d+)$/, ', $1')).join(' · ')}
              </span></>
            ) : (
              'That rule never comes round. Check the numbers.'
            )}
          </p>
          {spaced && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-stone-500">Wrong one?</span>
              <button
                type="button"
                onClick={() => onChange(shiftPhase(value, 1))}
                className="rounded-lg border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-700 hover:border-stone-400"
              >
                {value.kind === 'weeks' ? 'Shift a week' : 'Shift a month'}
              </button>
            </div>
          )}
        </div>
      )}

      {(value.kind === 'months' || value.kind === 'twiceMonthly') && (
        <p className="mb-2 text-xs text-stone-500">
          Days run 1 to 28, capped so a routine never silently skips February.
        </p>
      )}
    </>
  );
}

/** One editor for both adding and changing. Delete lives here, not on the row. */
function RoutineEditor({
  existing, roles, onClose, nextOrder,
}: { existing: Routine | null; roles: Role[]; onClose: () => void; nextOrder: number }) {
  const [f, setF] = useState({
    title: existing?.title ?? '',
    roleId: existing?.roleId ?? '',
    link: existing?.link ?? '',
    minutes: existing?.minutes ? String(existing.minutes) : '',
  });
  const [rep, setRep] = useState<Repeat>(
    existing ? repeatOf(existing) : { kind: 'weeks', every: 1, weekday: 1, from: todayIso() },
  );
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    if (f.title.trim().length < 2) { setError('Give it a name.'); return; }
    if (f.link.trim() && !safeLinkOf(f.link)) {
      setError('That link needs to be a web address starting with https://');
      return;
    }
    if (rep.kind === 'twiceMonthly' && rep.days[0] === rep.days[1]) {
      setError('Twice a month needs two different days.');
      return;
    }
    if (nextDates(rep, todayIso(), 1).length === 0) {
      setError('That repeat never comes round. Check the numbers.');
      return;
    }
    try {
      await saveRoutine({
        id: existing?.id ?? newId(),
        title: f.title.trim(),
        repeat: rep,
        // Set once, on creation. Editing a routine must not rewrite its history.
        startOn: existing?.startOn ?? todayIso(),
        // The old pair is still written so a routine stays readable if this ever
        // has to be rolled back. They are ignored whenever `repeat` is present.
        cadence: legacyCadence(rep),
        anchor: legacyAnchor(rep),
        roleId: f.roleId || null,
        link: safeLinkOf(f.link),
        lastDoneOn: existing?.lastDoneOn ?? null,
        lastOutcome: existing?.lastOutcome ?? null,
        lastNote: existing?.lastNote ?? '',
        shifts: existing?.shifts ?? {},
        done: existing?.done ?? {},
        minutes: f.minutes.trim() ? Math.max(1, Math.min(600, Number(f.minutes) || 0)) : null,
        order: existing?.order ?? nextOrder,
        active: true,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <h2 className="mb-3 text-base font-semibold text-stone-900">
          {existing ? 'Edit routine' : 'Add a routine'}
        </h2>

        <input
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="Check expenses"
          className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />

        <RepeatPicker value={rep} onChange={setRep} />

        <p className="mb-1 text-xs font-medium text-stone-500">Roughly how long (minutes)</p>
        <input
          type="number"
          min={1}
          max={600}
          value={f.minutes}
          onChange={(e) => setF({ ...f, minutes: e.target.value })}
          placeholder="15"
          className="mb-1 w-24 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />
        <p className="mb-2 text-xs text-stone-500">
          Optional, and a guess is fine. It exists so a heavy day is visible before you are standing
          in it, not so anyone can hold you to it.
        </p>

        <p className="mb-1 text-xs font-medium text-stone-500">Which role owns it</p>
        <select
          value={f.roleId}
          onChange={(e) => setF({ ...f, roleId: e.target.value })}
          className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">No role</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <p className="mb-1 text-xs font-medium text-stone-500">Link (optional)</p>
        <input
          value={f.link}
          onChange={(e) => setF({ ...f, link: e.target.value })}
          placeholder="https://"
          className="mb-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />
        <p className="mb-2 text-xs text-stone-500">
          Whatever you open to actually do this: the QuickBooks report, the attendance dashboard, or
          a Claude conversation that runs the skill for it.
        </p>

        {error && <p className="mb-2 text-xs font-medium text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="brand" onClick={save}>{existing ? 'Save' : 'Add it'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {existing && (
            <button
              onClick={() =>
                confirmDelete ? void deleteRoutine(existing.id).then(onClose) : setConfirmDelete(true)
              }
              className="ml-auto text-xs text-stone-500 underline hover:text-red-700"
            >
              {confirmDelete ? 'Really delete it?' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
