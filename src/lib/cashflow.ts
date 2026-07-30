/**
 * The cash flow data lives in the private user tree, so the existing rule
 * granting a person full access to `users/{uid}/**` and nobody else any access
 * at all is the whole authorization story. No new rules, and no admin override
 * — an admin cannot read this any more than anyone else can.
 *
 * That matters here more than anywhere else in the app: this document holds the
 * bank balance, the payroll schedule and the bills being held. It is the one
 * thing where "who can see it" should be answered by the rules, not by which
 * tab happens to be hidden.
 */
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Cashflow } from '../types/cashflow';

const me = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in.');
  return u;
};

const path = (uid: string) => `users/${uid}/finance/cashflow`;

export function watchCashflow(
  uid: string,
  cb: (c: Cashflow | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, path(uid)), (s) => cb(s.exists() ? (s.data() as Cashflow) : null));
}

/** Replace the whole block. A refresh is a new model run, not an edit of the old one. */
export const saveCashflow = (data: Cashflow) =>
  setDoc(doc(db, path(me())), { ...data, savedAt: new Date().toISOString() });
