/**
 * The private space: Roles and Expectations, annual goals, weekly reviews.
 *
 * Everything here is scoped to one uid. Reads and writes for your own space go
 * through the plain paths. Reading someone else's published card goes through
 * the same paths and simply fails unless they turned sharing on, because the
 * check lives in the security rules rather than here.
 */
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
// Type only, so this compiles against the Tiles schema without importing any of
// its runtime. If Tiles changes its column ids or task shape, this stops building
// rather than silently writing a tile that never appears in a column.
import type { ColumnId, Task } from '../types';
import { ORG_ID } from '../types/dlt';
import {
  EMPTY_PROFILE, todayIso,
  type Goal, type Profile, type Pulse, type Review, type Role, type RoleItem,
} from '../types/me';

const me = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in.');
  return u;
};

export const userPaths = {
  profile: (uid: string) => `users/${uid}/profile/card`,
  roles: (uid: string) => `users/${uid}/roles`,
  role: (uid: string, id: string) => `users/${uid}/roles/${id}`,
  goals: (uid: string) => `users/${uid}/goals`,
  goal: (uid: string, id: string) => `users/${uid}/goals/${id}`,
  reviews: (uid: string) => `users/${uid}/reviews`,
  pulse: (uid: string) => `orgs/${ORG_ID}/pulse/${uid}`,
  pulseAll: `orgs/${ORG_ID}/pulse`,
  shares: `orgs/${ORG_ID}/shares`,
  share: (ownerUid: string, withUid: string) => `orgs/${ORG_ID}/shares/${ownerUid}__${withUid}`,
};

/** A pointer telling someone that a card was shared with them by name. */
export interface SharePointer {
  id: string;
  ownerUid: string;
  ownerName: string;
  withUid: string;
}

/* ------------------------------------------------------------------ reads */

export function watchProfile(uid: string, cb: (p: Profile | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, userPaths.profile(uid)),
    (s) => cb(s.exists() ? ({ ...EMPTY_PROFILE, ...s.data() } as Profile) : null),
    () => cb(null),
  );
}

export function watchRoles(uid: string, cb: (r: Role[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, userPaths.roles(uid)), orderBy('order')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as Role))),
    () => cb([]),
  );
}

export function watchGoals(uid: string, cb: (g: Goal[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, userPaths.goals(uid)), orderBy('order')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as Goal))),
    () => cb([]),
  );
}

export function watchReviews(uid: string, cb: (r: Review[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, userPaths.reviews(uid)), orderBy('date', 'desc')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as Review))),
    () => cb([]),
  );
}

/** Who ran their review and when. The fact only, never the content. */
export function watchPulse(cb: (p: Pulse[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, userPaths.pulseAll),
    (s) => cb(s.docs.map((d) => ({ uid: d.id, ...d.data() } as Pulse))),
    () => cb([]),
  );
}

/* ----------------------------------------------------------------- writes */

export const saveProfile = (patch: Partial<Profile>) =>
  setDoc(doc(db, userPaths.profile(me())), patch, { merge: true });

/**
 * Save the sharing settings and reconcile the discovery pointers.
 *
 * Somebody outside the DLT cannot list the roster, so without a pointer they
 * would never know a card had been shared with them. The pointer is only a
 * signpost: it carries a name, and the card itself is still gated by the share
 * list on the owner's own profile. A stale pointer therefore grants nothing,
 * which is why it is safe for it to live on the shared board.
 */
export async function saveSharing(
  next: Pick<Profile, 'shareRoles' | 'shareGoals' | 'shareRolesWith' | 'shareGoalsWith'>,
  previous: Pick<Profile, 'shareRolesWith' | 'shareGoalsWith'>,
  myName: string,
) {
  const uid = me();
  await saveProfile(next);

  const now = new Set([...next.shareRolesWith, ...next.shareGoalsWith]);
  const before = new Set([...(previous.shareRolesWith ?? []), ...(previous.shareGoalsWith ?? [])]);

  await Promise.all([
    ...[...now].map((withUid) =>
      setDoc(doc(db, userPaths.share(uid, withUid)),
        { ownerUid: uid, ownerName: myName, withUid }, { merge: true })),
    ...[...before].filter((x) => !now.has(x)).map((withUid) =>
      deleteDoc(doc(db, userPaths.share(uid, withUid)))),
  ]);
}

/** Cards that somebody named you on. Used by people who cannot list the roster. */
export function watchSharedWithMe(uid: string, cb: (s: SharePointer[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, userPaths.shares), where('withUid', '==', uid)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as SharePointer))),
    () => cb([]),
  );
}

export const saveRole = (role: Role) => {
  const { id, ...rest } = role;
  return setDoc(doc(db, userPaths.role(me(), id)), rest, { merge: true });
};

/**
 * Save a role and record that something on it actually moved.
 *
 * Use this whenever a status changed or a next move was written. Do not use it
 * for renaming a card or reordering the board, because attention to the label
 * is not attention to the work, and the quiet signal is only worth having if it
 * cannot be satisfied by tidying.
 */
export const saveRoleMoved = (role: Role) =>
  saveRole({ ...role, lastMovedOn: todayIso() });

export const addRole = (role: Omit<Role, 'id'>) =>
  addDoc(collection(db, userPaths.roles(me())), role);

export const removeRole = (id: string) => deleteDoc(doc(db, userPaths.role(me(), id)));

export const setRoleOrder = (roleIds: string[]) =>
  Promise.all([
    saveProfile({ roleOrder: roleIds }),
    ...roleIds.map((id, i) => updateDoc(doc(db, userPaths.role(me(), id)), { order: i + 1 })),
  ]);

export const saveGoal = (goal: Goal) => {
  const { id, ...rest } = goal;
  return setDoc(doc(db, userPaths.goal(me(), id)), rest, { merge: true });
};

export const addGoal = (goal: Omit<Goal, 'id'>) =>
  addDoc(collection(db, userPaths.goals(me())), goal);

export const removeGoal = (id: string) => deleteDoc(doc(db, userPaths.goal(me(), id)));

/**
 * Push a role item's next move into Tiles as a real to do.
 *
 * This is the handoff that keeps the two from becoming the same thing. The roles
 * card names what you are accountable for; the moment something needs steps and
 * a date, it belongs in the task system.
 *
 * NOTE FOR THE DEVELOPER: the `tasks` element shape below is taken from the
 * repo README, which describes a tasks array with checkbox states. Check it
 * against TileEditor.tsx before shipping. If yours differs, this is the one
 * object to change.
 */
export async function sendItemToTiles(
  role: Role,
  item: RoleItem,
  column: ColumnId = 'this_week',
) {
  const uid = me();
  const now = Date.now();
  const ref = await addDoc(collection(db, 'entries'), {
    userId: uid,
    type: 'todo',
    title: item.title,
    body: `From ${role.name}.`,
    // Column ids are the lowercase union in src/types.ts, not the display labels.
    column,
    // Floats let Tiles reorder without renumbering, so appending is just a big number.
    position: now,
    tags: ['roles', role.name],
    dueDate: item.due || null,
    pinned: false,
    archived: false,
    // Task.position is required by the Tiles schema; a single task sorts at zero.
    tasks: item.next
      ? [{ id: 't1', text: item.next, done: false, position: 0 } satisfies Task]
      : [],
    // Tiles stores createdAt as client milliseconds so the date renders before
    // the server round trip. Only updatedAt is a server timestamp.
    createdAt: now,
    updatedAt: serverTimestamp(),
  });
  await saveRole({
    ...role,
    items: role.items.map((x) => (x.id === item.id ? { ...x, tileId: ref.id } : x)),
  });
  return ref.id;
}

/**
 * Finish a weekly review.
 *
 * Two writes, and the second one is the interesting one. The review itself stays
 * in the private space forever. A single date goes to the shared board so the
 * team can see the rhythm is being kept, with nothing about what was said.
 */
export async function completeReview(review: Omit<Review, 'id' | 'createdAt'>) {
  const uid = me();
  await addDoc(collection(db, userPaths.reviews(uid)), { ...review, createdAt: serverTimestamp() });
  await setDoc(doc(db, userPaths.pulse(uid)), {
    lastReviewOn: todayIso(),
    weekOf: review.weekOf,
    updatedAt: serverTimestamp(),
  });
}
