/**
 * Who can see what.
 *
 * Two surfaces, roles and annual goals, each shareable two ways: to the whole
 * DLT, or to named people. Named people do not have to sit on the DLT, so you
 * can show your card to one person without publishing it to the leadership
 * table.
 *
 * Weekly reviews are absent on purpose. There is no control for them here
 * because there is no rule that would honour one.
 */
import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { saveSharing } from '../lib/me';
import { watchMembers } from '../lib/org';
import type { Profile } from '../types/me';
import type { Member } from '../types/dlt';
import { Button, Modal } from '../dlt/ui';

type Surface = 'Roles' | 'Goals';

export function ShareSummary({ profile, onOpen }: { profile: Profile; onOpen: () => void }) {
  const named = new Set([...(profile.shareRolesWith ?? []), ...(profile.shareGoalsWith ?? [])]);
  const parts: string[] = [];
  if (profile.shareRoles) parts.push('roles with the DLT');
  if (profile.shareGoals) parts.push('goals with the DLT');
  if (named.size) parts.push(`with ${named.size} ${named.size === 1 ? 'person' : 'people'} by name`);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
      <span className="text-xs text-stone-600">
        {parts.length
          ? <>Sharing <span className="font-medium text-stone-800">{parts.join(', ')}</span>.</>
          : <>Nothing is shared. Everything on this page is private to you.</>}
      </span>
      <Button variant="ghost" onClick={onOpen}>Change who can see this</Button>
      <span className="text-xs italic text-stone-400">
        Your weekly reviews are never shared. Only the date you ran one.
      </span>
    </div>
  );
}

export function ShareDialog({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { user, member, canEdit } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [f, setF] = useState({
    shareRoles: !!profile.shareRoles,
    shareGoals: !!profile.shareGoals,
    shareRolesWith: profile.shareRolesWith ?? [],
    shareGoalsWith: profile.shareGoalsWith ?? [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only editors can list the roster. Anyone else shares to the DLT as a whole
    // or not at all, which is the same limit the rules put on them.
    if (!canEdit) return;
    return watchMembers(setMembers);
  }, [canEdit]);

  const others = members.filter((m) => m.active && m.uid !== user?.uid);

  function togglePerson(surface: Surface, uid: string) {
    const key = surface === 'Roles' ? 'shareRolesWith' : 'shareGoalsWith';
    setF((p) => ({
      ...p,
      [key]: p[key].includes(uid) ? p[key].filter((x) => x !== uid) : [...p[key], uid],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await saveSharing(f, profile, member?.name ?? 'Someone');
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal
      title="Who can see this"
      onClose={onClose}
      footer={
        <>
          <Button variant="brand" onClick={save} disabled={saving}>{saving ? 'Saving' : 'Save'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      {(['Roles', 'Goals'] as const).map((surface) => {
        const allKey = surface === 'Roles' ? 'shareRoles' : 'shareGoals';
        const listKey = surface === 'Roles' ? 'shareRolesWith' : 'shareGoalsWith';
        return (
          <div key={surface} className="mb-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-500">
              My {surface === 'Roles' ? 'Roles and Expectations' : 'annual goals'}
            </p>
            <label className="mb-2 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
              <input
                type="checkbox" checked={f[allKey]}
                onChange={(e) => setF({ ...f, [allKey]: e.target.checked })}
              />
              Everyone on the DLT
            </label>
            {canEdit && others.length > 0 && (
              <>
                <p className="mb-1 text-xs text-stone-500">Or specific people</p>
                <div className="space-y-1">
                  {others.map((m) => (
                    <label
                      key={m.uid}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-stone-50"
                    >
                      <input
                        type="checkbox"
                        checked={f[listKey].includes(m.uid)}
                        onChange={() => togglePerson(surface, m.uid)}
                      />
                      {m.name}
                      <span className="text-xs text-stone-400">{m.role}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

      <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        Sharing grants reading, never writing. Nobody you share with can change a word of your card, and
        you can take any of this back at any time. Your weekly reviews are not on this list because there
        is no setting that would share them.
      </p>
    </Modal>
  );
}
