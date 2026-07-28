/**
 * What people have chosen to show.
 *
 * Nothing appears here until its owner turns a toggle on, and the rules enforce
 * that independently of this screen. The pulse column shows only that somebody
 * ran their weekly review and when, never a word of what they wrote.
 */
import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { watchGoals, watchProfile, watchPulse, watchRoles, watchSharedWithMe } from '../lib/me';
import type { Goal, Profile, Pulse, Role } from '../types/me';
import type { Member } from '../types/dlt';
import { Card, Section, StatusChip, daysSince, fmtDate } from '../dlt/ui';
import { watchMembers } from '../lib/org';

function PersonCard({ member }: { member: Member }) {
  const { user } = useOrg();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const unsubs = [
      watchProfile(member.uid, setProfile),
      watchRoles(member.uid, setRoles),
      watchGoals(member.uid, setGoals),
    ];
    return () => unsubs.forEach((u) => u());
  }, [member.uid]);

  /**
   * Two ways a surface reaches you: published to the whole DLT, or your name on
   * the list. Both have to be checked here, or a card the rules would let you
   * read simply never renders.
   */
  const me = user?.uid ?? '';
  const showRoles = !!profile?.shareRoles || !!profile?.shareRolesWith?.includes(me);
  const showGoals = !!profile?.shareGoals || !!profile?.shareGoalsWith?.includes(me);
  const namedOnly = (!profile?.shareRoles && !!profile?.shareRolesWith?.includes(me))
    || (!profile?.shareGoals && !!profile?.shareGoalsWith?.includes(me));
  if (!showRoles && !showGoals) return null;

  return (
    <Card
      title={member.name}
      right={namedOnly
        ? <span className="rounded border border-stone-300 bg-stone-50 px-1.5 text-[9.5px] font-bold uppercase tracking-wider text-stone-500">
            Shared with you
          </span>
        : undefined}
    >
      {showRoles && (
        <div className="border-b border-stone-100 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">Roles</p>
          {roles.length === 0 && <p className="text-xs text-stone-400">No roles written yet.</p>}
          <ul className="space-y-1.5">
            {[...roles].sort((a, b) => a.order - b.order).map((r) => (
              <li key={r.id}>
                <p className="text-[13px] font-medium text-stone-900">{r.name}</p>
                {r.items.slice(0, 3).map((it) => (
                  <p key={it.id} className="ml-2 text-xs text-stone-500">· {it.title}</p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
      {showGoals && (
        <div className="px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">Annual goals</p>
          {goals.length === 0 && <p className="text-xs text-stone-400">None set.</p>}
          <ul className="space-y-1.5">
            {goals.map((g) => (
              <li key={g.id} className="flex items-start gap-2">
                <span className="flex-1 text-[13px] text-stone-900">
                  {g.title}
                  <span className="ml-1.5 text-xs tabular-nums text-stone-500">
                    {g.current || '?'} of {g.target || '?'}
                  </span>
                </span>
                <StatusChip status={g.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function TeamCards() {
  const { canEdit, canSeeBoard, user } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [pulse, setPulse] = useState<Pulse[]>([]);

  useEffect(() => {
    if (canEdit) {
      const unsubs = [watchMembers(setMembers), watchPulse(setPulse)];
      return () => unsubs.forEach((u) => u());
    }
    // Someone who cannot list the roster discovers shared cards through the
    // pointers instead. They see the people who named them and nobody else.
    if (!user) return;
    return watchSharedWithMe(user.uid, (ptrs) =>
      setMembers(ptrs.map((p) => ({
        uid: p.ownerUid, name: p.ownerName, email: '', role: 'dlt' as const,
        active: true, campusId: null,
      }))));
  }, [canEdit, user]);

  if (!canSeeBoard) return null;
  const seated = members.filter((m) => m.active);
  const pulseOf = (uid: string) => pulse.find((p) => p.uid === uid);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4">
      {canEdit && (
      <Section title="Weekly review rhythm" hint="Whether people ran it. Never what they wrote.">
        <Card title={`${pulse.length} of ${seated.length} have logged a review`}>
          <ul className="divide-y divide-stone-100">
            {seated.map((m) => {
              const p = pulseOf(m.uid);
              const days = p ? daysSince(p.lastReviewOn) : null;
              const stale = days === null || days > 10;
              return (
                <li key={m.uid} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex-1 text-sm text-stone-900">{m.name}</span>
                  <span className={`text-xs tabular-nums ${stale ? 'text-stone-400' : 'text-green-700'}`}>
                    {p ? `Last run ${fmtDate(p.lastReviewOn)}` : 'Never run'}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500">
            This is the only thing a weekly review publishes. The content stays with the person who wrote it,
            and there is no setting that changes that.
          </p>
        </Card>
      </Section>
      )}

      <Section title="Shared cards" hint="Only what people have chosen to share with you.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seated.map((m) => <PersonCard key={m.uid} member={m} />)}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Nothing appears here until its owner turns it on. If this looks empty, that is the system working.
        </p>
      </Section>
    </div>
  );
}
