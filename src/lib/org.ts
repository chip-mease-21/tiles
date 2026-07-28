/**
 * Firestore access layer for the shared DLT board.
 *
 * Two things are centralised here on purpose:
 *   1. every rock and issue write goes through stamp(), because the security
 *      rules reject any write that does not name the caller and carry a server
 *      timestamp. Forget it at a call site and you get a permission error that
 *      looks like a bug in authorization.
 *   2. every path is built from one place, so nothing hardcodes a collection.
 */
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, type DocumentData,
  type QueryDocumentSnapshot, type Unsubscribe,
} from 'firebase/firestore';
// If your firebase module exports these under different names, this is the one
// line to change.
import { auth, db } from './firebase';
import {
  ORG_ID, type Decision, type Issue, type Member, type OrgSettings,
  type Picture, type PriorityGroup, type CultureGroup, type Rock, type RockStatus,
} from '../types/dlt';

const orgPath = (...rest: string[]) => ['orgs', ORG_ID, ...rest].join('/');

export const paths = {
  org: orgPath(),
  members: orgPath('members'),
  member: (uid: string) => orgPath('members', uid),
  rocks: orgPath('rocks'),
  rock: (id: string) => orgPath('rocks', id),
  issues: orgPath('issues'),
  issue: (id: string) => orgPath('issues', id),
  decisions: orgPath('decisions'),
  decision: (id: string) => orgPath('decisions', id),
  campuses: orgPath('campuses'),
  nextgen: orgPath('nextgen'),
  departments: orgPath('departments'),
  culture: orgPath('culture'),
  picture: orgPath('picture'),
  settings: orgPath('meta', 'settings'),
};

function uid(): string {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in.');
  return u;
}

/** The audit stamp the security rules require on every rock and issue write. */
export function stamp<T extends object>(data: T) {
  return { ...data, updatedBy: uid(), updatedAt: serverTimestamp() };
}

const withId = <T,>(s: QueryDocumentSnapshot<DocumentData>): T =>
  ({ id: s.id, ...s.data() } as T);

/* ------------------------------------------------------------------ reads */

export function watchMember(userUid: string, cb: (m: Member | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, paths.member(userUid)),
    (snap) => cb(snap.exists() ? ({ uid: snap.id, ...snap.data() } as Member) : null),
    // A non member gets permission denied on nothing; an unexpected error still
    // resolves so the app routes to the personal board rather than hanging.
    () => cb(null),
  );
}

export function watchMembers(cb: (m: Member[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, paths.members), orderBy('name')), (snap) =>
    cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Member))));
}

export function watchRocks(semester: string, cb: (r: Rock[]) => void): Unsubscribe {
  const q = query(collection(db, paths.rocks), where('semester', '==', semester), orderBy('order'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => withId<Rock>(d))));
}

export function watchIssues(cb: (i: Issue[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, paths.issues), orderBy('order')), (snap) =>
    cb(snap.docs.map((d) => withId<Issue>(d))));
}

export function watchDecisions(cb: (d: Decision[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, paths.decisions), orderBy('decided', 'desc')), (snap) =>
    cb(snap.docs.map((d) => withId<Decision>(d))));
}

export function watchGroups(path: string, cb: (g: PriorityGroup[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, path), orderBy('order')), (snap) =>
    cb(snap.docs.map((d) => withId<PriorityGroup>(d))));
}

export function watchCulture(cb: (c: CultureGroup[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, paths.culture), orderBy('order')), (snap) =>
    cb(snap.docs.map((d) => withId<CultureGroup>(d))));
}

export function watchPicture(cb: (p: Picture[]) => void): Unsubscribe {
  return onSnapshot(collection(db, paths.picture), (snap) =>
    cb(snap.docs.map((d) => withId<Picture>(d))));
}

export function watchSettings(cb: (s: OrgSettings | null) => void): Unsubscribe {
  return onSnapshot(doc(db, paths.settings), (snap) =>
    cb(snap.exists() ? (snap.data() as OrgSettings) : null));
}

/* ----------------------------------------------------------------- writes */

/**
 * The rules reject a status change with no note, so the note is a required
 * argument rather than an optional field. The type system says the same thing
 * the database says.
 */
export function setRockStatus(rockId: string, status: RockStatus, statusNote: string) {
  return updateDoc(doc(db, paths.rock(rockId)), stamp({ status, statusNote }));
}

export function updateRock(rockId: string, patch: Partial<Rock>) {
  return updateDoc(doc(db, paths.rock(rockId)), stamp(patch));
}

export function createRock(rock: Omit<Rock, 'id' | 'updatedAt' | 'updatedBy'>) {
  return addDoc(collection(db, paths.rocks), stamp(rock));
}

export const deleteRock = (rockId: string) => deleteDoc(doc(db, paths.rock(rockId)));

export function updateIssue(issueId: string, patch: Partial<Issue>) {
  return updateDoc(doc(db, paths.issue(issueId)), stamp(patch));
}

export const deleteIssue = (issueId: string) => deleteDoc(doc(db, paths.issue(issueId)));

export const updatePicture = (id: string, patch: Partial<Picture>) =>
  updateDoc(doc(db, `${paths.picture}/${id}`), patch);

/**
 * Raise an issue.
 *
 * `raisedByUid` says whose issue it is; `updatedBy`, added by stamp(), says who
 * typed it. An editor taking notes in the meeting sets the first and cannot
 * touch the second. A contributor may only raise for themselves, which the
 * rules enforce independently of this signature.
 */
export function raiseIssue(fields: {
  text: string;
  note?: string;
  raisedByUid: string;
  raisedByLabel: string;
  raised: string;
  longTerm?: boolean;
  order: number;
}) {
  return addDoc(collection(db, paths.issues), stamp({
    text: fields.text,
    note: fields.note ?? '',
    raisedByUid: fields.raisedByUid,
    raisedByLabel: fields.raisedByLabel,
    raised: fields.raised,
    status: 'open' as const,
    decisionId: null,
    closeReason: '',
    longTerm: fields.longTerm ?? false,
    order: fields.order,
  }));
}

/** The signed in uid, for defaulting the raiser to yourself. */
export const currentUid = () => auth.currentUser?.uid ?? '';

/**
 * Closing an issue always leaves a trace. Either it produced a decision, which
 * is written first and linked, or it did not, in which case the reason is
 * recorded. The security rules enforce this too, so a client that skips it gets
 * a permission error rather than a quiet gap in the log.
 */
export async function resolveIssueWithDecision(
  issue: Issue,
  notes: string[],
  reviewDueDays = 90,
): Promise<string> {
  const decided = new Date();
  const review = new Date(decided.getTime() + reviewDueDays * 86400000);
  const ref = await addDoc(collection(db, paths.decisions), {
    issue: issue.text,
    issueId: issue.id,
    decided: decided.toISOString().slice(0, 10),
    reviewDue: review.toISOString().slice(0, 10),
    reviewedAt: null,
    notes: notes.filter((n) => n.trim().length > 0),
  });
  await updateDoc(doc(db, paths.issue(issue.id)), stamp({
    status: 'done' as const, decisionId: ref.id, closeReason: '',
  }));
  return ref.id;
}

export function resolveIssueWithoutDecision(issueId: string, closeReason: string) {
  return updateDoc(doc(db, paths.issue(issueId)), stamp({
    status: 'done' as const, closeReason, decisionId: null,
  }));
}

export function reopenIssue(issueId: string) {
  return updateDoc(doc(db, paths.issue(issueId)), stamp({ status: 'open' as const }));
}

export function markDecisionReviewed(decisionId: string) {
  return updateDoc(doc(db, paths.decision(decisionId)), {
    reviewedAt: new Date().toISOString().slice(0, 10),
  });
}

export const updateGroup = (path: string, id: string, patch: Partial<PriorityGroup>) =>
  updateDoc(doc(db, `${path}/${id}`), patch);

export const updateCulture = (id: string, patch: Partial<CultureGroup>) =>
  updateDoc(doc(db, `${paths.culture}/${id}`), patch);

export const updateSettings = (patch: Partial<OrgSettings>) =>
  updateDoc(doc(db, paths.settings), patch);

/* ------------------------------------------------------- membership, admin */

export function upsertMember(m: Member) {
  const { uid: memberUid, ...rest } = m;
  return setDoc(doc(db, paths.member(memberUid)), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
}

export const setMemberActive = (memberUid: string, active: boolean) =>
  updateDoc(doc(db, paths.member(memberUid)), { active, updatedAt: serverTimestamp() });
