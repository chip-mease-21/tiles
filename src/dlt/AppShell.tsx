/**
 * Where a signed in person lands.
 *
 * Wrap the existing app in <OrgProvider> and render <AppShell tiles={<Board/>}/>
 * in place of the current board, passing the existing Tiles board as a child.
 * Everyone keeps their personal board regardless of role, because entries are
 * private per user and nobody can see anyone else's.
 */
import React, { useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { DltWorkspace } from './DltWorkspace';
import { MemberAdmin } from '../admin/MemberAdmin';
import { MyWork } from '../me/MyWork';
import { TeamCards } from '../me/TeamCards';

type Tab = 'tiles' | 'me' | 'dlt' | 'team' | 'members';

export function AppShell({ tiles }: { tiles: React.ReactNode }) {
  const { canSeeBoard, isAdmin, loading, user } = useOrg();
  const [tab, setTab] = useState<Tab>('tiles');

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-500">Loading</div>;
  }

  // Nobody seated on the shared board sees any of this. The app is exactly what
  // it was before.
  if (!canSeeBoard) return <>{tiles}</>;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tiles', label: 'My tiles' },
    { id: 'me', label: 'My roles' },
    { id: 'dlt', label: 'DLT board' },
    { id: 'team', label: 'Team' },
    ...(isAdmin ? [{ id: 'members' as Tab, label: 'Members' }] : []),
  ];

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 px-4 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      {tab === 'tiles' && tiles}
      {tab === 'me' && <MyWork />}
      {tab === 'dlt' && <DltWorkspace />}
      {tab === 'team' && <TeamCards />}
      {tab === 'members' && <MemberAdmin />}
      {user && <span className="sr-only">Signed in as {user.uid}</span>}
    </>
  );
}

/**
 * Shown to a signed in person with no seat who is expecting one. Give them a
 * way to read their own uid so an admin can seat them.
 */
export function EmptySeat() {
  const { user } = useOrg();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <h2 className="text-base font-semibold text-stone-900">You are signed in</h2>
      <p className="mt-2 text-sm text-stone-600">
        You do not have a seat on the DLT board yet. Send this id to Chip and he can add you.
      </p>
      <code className="mt-3 block break-all rounded-lg bg-stone-100 px-3 py-2 text-xs">{user.uid}</code>
      <button
        type="button"
        className="mt-3 text-sm underline"
        onClick={() => void navigator.clipboard?.writeText(user.uid)}
      >
        Copy it
      </button>
    </div>
  );
}
