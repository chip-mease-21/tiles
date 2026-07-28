/**
 * The only screen editors cannot reach. Membership is the escalation surface,
 * so it stays with the admin, and the security rules say so independently of
 * whether this component is rendered.
 *
 * Firebase Auth uids only exist after a person signs in once, so seating
 * someone is a two step move: they sign in, they read their uid off the empty
 * seat screen and send it over, you paste it here. At this team size that is
 * cheaper than a Cloud Function.
 */
import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { setMemberActive, upsertMember, watchMembers } from '../lib/org';
import type { Member, Role } from '../types/dlt';
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
  const [draft, setDraft] = useState({ uid: '', name: '', email: '', role: 'dlt' as Role });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    return watchMembers(setMembers);
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
          <Card title="Seat someone">
            <div className="space-y-2 p-3">
              <p className="text-xs text-stone-600">
                Have them sign in once. The app shows them their uid on the empty seat screen. Paste it here.
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
