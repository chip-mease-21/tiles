import type { Timestamp } from 'firebase/firestore';

export const ORG_ID = 'thepoint';

export type Role = 'admin' | 'dlt' | 'contributor' | 'campus';

export type RockStatus = 'not-started' | 'on-track' | 'caution' | 'off-track' | 'done';
export const ROCK_STATUSES: RockStatus[] = ['not-started', 'on-track', 'caution', 'off-track', 'done'];

export const STATUS_LABEL: Record<RockStatus, string> = {
  'not-started': 'Not started',
  'on-track': 'On track',
  caution: 'Caution',
  'off-track': 'Off track',
  done: 'Done',
};

/** Glyph plus label, never colour alone. */
export const STATUS_GLYPH: Record<RockStatus, string> = {
  'not-started': '○',
  'on-track': '●',
  caution: '▲',
  'off-track': '■',
  done: '✓',
};

export interface Member {
  uid: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  campusId: string | null;
}

/**
 * A seat assigned to an email address before that person has ever signed in.
 * Claiming one is the only way a member document gets created by anybody other
 * than the admin, and it can only ever produce the role written here.
 */
export interface Invite {
  /** Lowercase, and also the document id. */
  email: string;
  name: string;
  /** Never 'admin'. Promotion stays a deliberate act on the members screen. */
  role: Exclude<Role, 'admin'>;
  campusId: string | null;
}

export interface Rock {
  id: string;
  title: string;
  /** What we are actually agreeing this rock means. Prevents two people
   *  carrying the same words toward different finish lines. */
  description: string;
  ownerUid: string | null;
  ownerLabel: string;
  semester: string;
  status: RockStatus;
  statusNote: string;
  due: string;
  order: number;
  updatedAt: Timestamp | null;
  updatedBy: string;
}

export interface Issue {
  id: string;
  text: string;
  note: string;
  raisedByUid: string;
  raisedByLabel: string;
  raised: string;
  status: 'open' | 'done';
  /** Set when closing produced a decision. Points at a decisions document. */
  decisionId: string | null;
  /** Set when closing did not produce a decision. One line on why. */
  closeReason: string;
  longTerm: boolean;
  order: number;
  updatedAt: Timestamp | null;
  updatedBy: string;
}

export interface Decision {
  id: string;
  issue: string;
  issueId: string | null;
  decided: string;
  reviewDue: string | null;
  reviewedAt: string | null;
  notes: string[];
}

export interface PriorityGroup {
  id: string;
  name: string;
  pastor: string;
  status: RockStatus;
  priorities: string[];
  /** Semester attendance goal. Campuses only; departments leave it at 0. */
  attendanceGoal: number;
  order: number;
}

export interface CultureGroup {
  id: string;
  group: string;
  items: { label: string; status: RockStatus }[];
  order: number;
}

export interface Picture {
  id: string;
  label: string;
  /** The narrative. What this looks like in plain language, two or three sentences. */
  vision: string;
  revenue: string;
  cash: string;
  debt: string;
  dt: string;
  groups: string;
  attendance: Record<string, number>;
}

export interface OrgSettings {
  weekOf: string;
  semester: string;
  sheetArchiveUrl: string;
}

/** Minimum characters for a status note or a close reason. Mirrors firestore.rules. */
export const MIN_NOTE = 3;

export const canEditEverything = (role: Role | null): boolean => role === 'admin' || role === 'dlt';
export const canSeeBoard = (role: Role | null): boolean =>
  role === 'admin' || role === 'dlt' || role === 'contributor';
