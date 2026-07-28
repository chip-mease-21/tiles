/**
 * The weekly strategic review.
 *
 * Close last week, rank the roles, walk them one at a time, check the annual
 * goals, then name the one big thing and read the week back. The whole thing is
 * private. When you finish, a single date goes to the shared board so the team
 * can see the rhythm is being kept, and nothing else leaves this screen.
 *
 * The order is the design.
 *
 * Closing last week comes first, so the review cannot become a place to make
 * fresh promises instead of keeping old ones.
 *
 * The one big thing comes last, because you cannot know what matters most until
 * you have seen the state of everything. Named at the start it is a guess from
 * memory; named at the end it is a conclusion.
 *
 * The optional gut check on the first screen exists only so the two can be
 * compared. When the board changes your mind, that is the review working. When
 * it never does, you probably do not need the walk.
 */
import { useEffect, useMemo, useState } from 'react';
import { isQuiet, daysQuiet, type Goal, type Review, type Role, type RoleItem } from '../types/me';
import { ROCK_STATUSES, STATUS_LABEL, type RockStatus } from '../types/dlt';
import { completeReview, saveRoleMoved, sendItemToTiles, setRoleOrder } from '../lib/me';
import { Button } from '../dlt/ui';

type Step = { kind: 'open' | 'rank' | 'goals' | 'onebig' | 'summary' } | { kind: 'role'; id: string };

export function WeeklyReview({
  roles, goals, lastReview, weekOf, onExit,
}: {
  roles: Role[]; goals: Goal[]; lastReview: Review | null; weekOf: string; onExit: () => void;
}) {
  const [ranked, setRanked] = useState<string[]>(
    () => [...roles].sort((a, b) => a.order - b.order).map((r) => r.id),
  );
  const [depth, setDepth] = useState<'full' | 'focus'>('full');
  const [instinct, setInstinct] = useState('');
  const [oneBig, setOneBig] = useState('');
  /** The one big thing is named at the end, so it starts empty and gets seeded
   *  from the instinct once, the first time you land on that step. */
  const [seeded, setSeeded] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<Review['lastOutcome']>('');
  const [lastWhy, setLastWhy] = useState('');
  const [edited, setEdited] = useState<Record<string, Role>>({});
  const [i, setI] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const roleOf = (id: string) => edited[id] ?? roles.find((r) => r.id === id)!;

  const steps = useMemo<Step[]>(() => {
    const walk = depth === 'focus' ? ranked.slice(0, 3) : ranked;
    // Look first, then decide. Naming the week before you have seen the board is
    // a guess from memory; naming it after is a conclusion.
    return [
      { kind: 'open' },
      { kind: 'rank' },
      ...walk.map((id) => ({ kind: 'role', id } as Step)),
      ...(goals.length ? [{ kind: 'goals' } as Step] : []),
      { kind: 'onebig' },
      { kind: 'summary' },
    ];
  }, [depth, ranked, goals.length]);

  const step = steps[Math.min(i, steps.length - 1)]!;
  const pct = Math.round((i / (steps.length - 1)) * 100);

  // Arriving at the decide step for the first time, carry the instinct forward
  // as a starting point. After that it is yours to change.
  useEffect(() => {
    if (step.kind !== 'onebig' || seeded) return;
    setSeeded(true);
    if (!oneBig && instinct.trim()) setOneBig(instinct.trim());
  }, [step.kind, seeded, oneBig, instinct]);

  function patchItem(roleId: string, itemId: string, patch: Partial<RoleItem>) {
    const base = roleOf(roleId);
    setEdited((prev) => ({
      ...prev,
      [roleId]: { ...base, items: base.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) },
    }));
  }

  const summary = useMemo(() => {
    const lines = [`Week of ${weekOf}`, '', `One big thing: ${oneBig || 'not set'}`];
    if (instinct.trim() && instinct.trim() !== oneBig.trim()) {
      lines.push(`  (before the walk you said: ${instinct.trim()})`);
    }
    lines.push('', 'Focus');
    ranked.slice(0, 3).forEach((id, n) => lines.push(`  ${n + 1}. ${roleOf(id)?.name ?? ''}`));
    lines.push('', 'Next moves');
    ranked.forEach((id) => {
      const r = roleOf(id);
      r?.items.filter((it) => it.next).forEach((it) => {
        lines.push(`  ${r.name} / ${it.title}: ${it.next}${it.due ? `  (due ${it.due})` : ''}`);
      });
    });
    return lines.join('\n');
  }, [weekOf, oneBig, instinct, ranked, edited, roles]);

  const noNext = useMemo(
    () => ranked.flatMap((id) => {
      const r = roleOf(id);
      return (r?.items ?? []).filter((it) => !it.next).map((it) => `${r.name} / ${it.title}`);
    }),
    [ranked, edited, roles],
  );
  const dueSoon = useMemo(
    () => ranked.flatMap((id) => {
      const r = roleOf(id);
      return (r?.items ?? [])
        .filter((it) => {
          if (!it.due) return false;
          const days = Math.round((new Date(it.due).getTime() - Date.now()) / 86400000);
          return days <= 14;
        })
        .map((it) => `${r.name} / ${it.title}`);
    }),
    [ranked, edited, roles],
  );
  const quietRoles = useMemo(
    () => ranked.map((id) => roleOf(id)).filter((r) => r && isQuiet(r)),
    [ranked, roles],
  );
  const offTrack = useMemo(
    () => ranked.flatMap((id) => {
      const r = roleOf(id);
      return (r?.items ?? []).filter((it) => it.status === 'off-track').map((it) => `${r.name} / ${it.title}`);
    }),
    [ranked, edited, roles],
  );

  const withNext = useMemo(
    () => ranked.flatMap((id) => {
      const r = roleOf(id);
      return (r?.items ?? []).filter((it) => it.next.trim() && !it.tileId).map((it) => ({ role: r, item: it }));
    }),
    [ranked, edited, roles],
  );
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);

  async function pushToTiles() {
    setPushing(true); setError('');
    try {
      for (const { role, item } of withNext) await sendItemToTiles(role, item);
      setPushed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setPushing(false); }
  }

  async function finish() {
    setSaving(true); setError('');
    try {
      // Only the roles actually touched get stamped as moved. Walking past a
      // card without changing anything is not attention, and the quiet signal
      // is worthless if simply opening the review resets it.
      await Promise.all(Object.values(edited).map(saveRoleMoved));
      await setRoleOrder(ranked);
      await completeReview({
        date: new Date().toISOString().slice(0, 10),
        weekOf,
        instinct: instinct.trim(),
        oneBigThing: oneBig.trim(),
        focus: ranked.slice(0, 3).map((id) => roleOf(id)?.name ?? ''),
        lastOutcome, lastWhy: lastWhy.trim(),
      });
      onExit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100">
      <header className="border-b border-stone-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <h2 className="flex-1 text-sm font-semibold text-stone-900">Weekly strategic review</h2>
          <span className="text-xs tabular-nums text-stone-500">Step {i + 1} of {steps.length}</span>
          <Button variant="ghost" onClick={onExit}>Exit</Button>
        </div>
      </header>
      <div className="h-[3px] bg-stone-200">
        <div className="h-full bg-[#c0202e] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex-1 overflow-auto px-5 py-7">
        <div className="mx-auto max-w-3xl">
          {step.kind === 'open' && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#c0202e]">Close last week</p>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight">
                {lastReview ? "Did last week's one big thing happen?" : 'This is your first logged review.'}
              </h3>
              <p className="mb-5 max-w-2xl text-sm text-stone-600">
                {lastReview
                  ? 'Answer honestly. The pattern over time is worth more than any single week.'
                  : 'Nothing to close out yet. From here on, every review logs the week so you can see the pattern.'}
              </p>
              {lastReview && (
                <>
                  <div className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                      Week of {lastReview.weekOf}
                    </p>
                    <p className="mt-1 text-[15px] font-medium">{lastReview.oneBigThing || 'Not set'}</p>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-stone-500">Focus roles</p>
                    <p className="mt-1 text-sm text-stone-600">{lastReview.focus.join(', ') || 'None recorded'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['done', 'partly', 'no'] as const).map((o) => (
                      <button
                        key={o} type="button" onClick={() => setLastOutcome(o)} aria-pressed={lastOutcome === o}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                          lastOutcome === o ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'
                        }`}
                      >
                        {o === 'done' ? 'Yes, it happened' : o === 'partly' ? 'Partly' : 'No'}
                      </button>
                    ))}
                  </div>
                  {lastOutcome && lastOutcome !== 'done' && (
                    <div className="mt-4">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                        What got in the way?
                      </label>
                      <textarea
                        value={lastWhy} onChange={(e) => setLastWhy(e.target.value)} rows={3}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                      />
                      <p className="mt-2 text-xs text-stone-500">
                        If the same answer shows up three weeks running, it is not an obstacle. It is the system.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 border-t border-stone-200 pt-5">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                  Before you look, what do you think this week is about? Optional.
                </label>
                <textarea
                  value={instinct} onChange={(e) => setInstinct(e.target.value)} rows={2}
                  placeholder="Your gut, in one line. You will name the real one at the end."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-stone-500">
                  Skip it if you like. It is here so that at the end you can see whether the board agreed
                  with you. When it does not, most weeks, that is the finding.
                </p>
              </div>
            </>
          )}

          {step.kind === 'onebig' && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#c0202e]">Now decide</p>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight">What is the one big thing?</h3>
              <p className="mb-5 max-w-2xl text-sm text-stone-600">
                You have seen the whole board. If you accomplish only one thing this week that moves the
                mission forward, what is it? One sentence. Not a list.
              </p>

              {(offTrack.length > 0 || noNext.length > 0 || dueSoon.length > 0) && (
                <div className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                    What the walk turned up
                  </p>
                  {offTrack.length > 0 && (
                    <p className="mt-1.5 text-sm text-stone-700">
                      <span className="font-semibold text-red-700">{offTrack.length} off track:</span>{' '}
                      {offTrack.join(', ')}
                    </p>
                  )}
                  {dueSoon.length > 0 && (
                    <p className="mt-1 text-sm text-stone-700">
                      <span className="font-semibold">Landing inside 14 days:</span> {dueSoon.join(', ')}
                    </p>
                  )}
                  {noNext.length > 0 && (
                    <p className="mt-1 text-sm text-stone-700">
                      <span className="font-semibold">{noNext.length} with no next move:</span>{' '}
                      {noNext.join(', ')}
                    </p>
                  )}
                </div>
              )}

              <textarea
                value={oneBig} onChange={(e) => setOneBig(e.target.value)} rows={3}
                placeholder="The one outcome that matters most this week."
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[17px] leading-relaxed"
              />

              {instinct.trim() && (
                <div className="mt-4 rounded-xl border border-stone-200 border-l-[3px] border-l-stone-400 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                    Before you looked, you said
                  </p>
                  <p className="mt-1 text-sm text-stone-700">{instinct.trim()}</p>
                  {oneBig.trim() && oneBig.trim() !== instinct.trim() && (
                    <p className="mt-2 text-xs italic text-stone-500">
                      The board changed your mind. That is the review doing its job.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {step.kind === 'rank' && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#c0202e]">Rank the week</p>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight">Which roles carry this week?</h3>
              <p className="mb-4 max-w-2xl text-sm text-stone-600">
                Top three become your focus. Everything below is maintenance. You cannot make twelve things
                a priority.
              </p>
              {quietRoles.length > 0 && (
                <div className="mb-4 rounded-xl border border-stone-300 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                    Gone quiet
                  </p>
                  <p className="mt-1 text-sm text-stone-700">
                    {quietRoles.map((r) => `${r.name}${daysQuiet(r) === null ? '' : `, ${daysQuiet(r)}d`}`).join(' · ')}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Not a reason to promote them. A reason to decide, on purpose, that they can wait.
                  </p>
                </div>
              )}
              <ul className="space-y-1.5">
                {ranked.map((id, n) => {
                  const r = roleOf(id);
                  if (!r) return null;
                  const live = r.items.filter((it) => it.status === 'off-track' || it.status === 'caution').length;
                  return (
                    <li key={id} className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 ${
                      n < 3 ? 'border-blue-500 shadow-[inset_3px_0_0_0] shadow-blue-500' : 'border-stone-200'
                    }`}>
                      <span className={`w-5 text-sm font-bold tabular-nums ${n < 3 ? 'text-blue-700' : 'text-stone-400'}`}>
                        {n + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-stone-500">
                        {r.items.length} items{live ? `, ${live} needing attention` : ''}
                      </span>
                      <span className="flex gap-1">
                        <button
                          type="button" aria-label={`Move ${r.name} up`} disabled={n === 0}
                          onClick={() => setRanked((p) => {
                            const q = [...p]; [q[n - 1], q[n]] = [q[n]!, q[n - 1]!]; return q;
                          })}
                          className="h-7 w-7 rounded-md border border-stone-300 text-xs disabled:opacity-30"
                        >↑</button>
                        <button
                          type="button" aria-label={`Move ${r.name} down`} disabled={n === ranked.length - 1}
                          onClick={() => setRanked((p) => {
                            const q = [...p]; [q[n], q[n + 1]] = [q[n + 1]!, q[n]!]; return q;
                          })}
                          className="h-7 w-7 rounded-md border border-stone-300 text-xs disabled:opacity-30"
                        >↓</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-widest text-stone-500">
                How deep is this review?
              </p>
              <div className="flex flex-wrap gap-2">
                {([['full', `Walk all ${ranked.length}`], ['focus', 'Focus review, top three only']] as const).map(([v, label]) => (
                  <button
                    key={v} type="button" onClick={() => setDepth(v)} aria-pressed={depth === v}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      depth === v ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step.kind === 'role' && (() => {
            const role = roleOf(step.id);
            if (!role) return null;
            const rank = ranked.indexOf(role.id) + 1;
            return (
              <>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#c0202e]">
                  {rank <= 3 ? `Focus ${rank} · ` : ''}{role.group === 'oversight' ? 'Oversight' : 'Core role'}
                </p>
                <h3 className="mb-2 text-2xl font-semibold tracking-tight">{role.name}</h3>
                <p className="mb-4 text-sm text-stone-600">
                  Where does each item actually stand, and what is the next move?
                </p>
                <div className="mb-5 rounded-xl border border-stone-200 border-l-[3px] border-l-[#c0202e] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-stone-800">What I am accountable for</p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-xs text-stone-600">
                    {role.expectations.map((x, k) => <li key={k}>{x}</li>)}
                  </ol>
                </div>
                {role.items.map((it) => (
                  <div key={it.id} className="mb-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="flex-1 text-[15px] font-semibold">{it.title}</span>
                      {it.due && <span className="text-xs text-stone-500">Due {it.due}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ROCK_STATUSES.map((s) => (
                        <button
                          key={s} type="button" aria-pressed={it.status === s}
                          onClick={() => patchItem(role.id, it.id, { status: s as RockStatus })}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            it.status === s ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'
                          }`}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    <label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                      Next move
                    </label>
                    <textarea
                      value={it.next} rows={2}
                      onChange={(e) => patchItem(role.id, it.id, { next: e.target.value })}
                      placeholder="One concrete action. If you cannot name one, this item is not moving."
                      className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                {role.items.length === 0 && (
                  <p className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
                    Nothing tracked here. If that is wrong, add an item from the card.
                  </p>
                )}
              </>
            );
          })()}

          {step.kind === 'goals' && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#c0202e]">The year</p>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight">Are your annual goals still moving?</h3>
              <p className="mb-5 max-w-2xl text-sm text-stone-600">
                A quick look, not a rewrite. These were set at your annual review. A goal nobody looks at
                between reviews is a goal nobody has.
              </p>
              {goals.map((g) => (
                <div key={g.id} className="mb-2 rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 text-sm font-semibold">{g.title}</span>
                    <span className="text-xs tabular-nums text-stone-500">
                      {g.current || '?'} of {g.target || '?'}
                    </span>
                  </div>
                  {g.measure && <p className="mt-0.5 text-xs text-stone-500">{g.measure}</p>}
                </div>
              ))}
            </>
          )}

          {step.kind === 'summary' && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#c0202e]">The week ahead</p>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight">Here is your week.</h3>
              <p className="mb-5 max-w-2xl text-sm text-stone-600">
                Finishing logs the review to your private history. A single date goes to the team board so
                they can see the rhythm is being kept. Nothing you wrote here leaves this screen.
              </p>
              <pre className="max-h-[40vh] overflow-auto rounded-xl border border-stone-300 bg-white px-4 py-4 font-mono text-xs leading-relaxed">
                {summary}
              </pre>
              {(offTrack.length > 0 || noNext.length > 0) && (
                <div className="mt-4 rounded-xl border border-stone-200 border-l-[3px] border-l-red-600 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                    Worth naming before you close
                  </p>
                  {offTrack.length > 0 && (
                    <p className="mt-1.5 text-sm">{offTrack.length} off track: {offTrack.join(', ')}</p>
                  )}
                  {noNext.length > 0 && (
                    <p className="mt-1 text-sm">{noNext.length} with no next move: {noNext.join(', ')}</p>
                  )}
                </div>
              )}
              {withNext.length > 0 && (
                <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 text-sm text-stone-700">
                      Send this week's {withNext.length} next moves to Tiles as to dos?
                    </p>
                    <Button variant="plain" disabled={pushing || pushed} onClick={pushToTiles}>
                      {pushed ? 'Sent' : pushing ? 'Sending' : 'Send to Tiles'}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-500">
                    The card keeps the commitment. Tiles carries the execution. Anything already sent is
                    skipped.
                  </p>
                </div>
              )}
              {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
            </>
          )}
        </div>
      </div>

      <footer className="border-t border-stone-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {i > 0 && <Button onClick={() => setI(i - 1)}>Back</Button>}
          <span className="flex-1" />
          {step.kind === 'role' && <Button variant="ghost" onClick={() => setI(i + 1)}>Skip</Button>}
          {step.kind === 'summary'
            ? <Button variant="brand" onClick={finish} disabled={saving}>
                {saving ? 'Saving' : 'Finish and log'}
              </Button>
            : <Button variant="brand" onClick={() => setI(i + 1)}>
                {i === steps.length - 2 ? 'See the summary' : 'Next'}
              </Button>}
        </div>
      </footer>
    </div>
  );
}
