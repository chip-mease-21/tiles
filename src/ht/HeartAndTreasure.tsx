/**
 * The Heart and Treasure tab.
 *
 * Deliberately thin. It works out who is in the space, hands that to the same
 * board component your personal tiles use, and adds the one screen that has no
 * personal equivalent: who else is in here.
 */
import { useEffect, useMemo, useState } from 'react';
import TilesApp from '../TilesApp';
import { useOrg } from '../context/OrgContext';
import {
  HT_NAME, deleteSpaceInvite, htScope, moveToSpace, readMyTiles, saveSpaceInvite,
  setSpaceMemberActive, watchSpaceInvites, watchSpaceMembers,
  type SpaceInvite, type SpaceMember,
} from './space';
import type { Entry } from '../types';

export function HeartAndTreasure() {
  const { user } = useOrg();
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [showPeople, setShowPeople] = useState(false);
  const [showBring, setShowBring] = useState(false);

  useEffect(() => watchSpaceMembers(setMembers), []);

  const people = useMemo(
    () => members.filter((m) => m.active).map((m) => ({ uid: m.uid, name: m.name })),
    [members],
  );
  const scope = useMemo(
    () => (user ? htScope(user.uid, people) : null),
    [user, people],
  );

  if (!scope) return null;

  return (
    <>
      <div className="flex items-center justify-end gap-3 px-4 pt-2 text-xs text-muted">
        <span>
          Shared with {people.filter((p) => p.uid !== user?.uid).map((p) => p.name).join(', ') || 'nobody yet'}
        </span>
        <button className="underline hover:text-text" onClick={() => setShowBring(true)}>
          Bring tiles over
        </button>
        <button className="underline hover:text-text" onClick={() => setShowPeople(true)}>
          Who is in here
        </button>
      </div>
      <TilesApp scope={scope} title={HT_NAME} />
      {showPeople && <PeoplePanel members={members} onClose={() => setShowPeople(false)} />}
      {showBring && user && <BringPanel uid={user.uid} onClose={() => setShowBring(false)} />}
    </>
  );
}

function PeoplePanel({ members, onClose }: { members: SpaceMember[]; onClose: () => void }) {
  const [invites, setInvites] = useState<SpaceInvite[]>([]);
  const [draft, setDraft] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => watchSpaceInvites(setInvites), []);

  async function invite() {
    setError('');
    const email = draft.email.trim().toLowerCase();
    if (!draft.name.trim() || !email.includes('@')) {
      setError('A name and a real email address are both required.');
      return;
    }
    try {
      await saveSpaceInvite({ name: draft.name.trim(), email });
      setDraft({ name: '', email: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const seated = new Set(members.map((m) => m.email?.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-panel p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Who is in Heart and Treasure</h2>
          <button className="text-sm text-muted hover:text-text" onClick={onClose}>Close</button>
        </div>

        <ul className="mb-4 divide-y divide-edge">
          {members.map((m) => (
            <li key={m.uid} className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{m.name}</p>
                <p className="text-xs text-muted">{m.email}</p>
              </div>
              <button
                className="text-xs text-muted underline hover:text-text"
                onClick={() => void setSpaceMemberActive(m.uid, !m.active)}
              >
                {m.active ? 'Remove' : 'Restore'}
              </button>
            </li>
          ))}
        </ul>

        {invites.filter((i) => !seated.has(i.email)).length > 0 && (
          <>
            <p className="mb-1 text-xs font-medium text-muted">Invited, not signed in yet</p>
            <ul className="mb-4 divide-y divide-edge">
              {invites.filter((i) => !seated.has(i.email)).map((i) => (
                <li key={i.email} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm text-text">{i.name}</p>
                    <p className="text-xs text-muted">{i.email}</p>
                  </div>
                  <button
                    className="text-xs text-muted underline hover:text-text"
                    onClick={() => void deleteSpaceInvite(i.email)}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mb-2 text-xs text-muted">
          Add the address on their Google account. The board is waiting for them the first time they sign in,
          and they see nothing else in here.
        </p>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Name"
          className="mb-2 w-full rounded-lg border border-edge bg-column px-3 py-2 text-sm text-text"
        />
        <input
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          placeholder="name@example.com"
          className="mb-2 w-full rounded-lg border border-edge bg-column px-3 py-2 text-sm text-text"
        />
        {error && <p className="mb-2 text-xs font-medium text-red-400">{error}</p>}
        <button
          onClick={invite}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Invite
        </button>
      </div>
    </div>
  );
}

/**
 * Move work that is already on your private board into the shared one.
 *
 * Grouped by tag because that is how the work was filed in the first place.
 * Nothing moves until you pick a tag and confirm, and what moves is exactly
 * what is listed, so there is no guessing about scope.
 */
function BringPanel({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [mine, setMine] = useState<Entry[] | null>(null);
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    readMyTiles(uid).then(setMine).catch((e) => setError(String(e)));
  }, [uid]);

  const live = (mine ?? []).filter((e) => !e.archived);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of live) for (const t of e.tags ?? []) m[t] = (m[t] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [mine]);

  const picked = tag ? live.filter((e) => (e.tags ?? []).includes(tag)) : [];

  async function move() {
    setBusy(true);
    setError('');
    let n = 0;
    try {
      for (const e of picked) {
        await moveToSpace(e, uid);
        n += 1;
        setDone(n);
      }
      setMine(await readMyTiles(uid));
      setTag('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-panel p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Bring tiles over</h2>
          <button className="text-sm text-muted hover:text-text" onClick={onClose}>Close</button>
        </div>

        <p className="mb-3 text-xs text-muted">
          Moves tiles off your private board and into Heart and Treasure, where Karen can see them. They keep
          their column, tags, tasks and due date, and arrive assigned to you. Archived tiles are left alone.
        </p>

        {mine === null && <p className="text-sm text-muted">Reading your board…</p>}

        {mine !== null && counts.length === 0 && (
          <p className="text-sm text-muted">Nothing on your board carries a tag yet.</p>
        )}

        {counts.length > 0 && (
          <>
            <p className="mb-1 text-xs font-medium text-muted">Pick a tag</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {counts.map(([t, n]) => (
                <button
                  key={t}
                  onClick={() => setTag(t === tag ? '' : t)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    t === tag
                      ? 'bg-accent font-semibold text-white'
                      : 'border border-edge bg-column text-muted hover:text-text'
                  }`}
                >
                  #{t} {n}
                </button>
              ))}
            </div>
          </>
        )}

        {tag && (
          <>
            <p className="mb-1 text-xs font-medium text-muted">
              These {picked.length} will move. Nothing else.
            </p>
            <ul className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-edge">
              {picked.map((e) => (
                <li key={e.id} className="border-b border-edge px-3 py-1.5 text-sm text-text last:border-0">
                  {e.title || <span className="italic text-muted">Untitled</span>}
                </li>
              ))}
            </ul>
            <button
              onClick={() => void move()}
              disabled={busy || picked.length === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? `Moving ${done} of ${picked.length}` : `Move ${picked.length} to ${HT_NAME}`}
            </button>
          </>
        )}

        {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
        <p className="mt-3 text-xs text-muted">
          One at a time, so a failure halfway leaves the rest where they were rather than in an unclear state.
          To move a single tile without a tag, open it on your board and use Move to {HT_NAME}.
        </p>
      </div>
    </div>
  );
}
