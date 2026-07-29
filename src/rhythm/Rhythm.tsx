/**
 * The Rhythm tab: standing obligations, what has gone quiet, and what those
 * checks actually turned up.
 *
 * Private to each person, same as the roles card. Nothing here is shared and
 * there is no setting to share it.
 */
import { useEffect, useMemo, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { deleteFinding, deleteRoutine, logRoutine, saveRoutine, watchFindings, watchRoutines } from '../lib/rhythm';
import { watchRoles } from '../lib/me';
import { todayIso, type Role } from '../types/me';
import {
  CADENCE_DAYS, CADENCE_LABEL, addDays, nextDue, sinceLabel, stateOf,
  type Cadence, type Finding, type Outcome, type Routine,
} from '../types/rhythm';
import { Button, Card, Section } from '../dlt/ui';

const CADENCES: Cadence[] = ['daily', 'weekly', 'monthly', 'quarterly'];
const newId = () => `r_${Math.random().toString(36).slice(2, 10)}`;

export function Rhythm() {
  const { user } = useOrg();
  const today = todayIso();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [logging, setLogging] = useState<Routine | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => (user ? watchRoutines(user.uid, setRoutines) : undefined), [user]);
  useEffect(() => (user ? watchFindings(user.uid, setFindings) : undefined), [user]);
  useEffect(() => (user ? watchRoles(user.uid, setRoles) : undefined), [user]);

  const live = routines.filter((r) => r.active !== false);
  const quiet = live.filter((r) => stateOf(r, today) === 'quiet');
  const loud = live.filter((r) => stateOf(r, today) !== 'quiet');
  const due = loud.filter((r) => stateOf(r, today) === 'due');
  const attention = findings.filter((f) => f.outcome === 'attention');

  const roleName = (id: string | null) => roles.find((x) => x.id === id)?.name ?? '';

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <Section
        title="Rhythm"
        hint="Standing obligations. Not things that get done, things that get watched."
      >
        <ForecastStrip routines={live} today={today} />

        <div className="mt-3">
          <Card title={due.length ? `${due.length} due today` : 'Nothing due'}>
            {loud.length === 0 ? (
              <p className="px-3 py-4 text-sm text-stone-500">
                No routines yet. Start with the one you are most likely to let slide.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {loud
                  .slice()
                  .sort((a, b) => nextDue(a, today).localeCompare(nextDue(b, today)))
                  .map((r) => (
                    <RoutineRow
                      key={r.id}
                      r={r}
                      today={today}
                      role={roleName(r.roleId)}
                      onLog={() => setLogging(r)}
                    />
                  ))}
              </ul>
            )}
          </Card>
        </div>

        {quiet.length > 0 && (
          <div className="mt-3">
            <Card title={`Gone quiet (${quiet.length})`}>
              <p className="px-3 pt-2 text-xs text-stone-500">
                More than four days past due. Still counted, still carrying the real date.
              </p>
              <ul className="divide-y divide-stone-100">
                {quiet.map((r) => (
                  <RoutineRow
                    key={r.id}
                    r={r}
                    today={today}
                    role={roleName(r.roleId)}
                    onLog={() => setLogging(r)}
                  />
                ))}
              </ul>
            </Card>
          </div>
        )}

        <div className="mt-3">
          <Button variant="ghost" onClick={() => setAdding(true)}>Add a routine</Button>
        </div>

        <div className="mt-6">
          <Card title="What these checks turned up">
            {attention.length === 0 ? (
              <p className="px-3 py-4 text-sm text-stone-500">
                Nothing logged yet. Over a semester this becomes the honest answer to what your
                controls actually caught, which is worth more at a board meeting than a count of
                ticked boxes.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {attention.map((f) => (
                  <li key={f.id} className="flex gap-3 px-3 py-2.5">
                    <div className="flex-1">
                      <p className="text-sm text-stone-900">{f.note}</p>
                      <p className="text-xs text-stone-500">{f.routineTitle} · {f.on}</p>
                    </div>
                    <button
                      className="text-xs text-stone-400 underline hover:text-stone-700"
                      onClick={() => void deleteFinding(f.id)}
                    >
                      Clear
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Section>

      {logging && <LogDialog r={logging} onClose={() => setLogging(null)} />}
      {adding && <RoutineEditor roles={roles} onClose={() => setAdding(false)} nextOrder={live.length} />}
    </div>
  );
}

function RoutineRow({
  r, today, role, onLog,
}: { r: Routine; today: string; role: string; onLog: () => void }) {
  const state = stateOf(r, today);
  const tone =
    state === 'quiet' ? 'bg-stone-400' : state === 'due' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden />
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-900">{r.title}</p>
        <p className="text-xs text-stone-500">
          {CADENCE_LABEL[r.cadence]} · last {sinceLabel(r, today)}
          {role && <> · {role}</>}
          {r.lastOutcome === 'attention' && <> · last time found something</>}
        </p>
      </div>
      <Button variant="brand" onClick={onLog}>Log it</Button>
    </li>
  );
}

/** The next fourteen days, so a pile-up is visible before you are standing in it. */
function ForecastStrip({ routines, today }: { routines: Routine[]; today: string }) {
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(today, i);
      const items = routines.filter((r) => {
        // Daily work would fill every column and drown the signal, so the strip
        // shows only the periodic things, which are what actually collide.
        if (r.cadence === 'daily') return false;
        const first = nextDue(r, today);
        if (first > date) return false;
        const step = CADENCE_DAYS[r.cadence];
        const gap = Math.round((Date.parse(date) - Date.parse(first)) / 86400000);
        return gap % step === 0;
      });
      return { date, items };
    });
  }, [routines, today]);

  const busiest = Math.max(1, ...days.map((d) => d.items.length));

  return (
    <Card title="Next two weeks">
      <div className="flex gap-1 overflow-x-auto px-3 py-3">
        {days.map((d, i) => (
          <div key={d.date} className="min-w-[2.5rem] flex-1 text-center">
            <div className="text-[10px] uppercase tracking-wide text-stone-400">
              {new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
            </div>
            <div
              className={`mx-auto mt-1 flex h-10 items-end justify-center rounded ${
                i === 0 ? 'bg-stone-900/5 ring-1 ring-stone-900' : 'bg-stone-100'
              }`}
              title={d.items.map((x) => x.title).join(', ')}
            >
              <div
                className="w-full rounded bg-stone-400"
                style={{ height: `${(d.items.length / busiest) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-stone-500">{d.items.length || ''}</div>
          </div>
        ))}
      </div>
      <p className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500">
        Weekly and longer only. Daily work would fill every column and tell you nothing.
      </p>
    </Card>
  );
}

function LogDialog({ r, onClose }: { r: Routine; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function record(outcome: Outcome) {
    if (outcome === 'attention' && note.trim().length < 3) {
      setError('One sentence on what you found. That sentence is the whole point.');
      return;
    }
    setBusy(true);
    try {
      await logRoutine(r, outcome, outcome === 'clean' ? note : note);
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
        <p className="mt-1 text-xs text-stone-500">{CADENCE_LABEL[r.cadence]}</p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Anything worth writing down. Required only if something needs attention."
          className="mt-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="brand" disabled={busy} onClick={() => void record('clean')}>
            Clean
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void record('attention')}>
            Something to look at
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function RoutineEditor({
  roles, onClose, nextOrder,
}: { roles: Role[]; onClose: () => void; nextOrder: number }) {
  const [f, setF] = useState({ title: '', cadence: 'weekly' as Cadence, roleId: '' });
  const [error, setError] = useState('');

  async function save() {
    if (f.title.trim().length < 2) { setError('Give it a name.'); return; }
    try {
      await saveRoutine({
        id: newId(),
        title: f.title.trim(),
        cadence: f.cadence,
        roleId: f.roleId || null,
        lastDoneOn: null,
        lastOutcome: null,
        order: nextOrder,
        active: true,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <h2 className="mb-3 text-base font-semibold text-stone-900">Add a routine</h2>
        <input
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="Check expenses"
          className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CADENCES.map((c) => (
            <button
              key={c}
              onClick={() => setF({ ...f, cadence: c })}
              className={`rounded-full px-3 py-1 text-xs ${
                f.cadence === c
                  ? 'bg-stone-900 font-semibold text-white'
                  : 'border border-stone-300 bg-white text-stone-600'
              }`}
            >
              {CADENCE_LABEL[c]}
            </button>
          ))}
        </div>
        <select
          value={f.roleId}
          onChange={(e) => setF({ ...f, roleId: e.target.value })}
          className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">No role</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {error && <p className="mb-2 text-xs font-medium text-red-700">{error}</p>}
        <div className="flex gap-2">
          <Button variant="brand" onClick={save}>Add it</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

export { deleteRoutine };
