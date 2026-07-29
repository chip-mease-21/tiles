/**
 * Firestore rules test suite for the Tiles + DLT Workspace ruleset.
 *
 *   npx firebase emulators:exec --only firestore --project demo-tiles "node rules.test.mjs"
 *
 * Roles under test:
 *   chip    admin        everything, including membership
 *   matt    dlt          full write on shared content, no membership
 *   gabe    dlt          same
 *   rachel  dlt          same
 *   sam     contributor  reads the board, changes status on rocks he owns only
 *   kyler   campus       own membership seat only
 *   leaver  dlt inactive no access at all
 *   stranger             signed in, not a member
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc,
  query, where, deleteField, serverTimestamp,
} from 'firebase/firestore';
import fs from 'fs';

const ORG = 'thepoint';
let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); pass++; }
  catch (e) { console.log('  FAIL  ' + name + '  >> ' + (e.message || e)); fail++; }
}
// every rock and issue write must carry the audit stamp
const stamp = (uid, extra = {}) => ({ updatedBy: uid, updatedAt: serverTimestamp(), ...extra });

const env = await initializeTestEnvironment({
  projectId: 'demo-tiles',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const m = (uid, role, active = true) => setDoc(doc(db, `orgs/${ORG}/members/${uid}`), { name: uid, role, active });
  await setDoc(doc(db, `orgs/${ORG}`), { name: 'The Point Church' });
  await m('chip', 'admin'); await m('matt', 'dlt'); await m('gabe', 'dlt'); await m('rachel', 'dlt');
  await m('sam', 'contributor'); await m('kyler', 'campus'); await m('leaver', 'dlt', false);

  await setDoc(doc(db, `orgs/${ORG}/rocks/r_matt1`), { title: 'Studentlife', ownerUid: 'matt', ownerLabel: 'Matt', status: 'on-track', due: '2026-08-31' });
  await setDoc(doc(db, `orgs/${ORG}/rocks/r_chip1`), { title: 'Donor development', ownerUid: 'chip', ownerLabel: 'Chip', status: 'not-started', due: '2026-08-31' });
  await setDoc(doc(db, `orgs/${ORG}/rocks/r_sam1`), { title: 'Sam rock', ownerUid: 'sam', ownerLabel: 'Sam', status: 'on-track', due: '2026-08-31' });
  await setDoc(doc(db, `orgs/${ORG}/issues/i_matt`), { text: 'DLT cadence', raisedByUid: 'matt', status: 'open' });
  await setDoc(doc(db, `orgs/${ORG}/issues/i_chip`), { text: 'Reserves policy', raisedByUid: 'chip', status: 'open' });
  await setDoc(doc(db, `orgs/${ORG}/issues/i_sam`), { text: 'Sam issue', raisedByUid: 'sam', status: 'open' });
  await setDoc(doc(db, `orgs/${ORG}/campuses/pantops`), { name: 'Pantops', status: 'off-track' });
  await setDoc(doc(db, `orgs/${ORG}/culture/values`), { group: 'Staff values' });
  await setDoc(doc(db, `orgs/${ORG}/nextgen/kids`), { name: 'Kids', status: 'on-track' });
  await setDoc(doc(db, `orgs/${ORG}/departments/hr`), { name: 'HR', status: 'on-track' });
  await setDoc(doc(db, `orgs/${ORG}/decisions/d1`), { issue: 'Pantops', decided: '2026-06-08' });
  await setDoc(doc(db, `orgs/${ORG}/picture/y1`), { label: 'End of 2026' });
  await setDoc(doc(db, `orgs/${ORG}/meta/settings`), { weekOf: '2026-07-27' });

  // deliberately NOT matt: the cross-org test proves membership does not travel
  await setDoc(doc(db, `orgs/other/members/outsider`), { name: 'Outsider', role: 'dlt', active: true });
  await setDoc(doc(db, `orgs/other/rocks/x1`), { title: 'Other org rock', ownerUid: 'someone', status: 'on-track' });

  await setDoc(doc(db, 'entries/e_chip'), { userId: 'chip', title: 'private tile' });
  await setDoc(doc(db, 'entries/e_matt'), { userId: 'matt', title: 'matt tile' });
  await setDoc(doc(db, 'users/chip/roles/r_finance'), { name: 'Finance' });
  await setDoc(doc(db, 'users/chip/reviews/w1'), { oneBigThing: 'private' });
  await setDoc(doc(db, 'users/gabe/roles/r1'), { name: 'Gabe role' });
  await setDoc(doc(db, 'users/chip/goals/g1'), { title: 'Reserves above the floor', target: '120' });
  // rachel publishes her roles, not her goals. matt publishes nothing.
  // rachel: roles to the whole DLT, goals to chip alone by name.
  await setDoc(doc(db, 'users/rachel/profile/card'), {
    shareRoles: true, shareGoals: false, shareRolesWith: [], shareGoalsWith: ['chip'],
  });
  // gabe shares his roles with sam, a contributor who is not on the DLT.
  await setDoc(doc(db, 'users/gabe/profile/card'), {
    shareRoles: false, shareGoals: false, shareRolesWith: ['sam'], shareGoalsWith: [],
  });
  await setDoc(doc(db, 'users/rachel/roles/r1'), { name: 'Communications' });
  await setDoc(doc(db, 'users/rachel/goals/g1'), { title: 'Private goal' });
  await setDoc(doc(db, 'users/rachel/reviews/w1'), { oneBigThing: 'Private review' });
  await setDoc(doc(db, 'users/matt/profile/card'), { shareRoles: false, shareGoals: false });
  await setDoc(doc(db, 'users/matt/roles/r1'), { name: 'Campuses' });
  await setDoc(doc(db, `orgs/${ORG}/pulse/rachel`), { lastReviewOn: '2026-07-27', weekOf: '2026-07-27' });
  await setDoc(doc(db, `orgs/${ORG}/shares/rachel__chip`), { ownerUid: 'rachel', ownerName: 'Rachel', withUid: 'chip' });
  await setDoc(doc(db, `orgs/${ORG}/shares/gabe__sam`), { ownerUid: 'gabe', ownerName: 'Gabe', withUid: 'sam' });

  // Heart and Treasure: a shared space with no relationship to the org at all.
  await setDoc(doc(db, 'spaces/ht'), { name: 'Heart and Treasure' });
  await setDoc(doc(db, 'spaces/ht/members/chip'), {
    name: 'Chip', email: 'chip@thepointcville.com', active: true });
  await setDoc(doc(db, 'spaces/ht/invites/karen@example.com'), {
    name: 'Karen', email: 'karen@example.com' });
  await setDoc(doc(db, 'spaces/ht/entries/e_book'), {
    userId: 'chip', title: 'Book outline', column: 'this_week', ownerUid: null });
  await setDoc(doc(db, 'spaces/ht/meta/tags'), { categories: ['Book', 'Marketing'] });

  // Invites: a seat assigned to an email before that person has ever signed in.
  await setDoc(doc(db, `orgs/${ORG}/invites/newbie@thepointcville.com`), {
    name: 'New Person', email: 'newbie@thepointcville.com', role: 'dlt', campusId: null });
  // Seeded past the rules on purpose. An admin invite cannot be written through
  // them, and this proves it cannot be claimed either if one ever appeared.
  await setDoc(doc(db, `orgs/${ORG}/invites/boss@thepointcville.com`), {
    name: 'Would Be Boss', email: 'boss@thepointcville.com', role: 'admin', campusId: null });
});

const chip = env.authenticatedContext('chip').firestore();
const matt = env.authenticatedContext('matt').firestore();
const gabe = env.authenticatedContext('gabe').firestore();
const rachel = env.authenticatedContext('rachel').firestore();
const sam = env.authenticatedContext('sam').firestore();
const kyler = env.authenticatedContext('kyler').firestore();
const leaver = env.authenticatedContext('leaver').firestore();
const stranger = env.authenticatedContext('stranger').firestore();
const anon = env.unauthenticatedContext().firestore();

// Signed in with a Google identity, carrying an email claim. None of these
// people have a seat yet.
const tok = (email, verified = true) => ({ email, email_verified: verified });
const newbie    = env.authenticatedContext('u_newbie', tok('newbie@thepointcville.com')).firestore();
const unverified = env.authenticatedContext('u_unver', tok('newbie@thepointcville.com', false)).firestore();
const wouldbeboss = env.authenticatedContext('u_boss', tok('boss@thepointcville.com')).firestore();
const walkin    = env.authenticatedContext('u_walkin', tok('random@gmail.com')).firestore();

const karen = env.authenticatedContext('u_karen', tok('karen@example.com')).firestore();
const spaceSeat = (extra = {}) => ({
  name: 'Karen', email: 'karen@example.com', active: true,
  claimedAt: serverTimestamp(), ...extra,
});
const tile = (extra = {}) => ({
  userId: 'chip', title: 'x', column: 'inbox', ownerUid: null, ...extra,
});

const seat = (extra = {}) => ({
  name: 'New Person', email: 'newbie@thepointcville.com', role: 'dlt',
  active: true, campusId: null, claimedAt: serverTimestamp(), ...extra,
});

console.log('\nREAD ACCESS');
await t('editor reads all rocks', () => assertSucceeds(getDocs(collection(matt, `orgs/${ORG}/rocks`))));
await t('editor reads issues', () => assertSucceeds(getDocs(collection(gabe, `orgs/${ORG}/issues`))));
await t('editor reads campuses', () => assertSucceeds(getDoc(doc(rachel, `orgs/${ORG}/campuses/pantops`))));
await t('editor reads culture', () => assertSucceeds(getDoc(doc(matt, `orgs/${ORG}/culture/values`))));
await t('editor reads nextgen', () => assertSucceeds(getDoc(doc(matt, `orgs/${ORG}/nextgen/kids`))));
await t('editor reads decisions', () => assertSucceeds(getDoc(doc(matt, `orgs/${ORG}/decisions/d1`))));
await t('editor reads the picture', () => assertSucceeds(getDoc(doc(matt, `orgs/${ORG}/picture/y1`))));
await t('editor reads meta', () => assertSucceeds(getDoc(doc(matt, `orgs/${ORG}/meta/settings`))));
await t('editor reads the roster', () => assertSucceeds(getDocs(collection(matt, `orgs/${ORG}/members`))));
await t('contributor reads the board', () => assertSucceeds(getDocs(collection(sam, `orgs/${ORG}/rocks`))));
await t('contributor is BLOCKED from the roster list', () => assertFails(getDocs(collection(sam, `orgs/${ORG}/members`))));
await t('contributor CAN read own seat', () => assertSucceeds(getDoc(doc(sam, `orgs/${ORG}/members/sam`))));
await t('campus role is BLOCKED from rocks', () => assertFails(getDoc(doc(kyler, `orgs/${ORG}/rocks/r_matt1`))));
await t('campus role is BLOCKED from issues', () => assertFails(getDoc(doc(kyler, `orgs/${ORG}/issues/i_matt`))));
await t('campus role is BLOCKED from meta', () => assertFails(getDoc(doc(kyler, `orgs/${ORG}/meta/settings`))));
await t('campus role CAN read own seat', () => assertSucceeds(getDoc(doc(kyler, `orgs/${ORG}/members/kyler`))));
await t('deactivated member is BLOCKED', () => assertFails(getDoc(doc(leaver, `orgs/${ORG}/rocks/r_matt1`))));
await t('deactivated member CAN read own seat, so sign in can route', () => assertSucceeds(
  getDoc(doc(leaver, `orgs/${ORG}/members/leaver`))));
await t('non member CAN read the empty seat at their own uid', () => assertSucceeds(
  getDoc(doc(stranger, `orgs/${ORG}/members/stranger`))));
await t("non member is BLOCKED from someone else's seat", () => assertFails(
  getDoc(doc(stranger, `orgs/${ORG}/members/matt`))));
await t('non member is BLOCKED', () => assertFails(getDoc(doc(stranger, `orgs/${ORG}/rocks/r_matt1`))));
await t('signed out is BLOCKED', () => assertFails(getDoc(doc(anon, `orgs/${ORG}/rocks/r_matt1`))));
await t('member of one org is BLOCKED from another', () => assertFails(getDoc(doc(matt, 'orgs/other/rocks/x1'))));

console.log('\nEDITOR WRITES: Matt, Gabe and Rachel change anything');
await t("editor edits someone else's rock title", () => assertSucceeds(
  updateDoc(doc(matt, `orgs/${ORG}/rocks/r_chip1`), stamp('matt', { title: 'Donor development relaunch' }))));
await t("editor moves someone else's due date", () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/rocks/r_chip1`), stamp('gabe', { due: '2026-09-30' }))));
// NOTE: this leaves r_chip1 owned by matt. No later test reads its owner.
// If you add one, seed a separate rock rather than reusing r_chip1.
await t('editor reassigns a rock', () => assertSucceeds(
  updateDoc(doc(rachel, `orgs/${ORG}/rocks/r_chip1`), stamp('rachel', { ownerUid: 'matt', ownerLabel: 'Matt' }))));
await t('editor creates a rock', () => assertSucceeds(
  setDoc(doc(matt, `orgs/${ORG}/rocks/r_new`), stamp('matt', { title: 'New rock', ownerUid: 'gabe', ownerLabel: 'Gabe', status: 'not-started', due: '2026-08-31' }))));
await t('editor deletes a rock', () => assertSucceeds(deleteDoc(doc(gabe, `orgs/${ORG}/rocks/r_new`))));
await t('editor edits campuses', () => assertSucceeds(
  updateDoc(doc(matt, `orgs/${ORG}/campuses/pantops`), { status: 'caution' })));
await t('editor grades culture', () => assertSucceeds(
  updateDoc(doc(rachel, `orgs/${ORG}/culture/values`), { items: [{ label: 'Trust', status: 'on-track' }] })));
await t('editor edits nextgen', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/nextgen/kids`), { status: 'caution' })));
await t('editor edits a department', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/departments/hr`), { status: 'caution' })));
await t('editor edits the decision log', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/decisions/d1`), { reviewDue: '2026-09-08' })));
await t('editor edits the picture', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/picture/y1`), { revenue: '$6,500,000' })));
await t('editor sets the week', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/meta/settings`), { weekOf: '2026-08-03' })));
await t("editor resolves someone else's issue with a decision link", () => assertSucceeds(
  updateDoc(doc(matt, `orgs/${ORG}/issues/i_chip`), stamp('matt', { status: 'done', decisionId: 'd1' }))));
await t('editor raises an issue as themselves', () => assertSucceeds(
  addDoc(collection(rachel, `orgs/${ORG}/issues`), stamp('rachel', { text: 'New issue', raisedByUid: 'rachel', status: 'open' }))));

console.log('\nADMIN WRITES SHARED CONTENT TOO');
await t('admin updates a rock with a stamp and a note', () => assertSucceeds(
  updateDoc(doc(chip, `orgs/${ORG}/rocks/r_matt1`), stamp('chip', { status: 'caution', statusNote: 'Slipping on the hire' }))));
await t('admin is BLOCKED writing a rock with no stamp', () => assertFails(
  updateDoc(doc(chip, `orgs/${ORG}/rocks/r_matt1`), { status: 'on-track' })));
await t('admin edits a reference collection unstamped', () => assertSucceeds(
  updateDoc(doc(chip, `orgs/${ORG}/campuses/pantops`), { status: 'off-track' })));
await t('admin resolves an issue with a close reason', () => assertSucceeds(
  updateDoc(doc(chip, `orgs/${ORG}/issues/i_matt`), stamp('chip', { status: 'done', closeReason: 'Folded into the cadence decision' }))));

console.log('\nTHE AUDIT STAMP HOLDS');
await t('editor is BLOCKED writing a rock with no stamp', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/rocks/r_matt1`), { title: 'Unstamped' })));
await t('editor is BLOCKED stamping as someone else', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/rocks/r_matt1`), stamp('gabe', { title: 'Spoofed author' }))));
await t('editor is BLOCKED using a client supplied time', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/rocks/r_matt1`), { title: 'x', updatedBy: 'matt', updatedAt: '1999-01-01' })));
await t('editor is BLOCKED writing an invalid status', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/rocks/r_matt1`), stamp('matt', { status: 'vibes', statusNote: 'made up status' }))));
await t('editor may log an issue on behalf of someone else', () => assertSucceeds(
  addDoc(collection(matt, `orgs/${ORG}/issues`), stamp('matt', { text: 'Gabe raised this in the room', raisedByUid: 'gabe', raisedByLabel: 'Gabe Turner', status: 'open' }))));
await t('editor may reassign who raised an issue', () => assertSucceeds(
  updateDoc(doc(matt, `orgs/${ORG}/issues/i_matt`), stamp('matt', { raisedByUid: 'gabe', raisedByLabel: 'Gabe Turner' }))));
await t('but the write is still stamped with who actually made it', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/issues/i_matt`), stamp('gabe', { raisedByUid: 'matt' }))));

await t('editor is BLOCKED writing an invalid issue status', () => assertFails(
  updateDoc(doc(gabe, `orgs/${ORG}/issues/i_chip`), stamp('gabe', { status: 'maybe' }))));
await t('editor is BLOCKED writing an oversized status note', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/rocks/r_matt1`), stamp('matt', { statusNote: 'x'.repeat(600) }))));
await t('editor is BLOCKED creating a rock with no status', () => assertFails(
  setDoc(doc(matt, `orgs/${ORG}/rocks/r_nostatus`), stamp('matt', { title: 'No status', ownerUid: 'matt', due: '2026-08-31' }))));
await t('editor is BLOCKED overwriting a rock in a way that drops status', () => assertFails(
  setDoc(doc(matt, `orgs/${ORG}/rocks/r_matt1`), stamp('matt', { title: 'Stripped' }))));

console.log('\nA STATUS CANNOT MOVE WITHOUT A NOTE');
await t('editor is BLOCKED moving a status with no note', () => assertFails(
  updateDoc(doc(gabe, `orgs/${ORG}/rocks/r_matt1`), stamp('gabe', { status: 'off-track' }))));
await t('editor is BLOCKED moving a status with a one character note', () => assertFails(
  updateDoc(doc(gabe, `orgs/${ORG}/rocks/r_matt1`), stamp('gabe', { status: 'off-track', statusNote: 'x' }))));
await t('editor moves a status with a real note', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/rocks/r_matt1`), stamp('gabe', { status: 'off-track', statusNote: 'Hire fell through, restarting the search' }))));
// The bug this exists to catch: on an update request.resource.data is the
// MERGED document, so the note written for the previous status change is still
// sitting there and would otherwise satisfy the check for the next one. The
// rock moves with no explanation and keeps a sentence describing the status it
// used to have.
await t('a stale note cannot carry a second status move', () => assertFails(
  updateDoc(doc(gabe, `orgs/${ORG}/rocks/r_matt1`), stamp('gabe', { status: 'caution' }))));
await t('editor edits a rock without touching status, no note needed', () => assertSucceeds(
  updateDoc(doc(gabe, `orgs/${ORG}/rocks/r_matt1`), stamp('gabe', { due: '2026-10-31' }))));
await t('contributor is BLOCKED moving their own status with no note', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { status: 'off-track' }))));
await t('contributor moves their own status with a note', () => assertSucceeds(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { status: 'off-track', statusNote: 'Blocked on the budget' }))));

console.log('\nAN ISSUE CANNOT CLOSE WITHOUT A TRACE');
await t('editor is BLOCKED closing an issue with neither a decision nor a reason', () => assertFails(
  updateDoc(doc(rachel, `orgs/${ORG}/issues/i_sam`), stamp('rachel', { status: 'done' }))));
await t('editor is BLOCKED closing with a one character reason', () => assertFails(
  updateDoc(doc(rachel, `orgs/${ORG}/issues/i_sam`), stamp('rachel', { status: 'done', closeReason: 'x' }))));
await t('editor closes with a linked decision', () => assertSucceeds(
  updateDoc(doc(rachel, `orgs/${ORG}/issues/i_sam`), stamp('rachel', { status: 'done', decisionId: 'd1' }))));
await t('reopening an issue needs no reason', () => assertSucceeds(
  updateDoc(doc(rachel, `orgs/${ORG}/issues/i_sam`), stamp('rachel', { status: 'open' }))));
await t('editing an open issue needs no reason', () => assertSucceeds(
  updateDoc(doc(rachel, `orgs/${ORG}/issues/i_sam`), stamp('rachel', { note: 'Added context' }))));
await t('editor writes a decision entry', () => assertSucceeds(
  addDoc(collection(rachel, `orgs/${ORG}/decisions`), { issue: 'Sam issue', issueId: 'i_sam', decided: '2026-07-28', reviewDue: '2026-10-26', reviewedAt: null, notes: ['Decided to park it'] })));
await t('contributor is BLOCKED writing a decision entry', () => assertFails(
  addDoc(collection(sam, `orgs/${ORG}/decisions`), { issue: 'x', decided: '2026-07-28', notes: [] })));

console.log('\nCONTRIBUTOR TIER STAYS NARROW');
await t('contributor updates status on own rock', () => assertSucceeds(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { status: 'caution', statusNote: 'slipping' }))));
await t('contributor is BLOCKED from retitling own rock', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { title: 'Something else' }))));
await t('contributor is BLOCKED from moving own due date', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { due: '2026-12-31' }))));
await t('contributor is BLOCKED from reassigning own rock', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { ownerUid: 'matt' }))));
await t("contributor is BLOCKED from another person's rock", () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_matt1`), stamp('sam', { status: 'on-track', statusNote: 'not mine to move' }))));
await t('contributor is BLOCKED from creating a rock', () => assertFails(
  setDoc(doc(sam, `orgs/${ORG}/rocks/r_x`), stamp('sam', { title: 'x', ownerUid: 'sam', status: 'on-track' }))));
await t('contributor is BLOCKED from deleting a rock', () => assertFails(deleteDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`))));
await t('contributor is BLOCKED from stripping fields with set()', () => assertFails(
  setDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { status: 'on-track', statusNote: 'back on' }))));
await t('contributor is BLOCKED from adding a novel field', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { status: 'on-track', statusNote: 'back on', secret: 1 }))));
await t('contributor is BLOCKED from deleting the status field', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/rocks/r_sam1`), stamp('sam', { status: deleteField(), statusNote: 'removing it' }))));
await t('contributor is BLOCKED from editing campuses', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/campuses/pantops`), { status: 'on-track' })));
await t('contributor is BLOCKED from grading culture', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/culture/values`), { group: 'x' })));
await t('contributor resolves their own issue with a reason', () => assertSucceeds(
  updateDoc(doc(sam, `orgs/${ORG}/issues/i_sam`), stamp('sam', { status: 'done', closeReason: 'No longer relevant' }))));
await t("contributor is BLOCKED from someone else's issue", () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/issues/i_matt`), stamp('sam', { status: 'done', closeReason: 'not mine to close' }))));
await t('contributor reads campuses', () => assertSucceeds(getDoc(doc(sam, `orgs/${ORG}/campuses/pantops`))));
await t('contributor reads departments', () => assertSucceeds(getDoc(doc(sam, `orgs/${ORG}/departments/hr`))));
await t('contributor is BLOCKED from editing a department', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/departments/hr`), { status: 'on-track' })));
await t('campus role is BLOCKED from departments', () => assertFails(
  getDoc(doc(kyler, `orgs/${ORG}/departments/hr`))));
await t('contributor reads culture', () => assertSucceeds(getDoc(doc(sam, `orgs/${ORG}/culture/values`))));
await t('contributor reads decisions and the picture', () => assertSucceeds(Promise.all([
  getDoc(doc(sam, `orgs/${ORG}/decisions/d1`)), getDoc(doc(sam, `orgs/${ORG}/picture/y1`))])));
await t('contributor reads issues', () => assertSucceeds(getDocs(collection(sam, `orgs/${ORG}/issues`))));
await t('contributor raises an issue as themselves', () => assertSucceeds(
  addDoc(collection(sam, `orgs/${ORG}/issues`), stamp('sam', { text: 'Sam raised this', raisedByUid: 'sam', status: 'open' }))));
await t('contributor is BLOCKED raising an issue for someone else', () => assertFails(
  addDoc(collection(sam, `orgs/${ORG}/issues`), stamp('sam', { text: 'Speaking for Matt', raisedByUid: 'matt', status: 'open' }))));
await t('contributor is BLOCKED reassigning authorship on their own issue', () => assertFails(
  updateDoc(doc(sam, `orgs/${ORG}/issues/i_sam`), stamp('sam', { raisedByUid: 'chip' }))));

console.log('\nNO WRITES FROM THE OUTER TIERS');
await t('campus role is BLOCKED from writing a rock', () => assertFails(
  updateDoc(doc(kyler, `orgs/${ORG}/rocks/r_matt1`), stamp('kyler', { status: 'on-track', statusNote: 'not allowed' }))));
await t('campus role is BLOCKED from raising an issue', () => assertFails(
  addDoc(collection(kyler, `orgs/${ORG}/issues`), stamp('kyler', { text: 'x', raisedByUid: 'kyler', status: 'open' }))));
await t('campus role CAN read the org name, which routing needs', () => assertSucceeds(
  getDoc(doc(kyler, `orgs/${ORG}`))));
await t('deactivated member is BLOCKED from writing', () => assertFails(
  updateDoc(doc(leaver, `orgs/${ORG}/issues/i_matt`), stamp('leaver', { status: 'done', closeReason: 'not allowed' }))));
await t('stranger is BLOCKED from writing', () => assertFails(
  updateDoc(doc(stranger, `orgs/${ORG}/rocks/r_matt1`), stamp('stranger', { status: 'on-track', statusNote: 'not allowed' }))));

console.log('\nMEMBERSHIP STAYS WITH THE ADMIN');
await t('editor is BLOCKED from promoting themselves', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/members/matt`), { role: 'admin' })));
await t('editor is BLOCKED from adding a member', () => assertFails(
  setDoc(doc(gabe, `orgs/${ORG}/members/newguy`), { name: 'New', role: 'dlt', active: true })));
await t('editor is BLOCKED from removing a member', () => assertFails(
  updateDoc(doc(rachel, `orgs/${ORG}/members/matt`), { active: false })));
await t('editor is BLOCKED from deleting a member', () => assertFails(
  deleteDoc(doc(matt, `orgs/${ORG}/members/sam`))));
await t('editor is BLOCKED from reactivating a removed member', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}/members/leaver`), { active: true })));
await t('stranger is BLOCKED from writing themselves in', () => assertFails(
  setDoc(doc(stranger, `orgs/${ORG}/members/stranger`), { name: 'S', role: 'admin', active: true })));
await t('editor is BLOCKED from editing the org document', () => assertFails(
  updateDoc(doc(matt, `orgs/${ORG}`), { name: 'Renamed' })));
await t('admin is BLOCKED from demoting themselves', () => assertFails(
  updateDoc(doc(chip, `orgs/${ORG}/members/chip`), { role: 'dlt' })));
await t('admin is BLOCKED from deactivating themselves', () => assertFails(
  updateDoc(doc(chip, `orgs/${ORG}/members/chip`), { active: false })));
await t('admin is BLOCKED from deleting their own seat', () => assertFails(
  deleteDoc(doc(chip, `orgs/${ORG}/members/chip`))));
await t('admin adds a member', () => assertSucceeds(
  setDoc(doc(chip, `orgs/${ORG}/members/newguy`), { name: 'New', role: 'dlt', active: true })));
// Deliberately newguy and not sam. Promoting sam here silently turned the
// contributor into a DLT member for every assertion that followed, and the
// suite then "passed" a later test for entirely the wrong reason.
await t('admin changes a role', () => assertSucceeds(
  updateDoc(doc(chip, `orgs/${ORG}/members/newguy`), { role: 'contributor' })));

console.log('\nAN INVITE SEATS SOMEBODY WITHOUT THE ADMIN IN THE LOOP');
await t('you can read the invite addressed to you', () => assertSucceeds(
  getDoc(doc(newbie, `orgs/${ORG}/invites/newbie@thepointcville.com`))));
await t("you cannot read somebody else's invite", () => assertFails(
  getDoc(doc(newbie, `orgs/${ORG}/invites/boss@thepointcville.com`))));
await t('a walk in cannot read an invite that is not theirs', () => assertFails(
  getDoc(doc(walkin, `orgs/${ORG}/invites/newbie@thepointcville.com`))));
await t('a non admin cannot write an invite', () => assertFails(
  setDoc(doc(matt, `orgs/${ORG}/invites/friend@thepointcville.com`),
    { name: 'Friend', email: 'friend@thepointcville.com', role: 'dlt', campusId: null })));
await t('the admin writes an invite', () => assertSucceeds(
  setDoc(doc(chip, `orgs/${ORG}/invites/friend@thepointcville.com`),
    { name: 'Friend', email: 'friend@thepointcville.com', role: 'contributor', campusId: null })));
await t('an invite cannot name the admin role', () => assertFails(
  setDoc(doc(chip, `orgs/${ORG}/invites/other@thepointcville.com`),
    { name: 'Other', email: 'other@thepointcville.com', role: 'admin', campusId: null })));
await t('an invite cannot be addressed to a different email than its id', () => assertFails(
  setDoc(doc(chip, `orgs/${ORG}/invites/one@thepointcville.com`),
    { name: 'Two', email: 'two@thepointcville.com', role: 'dlt', campusId: null })));

await t('a signed in stranger with no invite cannot seat themselves', () => assertFails(
  setDoc(doc(walkin, `orgs/${ORG}/members/u_walkin`), seat({ email: 'random@gmail.com' }))));
await t('an unverified email cannot claim an invite', () => assertFails(
  setDoc(doc(unverified, `orgs/${ORG}/members/u_unver`), seat())));
await t('you cannot claim a seat at a uid that is not yours', () => assertFails(
  setDoc(doc(newbie, `orgs/${ORG}/members/somebody_else`), seat())));
await t('you cannot claim a richer role than you were invited to', () => assertFails(
  setDoc(doc(newbie, `orgs/${ORG}/members/u_newbie`), seat({ role: 'admin' }))));
await t('you cannot smuggle an extra field into your seat', () => assertFails(
  setDoc(doc(newbie, `orgs/${ORG}/members/u_newbie`), seat({ superuser: true }))));
await t('the claim date must be server stamped', () => assertFails(
  setDoc(doc(newbie, `orgs/${ORG}/members/u_newbie`), seat({ claimedAt: '2020-01-01' }))));
await t('an admin invite cannot be claimed even if one exists', () => assertFails(
  setDoc(doc(wouldbeboss, `orgs/${ORG}/members/u_boss`), {
    name: 'Would Be Boss', email: 'boss@thepointcville.com', role: 'admin',
    active: true, campusId: null, claimedAt: serverTimestamp() })));
await t('an invited person claims their own seat', () => assertSucceeds(
  setDoc(doc(newbie, `orgs/${ORG}/members/u_newbie`), seat())));
// Once the seat exists, a repeat write is an update rather than a create, and
// update is admin only. So a seat the admin switched off cannot be re-claimed.
await t('a claimed seat cannot be re-created to undo a deactivation', () => assertFails(
  setDoc(doc(newbie, `orgs/${ORG}/members/u_newbie`), seat())));
await t('and the newly seated person cannot promote themselves', () => assertFails(
  updateDoc(doc(newbie, `orgs/${ORG}/members/u_newbie`), { role: 'admin' })));

console.log('\nA SPACE IS SEALED OFF FROM THE ORG IN BOTH DIRECTIONS');
await t('a space member reads the shared tiles', () => assertSucceeds(
  getDocs(collection(chip, 'spaces/ht/entries'))));
await t('a DLT editor is BLOCKED from the shared tiles', () => assertFails(
  getDocs(collection(matt, 'spaces/ht/entries'))));
await t('a DLT editor is BLOCKED from a single shared tile', () => assertFails(
  getDoc(doc(gabe, 'spaces/ht/entries/e_book'))));
await t('a DLT editor is BLOCKED from the space document', () => assertFails(
  getDoc(doc(rachel, 'spaces/ht'))));
await t('a DLT editor is BLOCKED from the shared tag list', () => assertFails(
  getDoc(doc(matt, 'spaces/ht/meta/tags'))));
await t('a non member is BLOCKED from the space roster', () => assertFails(
  getDocs(collection(sam, 'spaces/ht/members'))));
await t('a non member cannot write a shared tile', () => assertFails(
  setDoc(doc(matt, 'spaces/ht/entries/e_sneak'), tile({ userId: 'matt' }))));

console.log('\nINSIDE THE SPACE, BOTH PEOPLE ARE EQUAL');
await t('you can read your own space seat when you have none', () => assertSucceeds(
  getDoc(doc(karen, 'spaces/ht/members/u_karen'))));
await t('an uninvited person cannot seat themselves in the space', () => assertFails(
  setDoc(doc(walkin, 'spaces/ht/members/u_walkin'), spaceSeat({ email: 'random@gmail.com', name: 'Walk In' }))));
await t('you cannot claim a space seat at a uid that is not yours', () => assertFails(
  setDoc(doc(karen, 'spaces/ht/members/somebody'), spaceSeat())));
await t('the claim must carry the invited name', () => assertFails(
  setDoc(doc(karen, 'spaces/ht/members/u_karen'), spaceSeat({ name: 'Not Karen' }))));
await t('the invited person claims their space seat', () => assertSucceeds(
  setDoc(doc(karen, 'spaces/ht/members/u_karen'), spaceSeat())));
await t('and can now read the shared tiles', () => assertSucceeds(
  getDocs(collection(karen, 'spaces/ht/entries'))));
await t('but a space seat reaches nothing on the DLT board', () => assertFails(
  getDocs(collection(karen, `orgs/${ORG}/rocks`))));
await t('and nothing in anybody\'s private roles', () => assertFails(
  getDoc(doc(karen, 'users/chip/roles/r_finance'))));
await t('and can assign a tile to the other person', () => assertSucceeds(
  updateDoc(doc(karen, 'spaces/ht/entries/e_book'), { ownerUid: 'chip' })));
await t('but cannot rewrite who created it', () => assertFails(
  updateDoc(doc(karen, 'spaces/ht/entries/e_book'), { userId: 'u_karen' })));
await t('a tile must be created under your own name', () => assertFails(
  setDoc(doc(karen, 'spaces/ht/entries/e_forged'), tile({ userId: 'chip' }))));
await t('a member creates a tile', () => assertSucceeds(
  setDoc(doc(karen, 'spaces/ht/entries/e_mine'), tile({ userId: 'u_karen' }))));
await t('a member deletes a tile', () => assertSucceeds(
  deleteDoc(doc(karen, 'spaces/ht/entries/e_mine'))));
await t('a member edits the shared tag list', () => assertSucceeds(
  setDoc(doc(karen, 'spaces/ht/meta/tags'), { categories: ['Book', 'Workbook'] }, { merge: true })));
await t('a member invites somebody else', () => assertSucceeds(
  setDoc(doc(karen, 'spaces/ht/invites/editor@example.com'),
    { name: 'Editor', email: 'editor@example.com' })));
await t('a non member cannot invite themselves in', () => assertFails(
  setDoc(doc(matt, 'spaces/ht/invites/matt@thepointcville.com'),
    { name: 'Matt', email: 'matt@thepointcville.com' })));
await t('a member cannot remove themselves', () => assertFails(
  updateDoc(doc(karen, 'spaces/ht/members/u_karen'), { active: false })));
await t('a member can remove the other person', () => assertSucceeds(
  updateDoc(doc(karen, 'spaces/ht/members/chip'), { active: false })));
await t('and removal cannot smuggle in a rename', () => assertFails(
  updateDoc(doc(karen, 'spaces/ht/members/chip'), { active: true, name: 'Hijacked' })));

console.log('\nEVERY PERSON KEEPS A PRIVATE ACCOUNT');
await t("editor is BLOCKED from Chip's Roles cards", () => assertFails(getDoc(doc(matt, 'users/chip/roles/r_finance'))));
await t("editor is BLOCKED from Chip's weekly reviews", () => assertFails(getDoc(doc(gabe, 'users/chip/reviews/w1'))));
await t("editor is BLOCKED from Chip's private tiles", () => assertFails(getDoc(doc(rachel, 'entries/e_chip'))));
await t("editor is BLOCKED from writing into Chip's private space", () => assertFails(
  setDoc(doc(matt, 'users/chip/roles/hack'), { x: 1 })));
await t("editor is BLOCKED from planting a tile in Chip's board", () => assertFails(
  setDoc(doc(matt, 'entries/e_spoof'), { userId: 'chip', title: 'spoof' })));
await t('editor is BLOCKED from handing an existing tile to Chip', () => assertFails(
  updateDoc(doc(matt, 'entries/e_matt'), { userId: 'chip' })));
await t('unfiltered entries query is BLOCKED', () => assertFails(getDocs(collection(matt, 'entries'))));
await t('entries query filtered to self is allowed', () => assertSucceeds(
  getDocs(query(collection(matt, 'entries'), where('userId', '==', 'matt')))));
await t('everyone keeps their own private tiles', () => assertSucceeds(
  setDoc(doc(matt, 'entries/e_matt2'), { userId: 'matt', title: 'mine' })));
await t('everyone gets their own private roles space', () => assertSucceeds(
  setDoc(doc(gabe, 'users/gabe/roles/r2'), { name: 'Gabe role two' })));
await t('Chip reads his own roles', () => assertSucceeds(getDoc(doc(chip, 'users/chip/roles/r_finance'))));
await t('Chip reads his own tiles', () => assertSucceeds(getDoc(doc(chip, 'entries/e_chip'))));
await t("even the admin is BLOCKED from Gabe's private roles", () => assertFails(getDoc(doc(chip, 'users/gabe/roles/r1'))));

// Routines and their findings live in the private space and are covered by the
// recursive rule above rather than one of their own. These exist so that if
// anybody ever narrows that rule, the failure is loud instead of a quiet leak
// of what somebody has and has not been keeping up with.
await t('you write your own routines', () => assertSucceeds(
  setDoc(doc(chip, 'users/chip/routines/r_cash'), { title: 'Cash position', cadence: 'daily' })));
await t('you write your own findings', () => assertSucceeds(
  setDoc(doc(chip, 'users/chip/findings/f1'), { routineId: 'r_cash', outcome: 'attention', note: 'Two charges to chase' })));
await t("an editor is BLOCKED from somebody else's routines", () => assertFails(
  getDoc(doc(matt, 'users/chip/routines/r_cash'))));
await t("the admin is BLOCKED from somebody else's findings", () => assertFails(
  getDocs(collection(chip, 'users/gabe/findings'))));

// Tiles stores tag categories at userdata/{uid}. These four exist because
// dropping this collection from the ruleset breaks tag filing silently.
await t('a person reads their own tag categories', () => assertSucceeds(
  getDoc(doc(matt, 'userdata/matt'))));
await t('a person writes their own tag categories', () => assertSucceeds(
  setDoc(doc(matt, 'userdata/matt'), { categories: ['Roles', 'People'] }, { merge: true })));
await t("nobody reads somebody else's tag categories", () => assertFails(
  getDoc(doc(matt, 'userdata/chip'))));
await t("the admin is BLOCKED from somebody else's tag categories", () => assertFails(
  setDoc(doc(chip, 'userdata/matt'), { categories: ['hijack'] }, { merge: true })));

console.log('\nPUBLISHING IS OPT IN AND NARROW');
await t('a published roles card is readable by the DLT', () => assertSucceeds(
  getDoc(doc(matt, 'users/rachel/roles/r1'))));
await t('an unpublished roles card is not', () => assertFails(
  getDoc(doc(rachel, 'users/matt/roles/r1'))));
await t('goals stay private when only roles are published', () => assertFails(
  getDoc(doc(matt, 'users/rachel/goals/g1'))));

console.log('\nSHARING WITH NAMED PEOPLE');
await t('a card shared with you by name is readable', () => assertSucceeds(
  getDoc(doc(chip, 'users/rachel/goals/g1'))));
await t('and unreadable by everyone else on the DLT', () => assertFails(
  getDoc(doc(matt, 'users/rachel/goals/g1'))));
await t('a named person outside the DLT can read what was shared with them', () => assertSucceeds(
  getDoc(doc(sam, 'users/gabe/roles/r1'))));
await t('while the DLT still cannot, because it was not published to them', () => assertFails(
  getDoc(doc(matt, 'users/gabe/roles/r1'))));
await t('naming someone for roles does not expose their goals', () => assertFails(
  getDoc(doc(sam, 'users/gabe/goals/gx'))));
await t('being named still grants no write', () => assertFails(
  setDoc(doc(sam, 'users/gabe/roles/r1'), { name: 'Hijacked' })));
await t('you cannot add yourself to somebody else\'s share list', () => assertFails(
  setDoc(doc(matt, 'users/rachel/profile/card'), { shareGoalsWith: ['matt'] }, { merge: true })));
await t('and a weekly review is still unreachable by a named person', () => assertFails(
  getDoc(doc(chip, 'users/rachel/reviews/w1'))));
await t('a weekly review is never readable, published or not', () => assertFails(
  getDoc(doc(matt, 'users/rachel/reviews/w1'))));
await t('the admin cannot read a published card either, unless seated as DLT', () => assertSucceeds(
  getDoc(doc(chip, 'users/rachel/roles/r1'))));
await t("the admin still cannot read Rachel's review", () => assertFails(
  getDoc(doc(chip, 'users/rachel/reviews/w1'))));
await t('a contributor cannot read a published card', () => assertFails(
  getDoc(doc(sam, 'users/rachel/roles/r1'))));
await t('publishing does not grant write', () => assertFails(
  setDoc(doc(matt, 'users/rachel/roles/r1'), { name: 'Hijacked' })));
await t('nobody can flip somebody else\'s share toggle', () => assertFails(
  setDoc(doc(matt, 'users/rachel/profile/card'), { shareRoles: true, shareGoals: true })));
await t('you can flip your own', () => assertSucceeds(
  setDoc(doc(rachel, 'users/rachel/profile/card'), { shareRoles: false, shareGoals: false }, { merge: true })));

console.log('\nTHE REVIEW PULSE CARRIES A DATE AND NOTHING ELSE');
await t('you write your own pulse', () => assertSucceeds(
  setDoc(doc(rachel, `orgs/${ORG}/pulse/rachel`), { lastReviewOn: '2026-07-28', weekOf: '2026-07-27', updatedAt: serverTimestamp() })));
await t('the DLT can read the pulse', () => assertSucceeds(
  getDocs(collection(matt, `orgs/${ORG}/pulse`))));
await t('you cannot write somebody else\'s pulse', () => assertFails(
  setDoc(doc(matt, `orgs/${ORG}/pulse/rachel`), { lastReviewOn: '2026-01-01', weekOf: '2026-01-01', updatedAt: serverTimestamp() })));
await t('the pulse cannot carry review content', () => assertFails(
  setDoc(doc(rachel, `orgs/${ORG}/pulse/rachel`), { lastReviewOn: '2026-07-28', weekOf: '2026-07-27', oneBigThing: 'leak', updatedAt: serverTimestamp() })));
await t('the pulse date must be server stamped', () => assertFails(
  setDoc(doc(rachel, `orgs/${ORG}/pulse/rachel`), { lastReviewOn: '2026-07-28', weekOf: '2026-07-27', updatedAt: '2020-01-01' })));
await t('a non member cannot write a pulse', () => assertFails(
  setDoc(doc(stranger, `orgs/${ORG}/pulse/stranger`), { lastReviewOn: '2026-07-28', weekOf: '2026-07-27', updatedAt: serverTimestamp() })));

console.log('\nDISCOVERY POINTERS SIGNPOST, THEY DO NOT GRANT');
await t('a recipient can read the pointer naming them', () => assertSucceeds(
  getDocs(query(collection(sam, `orgs/${ORG}/shares`), where('withUid', '==', 'sam')))));
await t('the owner can read their own pointers', () => assertSucceeds(
  getDocs(query(collection(gabe, `orgs/${ORG}/shares`), where('ownerUid', '==', 'gabe')))));
await t("you cannot read somebody else's pointers", () => assertFails(
  getDoc(doc(matt, `orgs/${ORG}/shares/gabe__sam`))));
await t('you cannot write a pointer claiming somebody shared with you', () => assertFails(
  setDoc(doc(matt, `orgs/${ORG}/shares/rachel__matt`), { ownerUid: 'rachel', ownerName: 'Rachel', withUid: 'matt' })));
await t('you can write a pointer for your own share', () => assertSucceeds(
  setDoc(doc(rachel, `orgs/${ORG}/shares/rachel__matt`), { ownerUid: 'rachel', ownerName: 'Rachel', withUid: 'matt' })));
await t('a pointer alone does not open the card', () => assertFails(
  getDoc(doc(matt, 'users/rachel/goals/g1'))));
await t('you can delete your own pointer', () => assertSucceeds(
  deleteDoc(doc(rachel, `orgs/${ORG}/shares/rachel__matt`))));
await t("you cannot delete somebody else's", () => assertFails(
  deleteDoc(doc(matt, `orgs/${ORG}/shares/gabe__sam`))));

console.log(`\n${pass} passed, ${fail} failed\n`);
await env.cleanup();
process.exit(fail ? 1 : 0);
