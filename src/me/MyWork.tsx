/**
 * A person's own space: their Roles and Expectations card, their annual goals,
 * and their weekly review.
 *
 * Private by default. Two toggles, both theirs, publish the roles card or the
 * goals to the DLT. There is no toggle for the weekly review, and there will not
 * be one. A private space people actually trust is worth more than any
 * visibility it could buy.
 */
import { useEffect, useMemo, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import {
  addGoal, addRole, removeGoal, removeRole, saveGoal, saveRole,
  saveRoleMoved, sendItemToTiles, watchGoals, watchProfile, watchReviews, watchRoles,
} from '../lib/me';
import {
  EMPTY_PROFILE, ITEM_KINDS, ITEM_SOFT_CAP, isQuiet, mondayOf, todayIso,
  type Goal, type Profile, type Review, type Role, type RoleItem,
} from '../types/me';
import { ROCK_STATUSES, STATUS_LABEL, type RockStatus } from '../types/dlt';
import { Button, Card, Modal, Section, StatusChip, fmtDate } from '../dlt/ui';
import { RolesCard } from './RolesCard';
import { ShareDialog, ShareSummary } from './SharePanel';
import { WeeklyReview } from './WeeklyReview';

const uid4 = () => `x${Math.random().toString(36).slice(2, 9)}`;

export function MyWork() {
  const { user, member } = useOrg();
  const me = user?.uid ?? '';

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [roles, setRoles] = useState<Role[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [expectationsOf, setExpectationsOf] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<{ role: Role | null } | null>(null);
  const [itemForm, setItemForm] = useState<{ role: Role; item: RoleItem | null } | null>(null);
  const [goalForm, setGoalForm] = useState<{ goal: Goal | null } | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!me) return;
    const unsubs = [
      watchProfile(me, (p) => setProfile(p ?? EMPTY_PROFILE)),
      watchRoles(me, setRoles),
      watchGoals(me, setGoals),
      watchReviews(me, setReviews),
    ];
    return () => unsubs.forEach((u) => u());
  }, [me]);

  const lastReview = reviews[0] ?? null;
  const weekOf = mondayOf();
  const reviewedThisWeek = lastReview?.weekOf === weekOf;
  const year = String(new Date().getFullYear());
  const thisYearsGoals = useMemo(() => goals.filter((g) => !g.year || g.year === year), [goals, year]);
  /** How often the walk overturned the gut check. A high number is the review earning its keep. */
  const changedMind = useMemo(
    () => reviews.slice(0, 8).filter((r) => r.instinct && r.instinct !== r.oneBigThing).length,
    [reviews],
  );
  const quiet = useMemo(() => roles.filter(isQuiet), [roles]);

  if (!me) return null;

  if (reviewing) {
    return (
      <WeeklyReview
        roles={roles} goals={thisYearsGoals} lastReview={lastReview}
        weekOf={weekOf} onExit={() => setReviewing(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4">
      <header className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              {profile.title || member?.name || 'My work'}
            </h1>
            <p className="text-xs text-stone-500">Roles and Expectations{profile.reportsTo ? ` · ${profile.reportsTo}` : ''}</p>
            {profile.purpose && (
              <p className="mt-2 max-w-3xl text-sm text-stone-700">
                <span className="font-semibold">Purpose: </span>{profile.purpose}
              </p>
            )}
          </div>
          <div className="text-right">
            <Button variant="brand" onClick={() => setReviewing(true)}>
              {reviewedThisWeek ? 'Run it again' : 'Start weekly review'}
            </Button>
            <p className="mt-1.5 text-[11px] text-stone-500">
              {lastReview
                ? reviewedThisWeek
                  ? 'Done for the week of ' + fmtDate(weekOf)
                  : 'Last run for the week of ' + fmtDate(lastReview.weekOf)
                : 'No review logged yet'}
            </p>
          </div>
        </div>

        {quiet.length > 0 && (
          <div className="mt-3 flex items-start gap-2.5 border-t border-stone-100 pt-3">
            <span className="mt-0.5 rounded border border-stone-400 bg-stone-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-stone-700">
              Gone quiet
            </span>
            <p className="flex-1 text-sm leading-snug text-stone-700">
              <span className="font-semibold">{quiet.length} of your {roles.length} areas</span> have not
              moved in a while: {quiet.map((r) => r.name).join(', ')}.
              <span className="ml-1 text-stone-500">
                Nothing here generates a task, which is exactly why a task list cannot tell you this.
              </span>
            </p>
          </div>
        )}

        {lastReview && (
          <div className="mt-3 flex items-start gap-2.5 border-t border-stone-100 pt-3">
            <span className="mt-0.5 rounded bg-[#c0202e] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
              One big thing
            </span>
            <p className="flex-1 text-[15px] font-medium leading-snug text-stone-900">
              {lastReview.oneBigThing || 'Not set'}
            </p>
          </div>
        )}

        <ShareSummary profile={profile} onOpen={() => setSharing(true)} />
      </header>

      <Section
        title="Roles and Expectations"
        hint="What you own, not what you are doing. The doing lives in Tiles."
        right={<Button variant="plain" onClick={() => setRoleForm({ role: null })}>Add a role</Button>}
      >
        {roles.length > 0
          ? <RolesCard
              roles={roles} canDrag
              onExpectations={setExpectationsOf}
              onItem={(role, item) => setItemForm({ role, item })}
              onEditRole={(role) => setRoleForm({ role })}
            />
          : <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-medium text-stone-700">No roles yet.</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                Start with the areas you are actually accountable for. One card each. If you cannot name
                what done looks like for a card, that is the card to write first.
              </p>
              <div className="mt-3"><Button variant="brand" onClick={() => setRoleForm({ role: null })}>Add your first role</Button></div>
            </div>}
      </Section>

      <Section
        title={`Annual goals ${year}`}
        hint="Set at your annual review. Checked at every weekly review."
        right={<Button variant="plain" onClick={() => setGoalForm({ goal: null })}>Add a goal</Button>}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {thisYearsGoals.map((g) => (
            <Card
              key={g.id} title={g.title}
              right={<button type="button" className="text-xs text-stone-400 hover:text-stone-700"
                onClick={() => setGoalForm({ goal: g })}>Edit</button>}
            >
              <div className="space-y-1.5 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <StatusChip status={g.status} />
                  {g.reviewedOn
                    ? <span className="text-[11px] text-stone-400">Reviewed {fmtDate(g.reviewedOn)}</span>
                    : <span className="text-[11px] text-stone-400">Not reviewed since it was set</span>}
                </div>
                {g.measure && <p className="text-xs text-stone-600">{g.measure}</p>}
                <p className="text-sm tabular-nums text-stone-900">
                  <span className="font-semibold">{g.current || '?'}</span>
                  <span className="text-stone-400"> of </span>
                  <span className="font-semibold">{g.target || '?'}</span>
                </p>
                {g.note && <p className="text-xs text-stone-500">{g.note}</p>}
              </div>
            </Card>
          ))}
          {thisYearsGoals.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-medium text-stone-700">No annual goals set for {year}.</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                These come out of your annual review. A goal without a measure is a wish, so each one asks
                for what you are counting and what number means done.
              </p>
            </div>
          )}
        </div>
      </Section>

      {reviews.length > 0 && (
        <Section
          title="Review history"
          hint={changedMind > 1
            ? `Your instinct and the board disagreed in ${changedMind} of the last ${Math.min(reviews.length, 8)} reviews.`
            : 'Your record. Nobody else can read this.'}
        >
          <Card title={`${reviews.length} logged`}>
            <ul className="divide-y divide-stone-100">
              {reviews.slice(0, 8).map((r) => (
                <li key={r.id} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold tabular-nums text-stone-500">Week of {fmtDate(r.weekOf)}</span>
                    {r.lastOutcome && (
                      <span className={`text-[11px] font-medium ${
                        r.lastOutcome === 'done' ? 'text-green-700'
                          : r.lastOutcome === 'partly' ? 'text-stone-600' : 'text-red-700'
                      }`}>
                        Previous week: {r.lastOutcome === 'done' ? 'happened' : r.lastOutcome === 'partly' ? 'partly' : 'did not happen'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-800">{r.oneBigThing || 'Not set'}</p>
                  {r.instinct && r.instinct !== r.oneBigThing && (
                    <p className="mt-0.5 text-xs text-stone-500">
                      Going in you thought it was: <span className="italic">{r.instinct}</span>
                    </p>
                  )}
                  {r.lastWhy && <p className="mt-0.5 text-xs italic text-stone-500">Got in the way: {r.lastWhy}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {expectationsOf && (
        <ExpectationsModal
          role={expectationsOf}
          onClose={() => setExpectationsOf(null)}
          onSave={(expectations) => {
            void saveRole({ ...expectationsOf, expectations, draft: false });
            setExpectationsOf(null);
          }}
        />
      )}
      {roleForm && (
        <RoleForm
          role={roleForm.role}
          nextOrder={roles.length + 1}
          onClose={() => setRoleForm(null)}
        />
      )}
      {itemForm && (
        <ItemForm
          role={itemForm.role}
          item={itemForm.item}
          onClose={() => setItemForm(null)}
        />
      )}
      {sharing && <ShareDialog profile={profile} onClose={() => setSharing(false)} />}
      {goalForm && (
        <GoalForm
          goal={goalForm.goal}
          year={year}
          nextOrder={goals.length + 1}
          onClose={() => setGoalForm(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ modals */

function ExpectationsModal({
  role, onClose, onSave,
}: { role: Role; onClose: () => void; onSave: (e: string[]) => void }) {
  const [list, setList] = useState<string[]>(role.expectations.length ? role.expectations : ['']);
  return (
    <Modal
      title={role.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" onClick={() => onSave(list.map((x) => x.trim()).filter(Boolean))}>Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      {role.draft && (
        <p className="mb-3 inline-block rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
          Draft. Written for you, not by you.
        </p>
      )}
      <p className="mb-2 text-xs text-stone-500">What you are accountable for in this role. One per line.</p>
      {list.map((x, i) => (
        <textarea
          key={i} value={x} rows={2}
          onChange={(e) => setList((p) => p.map((v, k) => (k === i ? e.target.value : v)))}
          className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        />
      ))}
      <Button variant="ghost" onClick={() => setList((p) => [...p, ''])}>Add a line</Button>
    </Modal>
  );
}

function RoleForm({
  role, nextOrder, onClose,
}: { role: Role | null; nextOrder: number; onClose: () => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [group, setGroup] = useState<Role['group']>(role?.group ?? 'core');
  return (
    <Modal
      title={role ? 'Edit role' : 'Add a role'}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="brand" disabled={name.trim().length < 2}
            onClick={() => {
              const patch = { name: name.trim(), group };
              void (role
                ? saveRole({ ...role, ...patch })
                : addRole({ ...patch, draft: false, expectations: [], items: [], order: nextOrder }));
              onClose();
            }}
          >
            {role ? 'Save' : 'Add it'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {role && (
            <button
              type="button" className="ml-auto text-sm font-medium text-red-700"
              onClick={() => {
                if (window.confirm(`Delete the ${role.name} card and everything on it?`)) {
                  void removeRole(role.id); onClose();
                }
              }}
            >
              Delete
            </button>
          )}
        </>
      }
    >
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Role</label>
      <input
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Finance, Operations, Communications"
        className="mb-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Band</label>
      <div className="flex gap-2">
        {([['core', 'Core role'], ['oversight', 'Oversight']] as const).map(([v, label]) => (
          <button
            key={v} type="button" onClick={() => setGroup(v)} aria-pressed={group === v}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              group === v ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function ItemForm({
  role, item, onClose,
}: { role: Role; item: RoleItem | null; onClose: () => void }) {
  const [f, setF] = useState<RoleItem>(item ?? {
    id: uid4(), title: '', kind: 'Priority', status: 'not-started', next: '', due: '', note: '',
    tileId: null,
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(item?.tileId ?? null);
  // Editing an item is attention to the work, so it stamps the role as moved.
  const save = (items: RoleItem[]) => { void saveRoleMoved({ ...role, items }); onClose(); };
  const atCap = !item && role.items.length >= ITEM_SOFT_CAP;

  async function toTiles() {
    setSending(true);
    try {
      const id = await sendItemToTiles(role, f);
      setSent(id);
      setF((p) => ({ ...p, tileId: id }));
    } finally { setSending(false); }
  }
  return (
    <Modal
      title={role.name}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="brand" disabled={f.title.trim().length < 2}
            onClick={() => save(item
              ? role.items.map((x) => (x.id === f.id ? f : x))
              : [...role.items, f])}
          >
            {item ? 'Save' : 'Add it'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {item && f.next.trim() && (
            <Button variant="plain" disabled={sending || !!sent} onClick={toTiles}>
              {sent ? 'In Tiles' : sending ? 'Sending' : 'Send to Tiles'}
            </Button>
          )}
          {item && (
            <button
              type="button" className="ml-auto text-sm font-medium text-red-700"
              onClick={() => save(role.items.filter((x) => x.id !== f.id))}
            >
              Delete
            </button>
          )}
        </>
      }
    >
      {atCap && (
        <p className="mb-3 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          {role.name} already has {role.items.length} items. This card is for what you are accountable
          for, at the level of the thing that would embarrass you if it went unattended for a month.
          Anything smaller belongs in Tiles, where it can have steps and a date.
        </p>
      )}
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Title</label>
      <input
        value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
        className="mb-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Type</label>
          <select
            value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as RoleItem['kind'] })}
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
          >
            {ITEM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Status</label>
          <select
            value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as RockStatus })}
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
          >
            {ROCK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Next move</label>
      <textarea
        value={f.next} rows={2} onChange={(e) => setF({ ...f, next: e.target.value })}
        placeholder="One concrete action. If you cannot name one, it is not moving."
        className="mb-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Due</label>
      <input
        type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })}
        className="mb-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Context</label>
      <textarea
        value={f.note} rows={3} onChange={(e) => setF({ ...f, note: e.target.value })}
        className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      {item && (
        <p className="text-xs text-stone-500">
          {sent
            ? 'The next move is in Tiles as a to do. Work it there; keep the commitment here.'
            : 'Once the next move needs steps and a date, send it to Tiles. The card names what you owe. Tiles carries how it gets done.'}
        </p>
      )}
    </Modal>
  );
}

function GoalForm({
  goal, year, nextOrder, onClose,
}: { goal: Goal | null; year: string; nextOrder: number; onClose: () => void }) {
  const [f, setF] = useState<Goal>(goal ?? {
    id: uid4(), title: '', measure: '', target: '', current: '', year,
    status: 'not-started', note: '', reviewedOn: null, order: nextOrder,
  });
  const valid = f.title.trim().length > 1 && f.measure.trim().length > 0 && f.target.trim().length > 0;
  return (
    <Modal
      title={goal ? 'Edit annual goal' : 'Add an annual goal'}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="brand" disabled={!valid}
            onClick={() => {
              const clean = { ...f, title: f.title.trim(), reviewedOn: todayIso() };
              void (goal ? saveGoal(clean) : addGoal(clean));
              onClose();
            }}
          >
            {goal ? 'Save' : 'Add it'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {goal && (
            <button
              type="button" className="ml-auto text-sm font-medium text-red-700"
              onClick={() => { if (window.confirm('Delete this goal?')) { void removeGoal(goal.id); onClose(); } }}
            >
              Delete
            </button>
          )}
        </>
      }
    >
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Goal</label>
      <input
        value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
        placeholder="What are you trying to achieve this year?"
        className="mb-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Measure</label>
      <input
        value={f.measure} onChange={(e) => setF({ ...f, measure: e.target.value })}
        placeholder="What are you counting? Days of reserve, percent of income, number of leaders."
        className="mb-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
      <p className="mb-3 text-xs text-stone-500">A goal without a measure is a wish. Both fields are required.</p>
      <div className="mb-3 grid grid-cols-3 gap-3">
        {([['target', 'Target'], ['current', 'Where it is now'], ['year', 'Year']] as const).map(([k, label]) => (
          <div key={k}>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">{label}</label>
            <input
              value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Status</label>
      <select
        value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as RockStatus })}
        className="mb-3 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      >
        {ROCK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Notes</label>
      <textarea
        value={f.note} rows={3} onChange={(e) => setF({ ...f, note: e.target.value })}
        className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
      />
    </Modal>
  );
}
