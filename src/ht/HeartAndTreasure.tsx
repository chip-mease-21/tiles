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
  HT_NAME, deleteSpaceInvite, htScope, saveSpaceInvite, setSpaceMemberActive,
  watchSpaceInvites, watchSpaceMembers, type SpaceInvite, type SpaceMember,
} from './space';

export function HeartAndTreasure() {
  const { user } = useOrg();
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [showPeople, setShowPeople] = useState(false);

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
        <button className="underline hover:text-text" onClick={() => setShowPeople(true)}>
          Who is in here
        </button>
      </div>
      <TilesApp scope={scope} title={HT_NAME} />
      {showPeople && <PeoplePanel members={members} onClose={() => setShowPeople(false)} />}
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
