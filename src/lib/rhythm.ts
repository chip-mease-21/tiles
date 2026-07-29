/**
 * Routines. Entirely inside the private user space, so the existing rule
 * granting a person full access to `users/{uid}/**` and nobody else any access
 * at all is the whole authorization story. No new rules.
 *
 * There is deliberately no findings ledger. Anything worth following up goes to
 * the Tiles board, which is where the work is actually carried; keeping a second
 * record of the same thing here would be the duplication we avoided between the
 * roles card and Tiles in the first place. What survives is one line on the
 * routine saying what you saw last time.
 */
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query,
  setDoc, updateDoc, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { createEntry } from './useEntries';
import { personalScope } from './entryScope';
import { todayIso } from '../types/me';
import { withDone, withShift, withoutDone, type Outcome, type Routine } from '../types/rhythm';

const me = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in.');
  return u;
};

const routinesPath = (uid: string) => `users/${uid}/routines`;

export function watchRoutines(uid: string, cb: (r: Routine[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, routinesPath(uid)), orderBy('order')), (s) =>
    cb(s.docs.map((d) => ({ id: d.id, ...d.data() } as Routine))));
}

export const saveRoutine = (r: Routine) => {
  const { id, ...rest } = r;
  return setDoc(doc(db, routinesPath(me()), id), rest, { merge: true });
};

export const deleteRoutine = (id: string) => deleteDoc(doc(db, routinesPath(me()), id));

/** Push or pull a single occurrence. The cadence is untouched. */
export const moveOccurrence = (r: Routine, occurrence: string, days: number) =>
  updateDoc(doc(db, routinesPath(me()), r.id), { shifts: withShift(r, occurrence, days) });

/**
 * Record one occurrence, and push anything worth chasing onto your own board.
 *
 * `occurrence` is the day the work was due, which is not always today: a Monday
 * check logged on Wednesday closes Monday. `lastDoneOn` stays the day you
 * actually did it, because that is what "done three days ago" means.
 *
 * The to-do is written first. If that fails you have not yet marked the routine
 * done, so you will be asked again; the other order could mark it clean and lose
 * the thing you noticed.
 */
export async function logRoutine(
  r: Routine,
  occurrence: string,
  outcome: Outcome,
  note: string,
  toTiles: boolean,
): Promise<void> {
  const uid = me();
  const on = todayIso();
  const text = note.trim();

  if (outcome === 'attention' && toTiles) {
    await createEntry(personalScope(uid), {
      type: 'todo',
      title: text.slice(0, 120) || `Follow up: ${r.title}`,
      body: `From your ${r.title} check on ${on}.`,
      column: 'this_week',
      tags: ['routine'],
    });
  }

  await updateDoc(doc(db, routinesPath(uid), r.id), {
    done: withDone(r, occurrence, on),
    lastDoneOn: on,
    lastOutcome: outcome,
    lastNote: outcome === 'attention' ? text : '',
  });
}

/** Undo one logged occurrence. A mis-click needs a way back. */
export const unlogOccurrence = (r: Routine, occurrence: string) =>
  updateDoc(doc(db, routinesPath(me()), r.id), withoutDone(r, occurrence));
