import type { Timestamp } from 'firebase/firestore';
import type { RockStatus } from './dlt';

/**
 * A person's own space. Roles and Expectations, annual goals, weekly reviews.
 *
 * Private by default. The roles card and the goals can each be published to the
 * DLT by their owner. Weekly reviews cannot be published at all, by design.
 */

export interface Profile {
  /** Shown at the top of the card. Defaults to the person's title. */
  title: string;
  reportsTo: string;
  purpose: string;
  /**
   * Owner controlled, all four. The booleans publish to the whole DLT. The two
   * lists publish to named people, who do not have to be on the DLT at all, so a
   * card can be shared with one person without going public to the leadership
   * table.
   *
   * Nothing here is shared by default, and the weekly review is not shareable by
   * any of them.
   */
  shareRoles: boolean;
  shareGoals: boolean;
  shareRolesWith: string[];
  shareGoalsWith: string[];
  /** Ranking is per person, so the order lives here. */
  roleOrder: string[];
}

export const EMPTY_PROFILE: Profile = {
  title: '', reportsTo: '', purpose: '',
  shareRoles: false, shareGoals: false,
  shareRolesWith: [], shareGoalsWith: [],
  roleOrder: [],
};

export type ItemKind = 'Rock' | 'Priority' | 'Project';
export const ITEM_KINDS: ItemKind[] = ['Rock', 'Priority', 'Project'];

export interface RoleItem {
  id: string;
  title: string;
  kind: ItemKind;
  status: RockStatus;
  next: string;
  due: string;
  note: string;
  /** Set once this item's next move has been pushed into Tiles. The card
   *  names the commitment; Tiles carries the execution. */
  tileId?: string | null;
}

export interface Role {
  id: string;
  name: string;
  /** 'core' shows first, 'oversight' is the second band on the card. */
  group: 'core' | 'oversight';
  /** True when the expectations were drafted for you and still need your words. */
  draft: boolean;
  expectations: string[];
  items: RoleItem[];
  order: number;
  /**
   * The last date anything on this role actually moved: a status changed or a
   * next move was written. Renaming the card does not count, and neither does
   * ranking it.
   *
   * This is the one thing a task list structurally cannot tell you. Tiles knows
   * what you remembered. This knows what you forgot.
   */
  lastMovedOn?: string | null;
}

/**
 * How long an area may go untouched before it counts as quiet.
 *
 * Core roles are the work; three weeks of silence there is a signal. Oversight
 * areas run on a longer rhythm, so six weeks. Both are deliberately generous:
 * the point is to catch the thing nobody has thought about since spring, not to
 * nag about a normal fortnight.
 */
export const QUIET_AFTER: Record<Role['group'], number> = { core: 21, oversight: 42 };

export function daysQuiet(role: Role): number | null {
  if (!role.lastMovedOn) return null;
  const [y, m, d] = role.lastMovedOn.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.round((Date.now() - new Date(y, m - 1, d).getTime()) / 86400000);
}

export function isQuiet(role: Role): boolean {
  const n = daysQuiet(role);
  return n === null || n > QUIET_AFTER[role.group];
}

/** Past this, the card suggests the rest belongs in Tiles. */
export const ITEM_SOFT_CAP = 2;

/**
 * A goal from the annual review. Personal, and private unless published.
 * A goal without a measure is a wish, so measure and target are first class.
 */
export interface Goal {
  id: string;
  title: string;
  measure: string;
  target: string;
  current: string;
  year: string;
  status: RockStatus;
  note: string;
  /** Set at the mid year check so you can see whether it was ever revisited. */
  reviewedOn: string | null;
  order: number;
}

export type LastOutcome = '' | 'done' | 'partly' | 'no';

export interface Review {
  id: string;
  /** ISO date the review was completed. */
  date: string;
  weekOf: string;
  /**
   * What you thought the week was about before you looked at anything. Optional.
   * Kept because the gap between this and oneBigThing is the interesting part:
   * if they differ most weeks, your instinct about your own week is off, and
   * that is worth knowing about yourself.
   */
  instinct: string;
  /** What the week is about, named after walking the board. */
  oneBigThing: string;
  /** Top three role names, in the order chosen that week. */
  focus: string[];
  /** How last week's one big thing actually went. */
  lastOutcome: LastOutcome;
  lastWhy: string;
  createdAt: Timestamp | null;
}

/** Written to the shared board so the team can see that a review happened. */
export interface Pulse {
  uid: string;
  lastReviewOn: string;
  weekOf: string;
}

export const OUTCOME_LABEL: Record<Exclude<LastOutcome, ''>, string> = {
  done: 'Yes, it happened',
  partly: 'Partly',
  no: 'No',
};

/** Monday of the week containing the given date. The Point plans Monday to Sunday. */
export function mondayOf(d = new Date()): string {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
