/**
 * Routines and their findings. Entirely inside the private user space, so the
 * existing rule granting a person full access to `users/{uid}/**` and nobody
 * else any access at all is the whole authorization story. No new rules.
 */
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, limit,
  serverTimestamp, setDoc, updateDoc, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { todayIso } from '../types/me';
import type { Finding, Outcome, Routine } from '../types/rhythm';

const me = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in.');
  return u;
};

const routinesPath = (uid: string) => `users/${uid}/routines`;
const findingsPath = (uid: string) => `users/${uid}/findings`;

export function watchRoutines(uid: string, cb: (r: Routine[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, routinesPath(uid)), orderBy('order')), (s) =>
    cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as Routine))));
}

export function watchFindings(uid: string, cb: (f: Finding[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, findingsPath(uid)), orderBy('on', 'desc'), limit(60)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as Finding))));
}

export const saveRoutine = (r: Routine) => {
  const { id, ...rest } = r;
  return setDoc(doc(db, routinesPath(me()), id), rest, { merge: true });
};

export const deleteRoutine = (id: string) => deleteDoc(doc(db, routinesPath(me()), id));

/**
 * Record one occurrence.
 *
 * Two writes, in this order: the finding first, then the routine's date. If the
 * second fails you have an orphan log line, which is harmless. The other order
 * could mark a routine done with no record of what it found.
 */
export async function logRoutine(r: Routine, outcome: Outcome, note: string): Promise<void> {
  const uid = me();
  const on = todayIso();
  await addDoc(collection(db, findingsPath(uid)), {
    routineId: r.id,
    routineTitle: r.title,
    on,
    outcome,
    note: note.trim(),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, routinesPath(uid), r.id), {
    lastDoneOn: on,
    lastOutcome: outcome,
  });
}

export const deleteFinding = (id: string) => deleteDoc(doc(db, findingsPath(me()), id));
