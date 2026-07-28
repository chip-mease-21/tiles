/**
 * The only screen editors cannot reach. Membership is the escalation surface,
 * so it stays with the admin, and the security rules say so independently of
 * whether this component is rendered.
 *
 * Two ways in. An invite assigns a seat to an email address before that person
 * has ever signed in, and the app claims it for them the first time they do.
 * That is the normal path and it keeps the admin out of the loop entirely.
 *
 * Pasting a raw uid is the fallback for someone already signed in, or for an
 * address that does not match the one on their Google account. Firebase uids
 * only exist after a first sign in, which is exactly the round trip invites
 * were added to remove.
 */
import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import {
  deleteInvite, saveInvite, setMemberActive, upsertMember, watchInvites, watchMembers,
} from '../lib/org';
import type { Invite, Member, Role } from '../types/dlt';
import { Button, Card, Section } from '../dlt/ui';

const ROLES: { value: Role; label: string; blurb: string }[] = [
  { value: 'admin', label: 'Admin', blurb: 'Everything, including membership' },
  { value: 'dlt', label: 'DLT', blurb: 'Changes anything on the board, not membership' },
  { value: 'contributor', label: 'Contributor', blurb: 'Reads the board, updates only rocks they own' },
  { value: 'campus', label: 'Campus', blurb: 'No board access yet' },
];

export function MemberAdmin() {
  const { isAdmin, user } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [draft, setDraft] = useState({ uid: '', name: '', email: '', role: 'dlt' as Role });
  const [inv, setInv] = useState({ name: '', email: '', role: 'dlt' as Invite['role'] });
  const [error, setError] = useState('');
  const [invError, setInvError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    return watchMembers(setMembers);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    return watchInvites(setInvites);
  }, [isAdmin]);

  if (!isAdmin) return null;

  async function add() {
    setError('');
    if (!draft.uid.trim() || !draft.name.trim()) { setError('A uid and a name are both required.'); return; }
    try {
      await upsertMember({
        uid: draft.uid.trim(), name: draft.name.trim(), email: draft.email.trim(),
        role: draft.role, active: true, campusId: null,
      });
      setDraft({ uid: '', name: '', email: '', role: 'dlt' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function invite() {
    setInvError('');
    const email = inv.email.trim().toLowerCase();
    if (!inv.name.trim() || !email.includes('@')) {
      setInvError('A name and a real email address are both required.');
      return;
    }
    if (members.some((m) => m.email?.toLowerCase() === email)) {
      setInvError('That address already has a seat.');
      return;
    }
    try {
      await saveInvite({ name: inv.name.trim(), email, role: inv.role, campusId: null });
      setInv({ name: '', email: '', role: 'dlt' });
    } catch (e) {
      setInvError(e instanceof Error ? e.message : String(e));
    }
  }

  // An invite whose person has since been seated has done its job.
  const claimed = new Set(members.map((m) => m.email?.toLowerCase()).filter(Boolean));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <Section title="Members" hint="Who sees the board, and what they may change.">
        <Card title="Seated">
          <ul className="divide-y divide-stone-100">
            {members.map((m) => {
              const self = m.uid === user?.uid;
              return (
                <li key={m.uid} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">
                      {m.name}{self && <span className="ml-1.5 text-xs font-normal text-stone-500">you</span>}
                    </p>
                    <p className="text-xs text-stone-500">{m.email || m.uid}</p>
                  </div>
                  <select
                    value={m.role}
                    disabled={self}
                    onChange={(e) => void upsertMember({ ...m, role: e.target.value as Role })}
                    className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <Button
                    variant="ghost"
                    disabled={self}
                    onClick={() => void setMemberActive(m.uid, !m.active)}
                  >
                    {m.active ? 'Remove' : 'Restore'}
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500">
            You cannot change or remove your own seat. There is no recovery path in the rules, so a self lockout
            would mean opening the Firebase console.
          </p>
        </Card>

        <div className="mt-3">
          <Card title="Invited, waiting on a first sign in">
            {invites.length === 0 ? (
              <p className="px-3 py-3 text-sm text-stone-500">
                Nobody is waiting. Add an address below and they are seated the moment they sign in.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {invites.map((i) => (
                  <li key={i.email} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{i.name}</p>
                      <p className="text-xs text-stone-500">{i.email}</p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      {ROLES.find((r) => r.value === i.role)?.label ?? i.role}
                    </span>
                    <span className="text-xs text-stone-400">
                      {claimed.has(i.email) ? 'claimed' : 'not signed in yet'}
                    </span>
                    <Button variant="ghost" onClick={() => void deleteInvite(i.email)}>Cancel</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="mt-3">
          <Card title="Invite by email">
            <div className="space-y-2 p-3">
              <p className="text-xs text-stone-600">
                They do not need to do anything first. Add the address on their church Google account and the
                seat is waiting for them. An invite can never grant Admin, so promoting somebody stays a
                deliberate act on this screen.
              </p>
              <input
                value={inv.name}
                onChange={(e) => setInv({ ...inv, name: e.target.value })}
                placeholder="Display name"
                className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
              />
              <input
                value={inv.email}
                onChange={(e) => setInv({ ...inv, email: e.target.value })}
                placeholder="name@thepointcville.com"
                className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
              />
              <select
                value={inv.role}
                onChange={(e) => setInv({ ...inv, role: e.target.value as Invite['role'] })}
                className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
              >
                {ROLES.filter((r) => r.value !== 'admin').map((r) => (
                  <option key={r.value} value={r.value}>{r.label}. {r.blurb}</option>
                ))}
              </select>
              {invError && <p className="text-xs font-medium text-red-700">{invError}</p>}
              <Button variant="brand" onClick={invite}>Save the invite</Button>
            </div>
          </Card>
        </div>

        <div className="mt-3">
          <Card title="Or paste a uid">
            <div className="space-y-2 p-3">
              <p className="text-xs text-stone-600">
                The fallback, for somebody already signed in or whose Google address differs from the one you
                invited. They read their uid off the empty seat screen.
              </p>
              {(['uid', 'name', 'email'] as const).map((field) => (
                <input
                  key={field}
                  value={draft[field]}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                  placeholder={field === 'uid' ? 'Firebase Auth uid' : field === 'name' ? 'Display name' : 'Email'}
                  className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
                />
              ))}
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
                className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}. {r.blurb}</option>)}
              </select>
              {error && <p className="text-xs font-medium text-red-700">{error}</p>}
              <Button variant="brand" onClick={add}>Seat them</Button>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
