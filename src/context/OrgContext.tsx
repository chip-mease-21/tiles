/**
 * Membership is the single source of authority. It is read once after sign in
 * and everything downstream branches on it.
 *
 * The rules let anyone signed in read the member document at their own uid,
 * including someone with no seat and someone deactivated, so this never throws
 * a permission error at a former staff member on sign in.
 *
 * Permission is still enforced in Firestore, not here. Hiding a button is a
 * courtesy to the user, not a control.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { watchMember, watchSettings } from '../lib/org';
import {
  canEditEverything, canSeeBoard, type Member, type OrgSettings, type Role,
} from '../types/dlt';

interface OrgState {
  user: User | null;
  member: Member | null;
  settings: OrgSettings | null;
  role: Role | null;
  /** Signed in, seated and active. */
  isMember: boolean;
  /** May see the shared board at all. */
  canSeeBoard: boolean;
  /** May change anything on the shared board. */
  canEdit: boolean;
  /** May manage membership. */
  isAdmin: boolean;
  loading: boolean;
}

const empty: OrgState = {
  user: null, member: null, settings: null, role: null,
  isMember: false, canSeeBoard: false, canEdit: false, isAdmin: false, loading: true,
};

const Ctx = createContext<OrgState>(empty);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [memberReady, setMemberReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
    if (!u) { setMember(null); setMemberReady(true); }
  }), []);

  useEffect(() => {
    if (!user) return;
    setMemberReady(false);
    return watchMember(user.uid, (m) => { setMember(m); setMemberReady(true); });
  }, [user]);

  // Settings live behind the same read gate as the rest of the board, so only
  // subscribe once we know this person is allowed to see it.
  const active = !!member?.active;
  const role = active ? member!.role : null;
  useEffect(() => {
    if (!canSeeBoard(role)) { setSettings(null); return; }
    return watchSettings(setSettings);
  }, [role]);

  const value = useMemo<OrgState>(() => ({
    user,
    member: active ? member : null,
    settings,
    role,
    isMember: active,
    canSeeBoard: canSeeBoard(role),
    canEdit: canEditEverything(role),
    isAdmin: role === 'admin',
    loading: !authReady || (!!user && !memberReady),
  }), [user, member, settings, role, active, authReady, memberReady]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useOrg = () => useContext(Ctx);

/** True when this person owns the rock, used for the narrow contributor path. */
export function useOwnsRock(ownerUid: string | null): boolean {
  const { user } = useOrg();
  return !!user && !!ownerUid && user.uid === ownerUid;
}
