/**
 * The shared board, laid out in the order of the DLT meeting so the screen can
 * be used as the agenda.
 */
import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import {
  reopenIssue, updateGroup, updateCulture, updateSettings, paths,
  watchCulture, watchDecisions, watchGroups, watchIssues, watchPicture, watchRocks,
  watchMembers, markDecisionReviewed,
} from '../lib/org';
import {
  type CultureGroup, type Decision, type Issue, type Member, type Picture,
  type PriorityGroup, type Rock, type RockStatus,
} from '../types/dlt';
import { Button, Card, Section, StatusChip, daysSince, fmtDate } from './ui';
import { RockBoard } from './RockBoard';
import { IssueList } from './IssueList';
import { StatusEditor } from './StatusEditor';
import { ResolveIssueDialog } from './ResolveIssueDialog';
import { GroupEditor, IssueEditor, PictureEditor, RockEditor } from './Editors';

/** The Point runs semesters, not quarters. Fall setting starts mid August. */
const SEMESTERS = [
  { id: '2026-spring', label: 'Spring 2026' },
  { id: '2026-summer', label: 'Summer 2026' },
  { id: '2026-fall', label: 'Fall 2026' },
  { id: '2027-spring', label: 'Spring 2027' },
];

/** Cycles the three grades used on campus, NextGen and culture rows. */
const CYCLE: RockStatus[] = ['on-track', 'caution', 'off-track'];
function nextStatus(current: RockStatus): RockStatus {
  const i = CYCLE.indexOf(current);
  return CYCLE[(i + 1) % CYCLE.length] ?? 'on-track';
}

export function DltWorkspace() {
  const { member, settings, canEdit, canSeeBoard, user } = useOrg();
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [campuses, setCampuses] = useState<PriorityGroup[]>([]);
  const [nextgen, setNextgen] = useState<PriorityGroup[]>([]);
  const [departments, setDepartments] = useState<PriorityGroup[]>([]);
  const [culture, setCulture] = useState<CultureGroup[]>([]);
  const [picture, setPicture] = useState<Picture[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingRock, setEditingRock] = useState<Rock | null>(null);
  const [resolving, setResolving] = useState<Issue | null>(null);
  const [rockForm, setRockForm] = useState<{ rock: Rock | null } | null>(null);
  const [issueForm, setIssueForm] = useState<{ issue: Issue | null } | null>(null);
  const [groupForm, setGroupForm] = useState<{ group: PriorityGroup; path: string } | null>(null);
  const [pictureForm, setPictureForm] = useState<Picture | null>(null);
  const [semesterOverride, setSemesterOverride] = useState<string | null>(null);
  const semester = semesterOverride ?? settings?.semester ?? '2026-summer';

  useEffect(() => {
    if (!canSeeBoard) return;
    const unsubs = [
      watchRocks(semester, setRocks),
      watchIssues(setIssues),
      watchDecisions(setDecisions),
      watchGroups(paths.campuses, setCampuses),
      watchGroups(paths.nextgen, setNextgen),
      watchGroups(paths.departments, setDepartments),
      watchCulture(setCulture),
      watchPicture(setPicture),
      ...(canEdit ? [watchMembers(setMembers)] : []),
    ];
    return () => unsubs.forEach((u) => u());
  }, [canSeeBoard, canEdit, semester]);

  // A contributor cannot list the roster, so they see only themselves as a
  // possible raiser. That is exactly what the rules let them write.
  useEffect(() => {
    if (!canEdit && member) setMembers([member]);
  }, [canEdit, member]);

  const open = issues.filter((i) => i.status !== 'done' && !i.longTerm);
  const longTerm = issues.filter((i) => i.longTerm && i.status !== 'done');
  const closed = issues.filter((i) => i.status === 'done');
  const decisionsDue = decisions.filter(
    (d) => d.reviewDue && !d.reviewedAt && (daysSince(d.reviewDue) ?? -1) >= 0,
  );

  if (!canSeeBoard) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4">
      <header className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">DLT Board</h1>
        </div>
        <label className="text-xs text-stone-500">
          Semester{' '}
          <select
            value={semester}
            onChange={(e) => setSemesterOverride(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
          >
            {SEMESTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {semesterOverride && semesterOverride !== settings?.semester && (
          <span className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-stone-800">
            Viewing another semester
            {canEdit && (
              <button
                type="button" className="ml-1.5 underline"
                onClick={() => void updateSettings({ semester: semesterOverride })}
              >
                make it current
              </button>
            )}
          </span>
        )}
      </header>

      {decisionsDue.length > 0 && (
        <div className="mb-4 rounded-xl border border-stone-200 border-l-4 border-l-amber-500 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-stone-900">
            {decisionsDue.length} decision{decisionsDue.length > 1 ? 's are' : ' is'} due for a closed loop review
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Did it work? That question is what turns a decision log into memory.
          </p>
        </div>
      )}

      <Section title="Rock review" hint="Five minutes. On track or off track. If off track, drop it to issues.">
        <RockBoard
          rocks={rocks}
          members={members}
          canEdit={canEdit}
          userUid={user?.uid}
          onStatus={setEditingRock}
          onEdit={(r) => setRockForm({ rock: r })}
          onAdd={() => setRockForm({ rock: null })}
        />
      </Section>

      <Section title="IDS" hint="Forty minutes. Every issue ends with a to do, an owner and a date.">
        <div className="grid gap-3 lg:grid-cols-2">
          <IssueList
            issues={open}
            canEdit={canEdit}
            userUid={user?.uid}
            onClose={setResolving}
            onEdit={(i) => setIssueForm({ issue: i })}
            onAdd={() => setIssueForm({ issue: null })}
          />

          <div className="space-y-3">
            <Card title="Campuses">
              <PriorityList groups={campuses} path={paths.campuses} canEdit={canEdit} onEdit={setGroupForm} showGoal />
            </Card>
            <Card title="NextGen">
              <PriorityList groups={nextgen} path={paths.nextgen} canEdit={canEdit} onEdit={setGroupForm} />
            </Card>
            <Card title="Departments">
              <PriorityList groups={departments} path={paths.departments} canEdit={canEdit} onEdit={setGroupForm} />
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Decided and parked" hint="What is closed, and what we are watching past ninety days.">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Decision log">
            <ul className="divide-y divide-stone-100">
              {decisions.map((d) => {
                const due = d.reviewDue && !d.reviewedAt && (daysSince(d.reviewDue) ?? -1) >= 0;
                return (
                  <li key={d.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-medium text-stone-900">{d.issue}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-stone-400">Decided {fmtDate(d.decided)}</span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {d.notes.map((n, k) => (
                        <li key={k} className="text-xs text-stone-600">· {n}</li>
                      ))}
                    </ul>
                    {due && canEdit && (
                      <div className="mt-1.5">
                        <Button variant="ghost" onClick={() => void markDecisionReviewed(d.id)}>
                          Review due {fmtDate(d.reviewDue!)}. Mark reviewed.
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
              {decisions.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-500">Nothing logged yet.</li>}
            </ul>
          </Card>

          <div className="space-y-3">
            <Card title="Long term issues">
              <ul className="divide-y divide-stone-100">
                {longTerm.map((i) => (
                  <li key={i.id} className="px-3 py-2.5">
                    <p className="text-sm text-stone-900">{i.text}</p>
                    {i.note && <p className="mt-0.5 text-xs text-stone-500">{i.note}</p>}
                  </li>
                ))}
                {longTerm.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-500">Nothing parked.</li>}
              </ul>
            </Card>
            <Card title="Closed" right={<span className="text-xs text-stone-500">{closed.length}</span>}>
              <ul className="divide-y divide-stone-100">
                {closed.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-start gap-2 px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm text-stone-500 line-through">{i.text}</p>
                      {i.closeReason && <p className="text-xs text-stone-500">Closed: {i.closeReason}</p>}
                      {i.decisionId && <p className="text-xs text-stone-500">Produced a decision</p>}
                    </div>
                    {canEdit && <Button variant="ghost" onClick={() => void reopenIssue(i.id)}>Reopen</Button>}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Operating system" hint="Graded honestly each week. This is how we live our values, not just say them.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {culture.map((g) => (
            <Card key={g.id} title={g.group}>
              <ul className="divide-y divide-stone-100">
                {g.items.map((it, idx) => (
                  <li key={it.label} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm text-stone-800">{it.label}</span>
                    {canEdit
                      ? <StatusChip status={it.status} onClick={() => cycleCulture(g, idx)} />
                      : <StatusChip status={it.status} />}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="1 and 3 year picture" hint="What success looks like, this year and three years out.">
        <div className="grid gap-3 lg:grid-cols-2">
          {picture.map((p) => (
            <Card
              key={p.id}
              title={p.label}
              right={canEdit ? <Button variant="ghost" onClick={() => setPictureForm(p)}>Edit</Button> : undefined}
            >
              {p.vision
                ? <p className="border-b border-stone-100 px-3 py-3 text-sm leading-relaxed text-stone-700">{p.vision}</p>
                : <p className="border-b border-stone-100 px-3 py-3 text-sm italic text-stone-400">
                    No vision written yet. Two or three sentences in plain language.
                  </p>}
              <ul className="divide-y divide-stone-100">
                {[['Revenue', p.revenue], ['Year end cash', p.cash], ['Year end debt', p.debt],
                  ['Dream Team capacity', p.dt], ['Groups involvement', p.groups]].map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm text-stone-700">{k}</span>
                    <span className="text-sm font-semibold tabular-nums text-stone-900">{v}</span>
                  </li>
                ))}
                {Object.entries(p.attendance ?? {}).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm text-stone-500">{k}</span>
                    <span className="text-sm tabular-nums text-stone-600">{v}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 bg-stone-50 px-3 py-2">
                  <span className="flex-1 text-sm font-semibold text-stone-900">Total attendance</span>
                  <span className="text-sm font-semibold tabular-nums text-stone-900">
                    {Object.values(p.attendance ?? {}).reduce((a, b) => a + Number(b || 0), 0).toLocaleString()}
                  </span>
                </li>
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {editingRock && <StatusEditor rock={editingRock} onClose={() => setEditingRock(null)} />}
      {resolving && <ResolveIssueDialog issue={resolving} onClose={() => setResolving(null)} />}
      {rockForm && (
        <RockEditor rock={rockForm.rock} semester={semester} members={members} onClose={() => setRockForm(null)} />
      )}
      {issueForm && (
        <IssueEditor
          issue={issueForm.issue}
          members={members}
          canEdit={canEdit}
          meUid={user?.uid ?? ''}
          nextOrder={issues.length + 1}
          onClose={() => setIssueForm(null)}
        />
      )}
      {groupForm && (
        <GroupEditor group={groupForm.group} path={groupForm.path} onClose={() => setGroupForm(null)} />
      )}
      {pictureForm && <PictureEditor picture={pictureForm} onClose={() => setPictureForm(null)} />}
    </div>
  );

  function cycleCulture(g: CultureGroup, idx: number) {
    const current = g.items[idx];
    if (!current) return;
    const items = g.items.map((it, k) => (k === idx ? { ...it, status: nextStatus(it.status) } : it));
    void updateCulture(g.id, { items });
  }
}

function PriorityList({
  groups, path, canEdit, onEdit, showGoal = false,
}: {
  groups: PriorityGroup[]; path: string; canEdit: boolean;
  onEdit: (g: { group: PriorityGroup; path: string }) => void;
  showGoal?: boolean;
}) {
  return (
    <ul className="divide-y divide-stone-100">
      {groups.map((g) => (
        <li key={g.id} className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-semibold text-stone-900">
              {g.name}
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Edit ${g.name}`}
                  className="ml-1.5 text-xs font-normal text-stone-400 hover:text-stone-700"
                  onClick={() => onEdit({ group: g, path })}
                >
                  edit
                </button>
              )}
            </span>
            {canEdit
              ? <StatusChip status={g.status} onClick={() => cycle(g)} />
              : <StatusChip status={g.status} />}
          </div>
          {showGoal && (
            <p className="mt-1 text-xs text-stone-600">
              <span className="font-semibold">Semester attendance goal: </span>
              <span className="tabular-nums">{g.attendanceGoal ? g.attendanceGoal.toLocaleString() : 'not set'}</span>
            </p>
          )}
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            Semester priorities
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {g.priorities.map((p) => <li key={p} className="text-xs text-stone-600">· {p}</li>)}
            {g.priorities.length === 0 && <li className="text-xs italic text-stone-400">None set</li>}
          </ul>
        </li>
      ))}
      {groups.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-500">Nothing here yet.</li>}
    </ul>
  );

  function cycle(g: PriorityGroup) {
    void updateGroup(path, g.id, { status: nextStatus(g.status) });
  }
}
