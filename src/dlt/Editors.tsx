/**
 * The editing surface that lets the app replace the spreadsheet.
 *
 * A sheet lets you add a rock, move a date, rewrite a campus priority. Until
 * the app does all of that, the sheet cannot be retired, so these are not
 * polish. They are the condition for step 7.
 *
 * Status still moves through StatusEditor, because a status change carries a
 * required note and that rule deserves its own screen.
 */
import { useState } from 'react';
import {
  ROCK_STATUSES, STATUS_LABEL,
  type Issue, type Member, type Picture, type PriorityGroup, type Rock, type RockStatus,
} from '../types/dlt';
import {
  createRock, deleteIssue, deleteRock, raiseIssue, updateGroup, updateIssue,
  updatePicture, updateRock,
} from '../lib/org';
import { Button, Modal } from './ui';

function Field({
  label, value, onChange, type = 'text', placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function useSave(onClose: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function run(fn: () => Promise<unknown>) {
    setSaving(true); setError('');
    try { await fn(); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setSaving(false); }
  }
  return { saving, error, run };
}

/* ------------------------------------------------------------------- rocks */

export function RockEditor({
  rock, semester, members, onClose,
}: {
  rock: Rock | null;            // null means create
  semester: string;
  members: Member[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(rock?.title ?? '');
  const [description, setDescription] = useState(rock?.description ?? '');
  const [ownerUid, setOwnerUid] = useState(rock?.ownerUid ?? '');
  const [ownerLabel, setOwnerLabel] = useState(rock?.ownerLabel ?? 'Organization');
  const [due, setDue] = useState(rock?.due ?? '');
  const [status, setStatus] = useState<RockStatus>(rock?.status ?? 'not-started');
  const [order, setOrder] = useState(String(rock?.order ?? 99));
  const { saving, error, run } = useSave(onClose);

  const valid = title.trim().length > 1 && due.length === 10;

  function pickOwner(uid: string) {
    setOwnerUid(uid);
    setOwnerLabel(uid ? (members.find((m) => m.uid === uid)?.name ?? 'Unassigned') : 'Organization');
  }

  return (
    <Modal
      title={rock ? 'Edit rock' : 'Add a rock'}
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" disabled={!valid || saving} onClick={() => run(() =>
            rock
              ? updateRock(rock.id, {
                  title: title.trim(), description: description.trim(),
                  ownerUid: ownerUid || null, ownerLabel, due, order: Number(order) || 99,
                })
              : createRock({
                  title: title.trim(), description: description.trim(),
                  ownerUid: ownerUid || null, ownerLabel, semester,
                  status, statusNote: '', due, order: Number(order) || 99,
                }))}
          >
            {saving ? 'Saving' : rock ? 'Save' : 'Add it'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {rock && (
            <button
              type="button"
              className="ml-auto text-sm font-medium text-red-700"
              onClick={() => {
                if (window.confirm('Delete this rock? A delete leaves no audit trail.')) void run(() => deleteRock(rock.id));
              }}
            >
              Delete
            </button>
          )}
        </>
      }
    >
      <Field label="Rock" value={title} onChange={setTitle} placeholder="One priority for the semester" />

      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
          Description
        </label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          placeholder="What are we agreeing this actually means, and what does done look like?"
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-stone-500">
          Two people can carry the same three words toward different finish lines. Write it down once.
        </p>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Owner</label>
        <select
          value={ownerUid}
          onChange={(e) => pickOwner(e.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Organization, no single owner</option>
          {members.filter((m) => m.active).map((m) => (
            <option key={m.uid} value={m.uid}>{m.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">
          One owner, one measure, one date. A rock owned by everyone is owned by nobody.
        </p>
      </div>

      <Field label="Due" value={due} onChange={setDue} type="date" />
      <Field label="Order on the board" value={order} onChange={setOrder} type="number" />

      {!rock && (
        <div className="mb-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Starting status</label>
          <div className="flex flex-wrap gap-2">
            {ROCK_STATUSES.map((s) => (
              <button
                key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  status === s ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
      {rock && (
        <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
          Status moves through the status button on the board, because a status change requires a note.
        </p>
      )}
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
    </Modal>
  );
}

/* ------------------------------------------------------------------ issues */

const OTHER = '__other__';

/**
 * Add or edit an issue.
 *
 * Who raised it is a field you set, not an accident of who clicked the button.
 * In a DLT meeting one person is usually typing while several people are
 * raising, so the two have to be separable. The audit stamp still records who
 * actually made the write, and that part nobody can set.
 */
export function IssueEditor({
  issue, members, canEdit, meUid, nextOrder, onClose,
}: {
  issue: Issue | null;          // null means create
  members: Member[];
  canEdit: boolean;             // editors may raise on someone else's behalf
  meUid: string;
  nextOrder: number;
  onClose: () => void;
}) {
  const seated = members.filter((m) => m.active);
  const me = seated.find((m) => m.uid === meUid);

  const knownRaiser = issue ? seated.some((m) => m.uid === issue.raisedByUid) : true;
  const [text, setText] = useState(issue?.text ?? '');
  const [note, setNote] = useState(issue?.note ?? '');
  const [longTerm, setLongTerm] = useState(!!issue?.longTerm);
  const [raisedByUid, setRaisedByUid] = useState(
    issue ? (knownRaiser ? issue.raisedByUid : OTHER) : meUid,
  );
  const [otherName, setOtherName] = useState(
    issue && !knownRaiser ? issue.raisedByLabel : '',
  );
  const [raised, setRaised] = useState(
    issue?.raised ?? new Date().toISOString().slice(0, 10),
  );
  const { saving, error, run } = useSave(onClose);

  const isOther = raisedByUid === OTHER;
  const raisedByLabel = isOther
    ? otherName.trim()
    : (seated.find((m) => m.uid === raisedByUid)?.name ?? me?.name ?? 'Unknown');
  const valid = text.trim().length > 1 && raisedByLabel.length > 0 && raised.length === 10;

  function save() {
    const common = {
      text: text.trim(),
      note: note.trim(),
      longTerm,
      raised,
      // Someone who has not signed in yet has no uid. Keep the name and leave the
      // uid empty rather than attaching the issue to the wrong person.
      raisedByUid: isOther ? '' : raisedByUid,
      raisedByLabel,
    };
    return run(() => (issue
      ? updateIssue(issue.id, common)
      : raiseIssue({ ...common, order: nextOrder })));
  }

  return (
    <Modal
      title={issue ? 'Edit issue' : 'Add an issue'}
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" disabled={!valid || saving} onClick={save}>
            {saving ? 'Saving' : issue ? 'Save' : 'Add it'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {issue && (
            <button
              type="button"
              className="ml-auto text-sm font-medium text-red-700"
              onClick={() => {
                if (window.confirm('Delete this issue? Closing it keeps the record. Deleting removes it.')) {
                  void run(() => deleteIssue(issue.id));
                }
              }}
            >
              Delete
            </button>
          )}
        </>
      }
    >
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Issue</label>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder="What is the issue, in one sentence?"
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
          Raised by
        </label>
        <select
          value={raisedByUid}
          disabled={!canEdit}
          onChange={(e) => setRaisedByUid(e.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm disabled:opacity-60"
        >
          {seated.map((m) => (
            <option key={m.uid} value={m.uid}>{m.name}{m.uid === meUid ? ', you' : ''}</option>
          ))}
          <option value={OTHER}>Someone else</option>
        </select>
        {isOther && (
          <input
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder="Their name"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <p className="mt-1 text-xs text-stone-500">
          {canEdit
            ? 'Whose issue this is. The record of who typed it is kept separately and cannot be changed.'
            : 'You can only raise an issue in your own name.'}
        </p>
      </div>

      <Field label="Raised on" value={raised} onChange={setRaised} type="date"
        hint="Back date it if you are logging something from an earlier meeting." />

      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Notes</label>
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="Context, or who is on it."
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={longTerm} onChange={(e) => setLongTerm(e.target.checked)} />
        Long term. Watching it past ninety days, not solving it this semester.
      </label>

      {issue && (
        <p className="mt-3 text-xs text-stone-500">
          Deleting is not the same as closing. Closing asks what you decided and keeps the trail. Prefer it.
        </p>
      )}
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
    </Modal>
  );
}

/* -------------------------------------------- campuses, NextGen, priorities */

export function GroupEditor({
  group, path, onClose,
}: { group: PriorityGroup; path: string; onClose: () => void }) {
  const [name, setName] = useState(group.name);
  const [pastor, setPastor] = useState(group.pastor ?? '');
  const [goal, setGoal] = useState(String(group.attendanceGoal ?? 0));
  const [priorities, setPriorities] = useState<string[]>([
    group.priorities?.[0] ?? '', group.priorities?.[1] ?? '', group.priorities?.[2] ?? '',
  ]);
  const { saving, error, run } = useSave(onClose);

  return (
    <Modal
      title={`Edit ${group.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" disabled={saving} onClick={() => run(() =>
            updateGroup(path, group.id, {
              name: name.trim(), pastor: pastor.trim(), attendanceGoal: Number(goal) || 0,
              priorities: priorities.map((p) => p.trim()).filter((p) => p.length > 0),
            }))}
          >
            {saving ? 'Saving' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Pastor or owner" value={pastor} onChange={setPastor} />
      <Field
        label="Semester attendance goal" value={goal} onChange={setGoal} type="number"
        hint="Leave at 0 for a department that does not carry an attendance number."
      />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
        Semester priorities, up to three
      </label>
      {priorities.map((p, i) => (
        <input
          key={i} value={p}
          onChange={(e) => setPriorities((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))}
          placeholder={`Priority ${i + 1}`}
          className="mb-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ))}
      <p className="text-xs text-stone-500">
        Three is the cap on purpose. A campus with six priorities has none.
      </p>
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
    </Modal>
  );
}

/* ----------------------------------------------------------------- picture */

export function PictureEditor({ picture, onClose }: { picture: Picture; onClose: () => void }) {
  const [vision, setVision] = useState(picture.vision ?? '');
  const [f, setF] = useState({
    revenue: picture.revenue ?? '', cash: picture.cash ?? '', debt: picture.debt ?? '',
    dt: picture.dt ?? '', groups: picture.groups ?? '',
  });
  const [attendance, setAttendance] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(picture.attendance ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const { saving, error, run } = useSave(onClose);

  return (
    <Modal
      title={`Edit ${picture.label}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" disabled={saving} onClick={() => run(() =>
            updatePicture(picture.id, {
              ...f, vision: vision.trim(),
              attendance: Object.fromEntries(
                Object.entries(attendance).map(([k, v]) => [k, Number(v) || 0]),
              ),
            }))}
          >
            {saving ? 'Saving' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">Vision</label>
        <textarea
          value={vision} onChange={(e) => setVision(e.target.value)} rows={4}
          placeholder="What The Point looks like at this point, in plain language. Two or three sentences."
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <Field label="Revenue target" value={f.revenue} onChange={(v) => setF({ ...f, revenue: v })} />
      <Field label="Year end cash" value={f.cash} onChange={(v) => setF({ ...f, cash: v })} />
      <Field label="Year end debt" value={f.debt} onChange={(v) => setF({ ...f, debt: v })} />
      <Field label="Dream Team capacity" value={f.dt} onChange={(v) => setF({ ...f, dt: v })} />
      <Field label="Groups involvement" value={f.groups} onChange={(v) => setF({ ...f, groups: v })} />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
        Attendance by campus
      </label>
      <p className="mb-2 text-xs text-stone-500">
        Total is calculated from these, so it can never disagree with the parts.
      </p>
      {Object.keys(attendance).map((k) => (
        <div key={k} className="mb-2 flex items-center gap-2">
          <span className="flex-1 text-sm text-stone-700">{k}</span>
          <input
            type="number" value={attendance[k]}
            onChange={(e) => setAttendance({ ...attendance, [k]: e.target.value })}
            className="w-28 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-sm tabular-nums"
          />
        </div>
      ))}
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
    </Modal>
  );
}
