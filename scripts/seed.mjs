/**
 * Seed the DLT Workspace from the DLT Alignment Dashboard.
 *
 * Data below is the sheet as read on July 28, 2026 (sheet stamped week of
 * June 22, 2026). Rocks, issues, campuses, NextGen, culture grades, the
 * decision log and the 1 and 3 year picture.
 *
 * Run ONCE against a real project, after you have created the org document and
 * seated the first admin in the Firebase console.
 *
 *   npm i firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *   ORG_ID=thepoint CHIP_UID=<uid> MATT_UID=<uid> GABE_UID=<uid> RACHEL_UID=<uid> \
 *   node scripts/seed.mjs
 *
 * Any uid you do not have yet can be left out. That person is seated later from
 * the member admin screen, after they have signed in once.
 *
 * Pass DRY_RUN=1 to print what it would write without writing.
 * Re-running overwrites the seeded documents by id. It does not delete anything
 * you have added since.
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ORG = process.env.ORG_ID || 'thepoint';
const CHIP   = process.env.CHIP_UID   || null;
const MATT   = process.env.MATT_UID   || null;
const GABE   = process.env.GABE_UID   || null;
const RACHEL = process.env.RACHEL_UID || null;
const DRY    = process.env.DRY_RUN === '1';

// Everyone below sees the whole DLT board and can change anything on it.
// Membership itself stays with the admin.
const EDITORS = [
  { uid: MATT,   name: 'Matt P.',         email: '' },
  { uid: GABE,   name: 'Gabe Turner',     email: '' },
  { uid: RACHEL, name: 'Rachel Crowder',  email: 'rachel@thepointcville.com' },
];

if (!CHIP && !DRY) {
  console.error('Set CHIP_UID to Chip\'s Firebase Auth uid, or run with DRY_RUN=1.');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const SEMESTER = '2026-summer';
const now = () => FieldValue.serverTimestamp();

/* ------------------------------------------------------------------ rocks */
// ownerUid is filled where we know the uid. Organization rocks carry null and
// are admin maintained. Set MATT_UID once Matt has signed in, or patch his
// rocks from the member admin screen later.
const rocks = [
  { id: 'r_org_capacity', description: 'Every campus has a defined capacity threshold and a plan for crossing it. Done when the thresholds are written and the service decisions for the year are made.',  title: 'Capacity',              ownerUid: null, ownerLabel: 'Organization', status: 'on-track',    due: '2026-08-31', order: 1 },
  { id: 'r_chip_finmat', description: 'Move from year to year budgeting to 3 to 5 year forecasting. Done when the model, board reporting and a maintenance and replacement schedule exist and the board has seen them.',   title: 'Financial maturity',    ownerUid: CHIP, ownerLabel: 'Chip Measells',         status: 'on-track',    due: '2026-08-31', order: 2 },
  { id: 'r_chip_anchor', description: 'Young adults ministry. Done when there is a vision statement, a ministry strategy and a 12 month roadmap with owners, milestones and metrics. Programs do not launch before the strategy is defined.',   title: 'Anchor Point',          ownerUid: CHIP, ownerLabel: 'Chip Measells',         status: 'caution',     due: '2026-08-31', order: 3, note: 'Vision statement not locked. Young Adults is the same conversation on the issues list.' },
  { id: 'r_chip_donor', description: 'Relaunch donor development. Five deliverables: Playbook, Comms Plan, High Capacity Donor Plan, Dashboards, Engagement Toolkit. Done when the Playbook defines tiers, journey stages and cadences.',    title: 'Donor development',     ownerUid: CHIP, ownerLabel: 'Chip Measells',         status: 'not-started', due: '2026-08-31', order: 4, note: 'Not started as of the week of Jun 22. Five weeks to the due date.' },
  { id: 'r_matt_capacity', description: 'Campus side of the capacity plan. Done when Waynesboro and Pantops services are running and Ridge has a recommendation.', title: 'Capacity',              ownerUid: MATT, ownerLabel: 'Matt P.',         status: 'on-track',    due: '2026-08-31', order: 5 },
  { id: 'r_matt_student', description: 'Studentlife. Description not yet agreed. Write it before the next rock review.',  title: 'Studentlife',           ownerUid: MATT, ownerLabel: 'Matt P.',         status: 'on-track',    due: '2026-08-31', order: 6 },
  { id: 'r_matt_three', description: 'Not yet named. A rock without a name and a description is not a rock.',    title: 'Rock 3, not yet named', ownerUid: MATT, ownerLabel: 'Matt P.',         status: 'not-started', due: '2026-08-31', order: 7 },
];

/* ----------------------------------------------------------------- issues */
const issues = [
  { id: 'i_cadence',  text: 'DLT meeting cadence, moving from 1hr to 2hr', note: 'Chip and Matt to set', raised: '2026-05-05', status: 'open', by: CHIP, byLabel: 'Chip', order: 1 },
  { id: 'i_kyler',    text: "Review of Kyler's follow up on strategy",     note: '',                     raised: '2026-05-06', status: 'open', by: CHIP, byLabel: 'Chip', order: 2 },
  { id: 'i_ya',       text: 'Young Adults',                                note: 'Same conversation as the Anchor Point rock', raised: '2026-05-09', status: 'open', by: CHIP, byLabel: 'Chip', order: 3 },
  { id: 'i_model',    text: '5 Year Model Review and Decisions',           note: '',                     raised: '2026-05-09', status: 'open', by: CHIP, byLabel: 'Chip', order: 4 },
  { id: 'i_checkin',  text: 'Check-In Policy for Dream Team',              note: 'Chip and Matt',        raised: '2026-05-10', status: 'open', by: CHIP, byLabel: 'Chip', order: 5 },
  { id: 'i_pantops',  text: 'Pantops attendance decline, strategy decision needed', note: 'See decision log, decided 6/8', raised: '2026-05-12', status: 'done', by: CHIP, byLabel: 'Chip', order: 6, decisionId: 'd_pantops' },
  { id: 'i_fourth',   text: 'Decisions on 4th Services and WES',           note: 'June routines: mid-year review, DLT offsite, ministry review, people review, financial review', raised: '2026-05-19', status: 'done', by: CHIP, byLabel: 'Chip', order: 7, closeReason: 'Settled in the June 8 capacity decisions' },
  { id: 'i_louisa',   text: 'Louisa building capacity',                    note: 'Fourth here, Tony to set date. Waynesboro two services at WES pending RTW. Louisa build out quote.', raised: '2026-05-20', status: 'done', by: CHIP, byLabel: 'Chip', order: 8, closeReason: 'Capacity settled June 8, build out quote is the remaining step' },
  { id: 'i_sunday',   text: 'Vision for Sunday',                           note: 'Long term. Have we lost a vision for a Sunday.', raised: '2026-06-08', status: 'open', by: CHIP, byLabel: 'Chip', order: 9, longTerm: true },
];

/* -------------------------------------------------------------- decisions */
const decisions = [
  {
    id: 'd_pantops',
    issueId: 'i_pantops',
    issue: 'Pantops attendance decline, strategy decision needed',
    decided: '2026-06-08',
    reviewDue: '2026-09-08',
    notes: [
      'Threshold at each campus defined, Chip and Matt to follow up',
      'Pantops fourth service, tentative date Aug 23, Christopher for Guest Dream Team build support',
      'Waynesboro set Aug 16',
      'Push for Ridge experience and growth, Chip, Kyler and Andrew to develop plan by mid July',
      'Consider Ridge second service in October, decision in August',
    ],
  },
];

/* --------------------------------------------------------------- campuses */
const campuses = [
  { id: 'ridge', attendanceGoal: 130,      name: 'Downtown Ridge Street', status: 'on-track',  order: 1, priorities: ['Build neighborhood reach team', 'Resource Kids volunteer growth', 'Launch baptism pathway'] },
  { id: 'louisa', attendanceGoal: 900,     name: 'Louisa',                status: 'caution',   order: 2, priorities: ['Stabilize Kids team', 'Recruit worship lead', 'Strengthen first-time guest follow-up'] },
  { id: 'pantops', attendanceGoal: 1600,    name: 'Pantops',               status: 'off-track', order: 3, priorities: ['Reverse attendance decline', 'Re-engage core attenders', 'Reset Dream Team rhythm'] },
  { id: 'waynesboro', attendanceGoal: 180, name: 'Waynesboro',            status: 'on-track',  order: 4, priorities: ['Move from launch to sustained rhythm', 'Build local leader bench', 'Activate first small groups'] },
];

const nextgen = [
  { id: 'kids',     name: 'Kids',         status: 'on-track', order: 1, priorities: ['Family Discipleship Plan rollout', 'Volunteer ratio targets', 'Curriculum alignment'] },
  { id: 'students', name: 'Students',     status: 'caution',  order: 2, priorities: ['Small group leader pipeline', 'Summer camp readiness', 'Parent partnership plan'] },
  { id: 'ya',       name: 'Young Adults', status: 'on-track', order: 3, priorities: ['Cross-campus gathering rhythm', 'Discipleship cohort', 'Leadership development track'] },
];

/* ------------------------------------------------------------ departments */
// Below NextGen. These mirror the oversight areas on Chip's roles card.
const departments = [
  { id: 'hr',      name: 'HR',             status: 'on-track', order: 1, priorities: ['Handbook and policy review', 'Hold the line on net new headcount', 'Onboarding and offboarding standard'] },
  { id: 'comms',   name: 'Communications', status: 'on-track', order: 2, priorities: ['Align the calendar to the 2027 planning sprint', 'One message per weekend', 'Campus launch communications'] },
  { id: 'reach',   name: 'Local Reach',    status: 'caution',  order: 3, priorities: ['Decide whether Path Out of Poverty is active for 2027', 'Connect outreach to a discipleship next step', 'Steward existing partnerships'] },
];

/* ---------------------------------------------------------------- culture */
const culture = [
  { id: 'values', group: 'Staff values', order: 1, items: [
    { label: 'Humility', status: 'on-track' }, { label: 'Gratitude', status: 'on-track' },
    { label: 'Trust', status: 'caution' }, { label: 'Excellence', status: 'on-track' },
    { label: 'Generosity', status: 'on-track' } ] },
  { id: 'mantras', group: 'Mantras', order: 2, items: [
    { label: 'We pray first', status: 'caution' }, { label: 'Found people find people', status: 'on-track' },
    { label: 'Hands on the net', status: 'on-track' }, { label: 'Everybody has a next step', status: 'caution' } ] },
  { id: 'hospitality', group: 'Next Level Hospitality', order: 3, items: [
    { label: 'You belong here', status: 'on-track' }, { label: 'We are ready for you', status: 'caution' },
    { label: 'Every interaction matters', status: 'on-track' }, { label: 'Every detail matters', status: 'off-track' } ] },
];

/* ---------------------------------------------------------------- picture */
const picture = [
  { id: 'y1', label: 'End of 2026', vision: '', revenue: '$6,400,000',  cash: '$1,800,000', debt: '$7,800,000', dt: '80%', groups: '50%',
    attendance: { 'Downtown Ridge Street': 130, 'Louisa': 900,  'Pantops': 1600, 'Waynesboro': 180 } },
  { id: 'y3', label: 'End of 2028', vision: '', revenue: '$10,600,000', cash: '$2,000,000', debt: '$6,000,000', dt: '90%', groups: '60%',
    attendance: { 'Downtown Ridge Street': 167, 'Louisa': 1099, 'Pantops': 1814, 'Waynesboro': 283 } },
];

/* ------------------------------------------- Chip's private Roles card */
// Written to users/<CHIP_UID>/roles. Private to Chip unless he publishes it.
// Nobody else's card is seeded; each person writes their own.
const chipRoles = [
  {
    "id": "r_finance",
    "name": "Finance",
    "group": "core",
    "draft": false,
    "expectations": [
      "Ensure financial oversight and accountability by maintaining strong controls, conducting regular reviews, and ensuring compliance.",
      "Develop and execute strategic fundraising and investment campaigns to support long-term financial sustainability.",
      "Cultivate and engage high-capacity donors through personalized strategies and impactful communication.",
      "Implement and manage a 10-year capital plan to align assets and expenditures with ministry growth.",
      "Communicate financial health with transparency through clear, timely, and actionable reporting."
    ],
    "order": 1,
    "items": [
      {
        "id": "i_fin1",
        "title": "Financial Maturity",
        "kind": "Rock",
        "status": "on-track",
        "next": "Follow up with Heather on event expense tracking. Research maintenance and replacement costs for the model.",
        "due": "2026-08-31",
        "note": "Move from year to year budgeting to 3 to 5 year forecasting. Board reporting and base model complete. Sheet confirms On track as of Jun 22."
      },
      {
        "id": "i_fin2",
        "title": "Donor Development Relaunch",
        "kind": "Rock",
        "status": "not-started",
        "next": "Draft the Donor Playbook outline. Define tiers, journey stages, and cadences. Block two hours.",
        "due": "2026-08-31",
        "note": "Sheet still shows Not started as of the week of Jun 22. Five deliverables: Playbook, Comms Plan, High Capacity Donor Plan, Dashboards, Engagement Toolkit. Due Aug 31, which is now about five weeks out."
      },
      {
        "id": "i_fin3",
        "title": "Board reserves policy",
        "kind": "Priority",
        "status": "caution",
        "next": "Get it approved. It has been sitting since June.",
        "due": "",
        "note": "Sequence is fixed: reserves to 90 plus days, then Henderson Note payoff, then capacity investment."
      }
    ],
    "lastMovedOn": "2026-07-25"
  },
  {
    "id": "r_strategy",
    "name": "Strategic Guidance",
    "group": "core",
    "draft": false,
    "expectations": [
      "Ensure organizational alignment by keeping all departments and campuses strategically focused on the church's vision.",
      "Drive the execution of operational strategies by equipping teams with clear direction, resources, and accountability.",
      "Develop and implement a National and International Reach Strategy that expands the church's impact.",
      "Provide strategic guidance to leadership by offering data-driven insights and recommendations."
    ],
    "order": 2,
    "items": [
      {
        "id": "i_str1",
        "title": "Anchor Point",
        "kind": "Rock",
        "status": "caution",
        "next": "Lock the vision statement with the team. Do not launch programs until strategy is defined.",
        "due": "2026-08-31",
        "note": "Sheet has this as a Chip rock, Caution, due Aug 31. Young Adults is also sitting as an open DLT issue, which is the same conversation in two places. Decide whether they merge."
      },
      {
        "id": "i_str2",
        "title": "Campus capacity plan",
        "kind": "Priority",
        "status": "on-track",
        "next": "Execute the June 8 decisions. Confirm the Pantops Aug 23 date and hold Ridge for the October call.",
        "due": "2026-08-23",
        "note": "Decided 6/8/2026. 1) Capacity threshold defined at each campus, Chip and Matt to follow up. 2) Pantops fourth service, tentative Aug 23, Christopher building Guest Dream Team support. 3) Waynesboro set for Aug 16. 4) Push Ridge experience and growth, Chip, Kyler and Andrew to develop the plan by mid July. 5) Ridge second service considered for October, decision in August."
      },
      {
        "id": "i_str3",
        "title": "2027 Planning Sprint",
        "kind": "Project",
        "status": "on-track",
        "next": "Run Meeting 2, the Goal Labs, on schedule.",
        "due": "",
        "note": "Shared vocabulary is locked: Initiative, Goal, Rock, Ministry, Program, Event, Standard, Theme."
      }
    ],
    "lastMovedOn": "2026-07-23"
  },
  {
    "id": "r_ops",
    "name": "Operations",
    "group": "core",
    "draft": false,
    "expectations": [
      "Implement and oversee the operating system to ensure efficiency, consistency, and alignment with organizational goals.",
      "Develop and execute a long-term IT strategy that supports operations and Next Steps.",
      "Operationalize The Intentional Life to ensure full integration into church systems and processes."
    ],
    "order": 3,
    "items": [
      {
        "id": "i_ops1",
        "title": "Decision Log",
        "kind": "Rock",
        "status": "caution",
        "next": "Schedule the first closed loop review cycle. Compare actual outcomes against what was expected.",
        "due": "2026-08-31",
        "note": "Notion database built and logging. The closed loop review is what turns it from a record into memory."
      },
      {
        "id": "i_ops2",
        "title": "DLT weekly meeting",
        "kind": "Priority",
        "status": "caution",
        "next": "Run the 65 minute framework tight. Every issue ends with a to do, an owner, and a date.",
        "due": "",
        "note": "Check in 5, Scorecard 5, Rock Review 5, To Do Review 5, IDS 40, Conclude 5."
      },
      {
        "id": "i_ops3",
        "title": "Operating Inventory",
        "kind": "Project",
        "status": "on-track",
        "next": "Finish the inventory so every ministry, program, and event has an owner.",
        "due": "",
        "note": "Event Brief Template, Events Framework, and Point Spectrum are drafted."
      }
    ],
    "lastMovedOn": "2026-07-22"
  },
  {
    "id": "r_people",
    "name": "Organizational Health and People Development",
    "group": "core",
    "draft": false,
    "expectations": [
      "Ensure the church's values are actively lived out by embedding them into culture, decision-making, and daily operations.",
      "Align the right people in the right roles by assessing team structure, strengths, and organizational needs.",
      "Develop leaders at every level by providing training, mentorship, and growth opportunities to match the pace of organizational expansion."
    ],
    "order": 4,
    "items": [
      {
        "id": "i_ppl1",
        "title": "Dream Team vacancy strategy",
        "kind": "Priority",
        "status": "off-track",
        "next": "Bring this to DLT as a systems issue. A 29% vacancy rate against a 10% benchmark will not be recruited away.",
        "due": "",
        "note": "Dream Team is up 41% year over year and vacancy is still 29%. Roles are growing faster than the pipeline."
      },
      {
        "id": "i_ppl2",
        "title": "Q4 DLT addition",
        "kind": "Priority",
        "status": "caution",
        "next": "Draft the role and the reasoning before Gabe asks for it. Frame it as relieving load, not restructuring authority.",
        "due": "",
        "note": "Anticipated Q4 to split Matt P.'s role. This is the clean structural moment to reset operating rhythm."
      },
      {
        "id": "i_ppl3",
        "title": "Equipped for Impact",
        "kind": "Project",
        "status": "caution",
        "next": "Confirm the 24 month leadership framework has a live cohort, not just a document.",
        "due": "",
        "note": "Develop leaders at every level to match the pace of expansion."
      }
    ],
    "lastMovedOn": "2026-07-08"
  },
  {
    "id": "r_vision",
    "name": "Vision Execution Oversight",
    "group": "core",
    "draft": false,
    "expectations": [
      "Align Ministry Strategies with Vision. Ensure all departments, campuses, and initiatives actively align with and execute the vision set by the Senior Pastor.",
      "Translate Vision into Actionable Plans. Develop clear, strategic plans that break the vision into measurable steps, ensuring successful implementation across the organization.",
      "Monitor and Drive Execution. Regularly assess progress on vision-related initiatives, identifying roadblocks and providing solutions to maintain momentum.",
      "Ensure Clear Communication of Vision. Consistently reinforce and communicate the vision to staff, leaders, and volunteers, ensuring alignment and engagement at every level.",
      "Adapt and Optimize Based on Feedback. Gather insights from staff, leadership, and church members to refine execution strategies while staying true to the vision."
    ],
    "order": 5,
    "items": [
      {
        "id": "i_vis1",
        "title": "Ministry alignment to the Core Map",
        "kind": "Priority",
        "status": "caution",
        "next": "Audit each campus and department against Intentional Life, Growth Initiatives, and Operational Pillars.",
        "due": "",
        "note": "The Core Map is the test. Anything that does not trace back is a distraction."
      },
      {
        "id": "i_vis2",
        "title": "Cascading messages",
        "kind": "Priority",
        "status": "caution",
        "next": "Do not end a DLT meeting without naming what each person carries back to their team.",
        "due": "",
        "note": "The most commonly skipped segment and the one that decides whether decisions reach the organization."
      },
      {
        "id": "i_vis3",
        "title": "Semester rock cycle",
        "kind": "Project",
        "status": "on-track",
        "next": "Summer rocks close Aug 31. Start Fall rock setting in mid August, not September 1.",
        "due": "2026-08-31",
        "note": "Spring Jan to Apr, Summer May to Aug, Fall Sep to Dec."
      }
    ],
    "lastMovedOn": "2026-07-10"
  },
  {
    "id": "r_hr",
    "name": "HR",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Keep employment practice, policy, and documentation current and compliant.",
      "Own hiring, onboarding, and offboarding so every seat is filled well and left well.",
      "Protect staff health through compensation review, a performance rhythm, and honest conflict resolution."
    ],
    "order": 6,
    "items": [
      {
        "id": "i_hr1",
        "title": "Handbook and policy review",
        "kind": "Project",
        "status": "on-track",
        "next": "Confirm the review date and who is doing it.",
        "due": "",
        "note": ""
      },
      {
        "id": "i_hr2",
        "title": "Comp ratio discipline",
        "kind": "Priority",
        "status": "caution",
        "next": "Hold the line on net new headcount. Bring any exception to Gabe with the revenue case attached.",
        "due": "",
        "note": "43% of income against a 35% optimal. Multi campus reality, but the number still governs."
      }
    ],
    "lastMovedOn": "2026-07-14"
  },
  {
    "id": "r_comms",
    "name": "Communications",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Ensure the vision is communicated consistently across every campus and every channel.",
      "Own the annual and semester communications calendar so nothing competes with itself.",
      "Protect brand and message clarity as the number of campuses grows."
    ],
    "order": 7,
    "items": [
      {
        "id": "i_cm1",
        "title": "Comms calendar for 2027",
        "kind": "Project",
        "status": "on-track",
        "next": "Align the calendar to the 2027 planning sprint outputs.",
        "due": "",
        "note": ""
      }
    ],
    "lastMovedOn": "2026-07-17"
  },
  {
    "id": "r_it",
    "name": "IT",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Keep systems, data, and access secure and current.",
      "Maintain the platform stack so Next Steps and giving never break on a Sunday.",
      "Build a long term technology plan that scales ahead of campus growth rather than reacting to it."
    ],
    "order": 8,
    "items": [
      {
        "id": "i_it1",
        "title": "Long term IT strategy",
        "kind": "Priority",
        "status": "not-started",
        "next": "Name one owner and a first checkpoint. This has no forward motion right now.",
        "due": "",
        "note": "Named in the role description, no current plan. The most neglected item on this card."
      }
    ],
    "lastMovedOn": null
  },
  {
    "id": "r_fac",
    "name": "Facilities",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Keep every campus safe, functional, and ready for guests.",
      "Maintain a preventive maintenance and replacement schedule tied to the capital model.",
      "Ensure facility capacity decisions are made ahead of growth, not behind it."
    ],
    "order": 9,
    "items": [
      {
        "id": "i_fa1",
        "title": "Maintenance and replacement research",
        "kind": "Project",
        "status": "caution",
        "next": "Finish the cost research. It feeds the capital model and the Financial Maturity rock.",
        "due": "",
        "note": ""
      }
    ],
    "lastMovedOn": "2026-06-15"
  },
  {
    "id": "r_build",
    "name": "Building Projects",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Own scope, budget, and timeline on every active project.",
      "Keep Gabe and the board informed at the thresholds the bylaws require.",
      "Sequence projects against reserves and debt position, not against enthusiasm."
    ],
    "order": 10,
    "items": [
      {
        "id": "i_bp1",
        "title": "Kmart next steps",
        "kind": "Priority",
        "status": "caution",
        "next": "Follow up with Jenny Stoner on next steps.",
        "due": "",
        "note": ""
      },
      {
        "id": "i_bp2",
        "title": "Louisa build out",
        "kind": "Priority",
        "status": "on-track",
        "next": "Get the build out quote in. The capacity question itself was closed June 8.",
        "due": "",
        "note": "Louisa building capacity was marked Completed on the sheet. What remains is the build out quote."
      }
    ],
    "lastMovedOn": "2026-06-15"
  },
  {
    "id": "r_launch",
    "name": "New Campus Launch",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Maintain the launch playbook so the next campus is repeatable, not heroic.",
      "Confirm financial and leadership readiness before a launch date is set.",
      "Support launched campuses through the first 24 months until they run on the standard."
    ],
    "order": 11,
    "items": [
      {
        "id": "i_nl1",
        "title": "Launch readiness",
        "kind": "Project",
        "status": "on-track",
        "next": "Nothing in flight. Hold until reserves clear the floor and the capacity decisions close.",
        "due": "",
        "note": "Two launches in 17 months is the context behind the Pantops decline. Do not add a third until the last one is healthy."
      }
    ],
    "lastMovedOn": "2026-06-22"
  },
  {
    "id": "r_reach",
    "name": "Local Reach",
    "group": "oversight",
    "draft": true,
    "expectations": [
      "Ensure local outreach connects to discipleship, not just service events.",
      "Steward partnerships so the church shows up in the community consistently.",
      "Keep initiatives aligned to the Core Map and hand them off to ministry when they mature."
    ],
    "order": 12,
    "items": [
      {
        "id": "i_lr1",
        "title": "Path Out of Poverty",
        "kind": "Priority",
        "status": "caution",
        "next": "Decide whether this is an active initiative for 2027 or stays parked. Name it in the planning sprint.",
        "due": "",
        "note": ""
      }
    ],
    "lastMovedOn": "2026-06-29"
  }
];

const chipProfile = {
  title: 'Executive Director',
  reportsTo: 'Reports to Senior Pastor',
  purpose: "My job is to execute the vision God has placed on Pastor Gabe's heart to further The Kingdom's Purpose through The Point.",
  shareRoles: false,
  shareGoals: false,
  roleOrder: chipRoles.map((r) => r.id),
};

/* ------------------------------------------------------------------- run */
async function run() {
  const base = db.doc(`orgs/${ORG}`);
  const plan = [];

  plan.push([base, { name: 'The Point Church', createdAt: now() }, true]);

  plan.push([base.collection('meta').doc('settings'), {
    weekOf: '2026-07-27',
    semester: SEMESTER,
    sheetArchiveUrl: 'https://docs.google.com/spreadsheets/d/1JWtt6pJ_OVTdwTc5S1VFHM26y2poJg8RC5QPqtXqzug/edit',
    seededFrom: 'DLT Alignment Dashboard, sheet week of 2026-06-22, read 2026-07-28',
  }, true]);

  if (CHIP) {
    plan.push([base.collection('members').doc(CHIP),
      { name: 'Chip Measells', email: 'chip@thepointcville.com', role: 'admin', active: true, campusId: null, createdAt: now(), updatedAt: now() }, true]);
  }

  EDITORS.forEach((p) => {
    if (!p.uid) { console.log(`skipping ${p.name}, no uid set. Seat them from the member admin screen after they sign in once.`); return; }
    plan.push([base.collection('members').doc(p.uid),
      { name: p.name, email: p.email, role: 'dlt', active: true, campusId: null, createdAt: now(), updatedAt: now() }, true]);
  });

  rocks.forEach((r) => plan.push([base.collection('rocks').doc(r.id), {
    title: r.title, description: r.description || '', ownerUid: r.ownerUid, ownerLabel: r.ownerLabel, semester: SEMESTER,
    status: r.status, statusNote: r.note || '', due: r.due, order: r.order,
    createdAt: now(), updatedAt: now(), updatedBy: CHIP || 'seed',
  }, false]));

  issues.forEach((i) => plan.push([base.collection('issues').doc(i.id), {
    text: i.text, note: i.note || '', raisedByUid: i.by, raisedByLabel: i.byLabel,
    raised: i.raised, status: i.status, order: i.order,
    longTerm: !!i.longTerm, decisionId: i.decisionId || null,
    closeReason: i.closeReason || '',
    updatedAt: now(), updatedBy: CHIP || 'seed',
  }, false]));

  decisions.forEach((d) => plan.push([base.collection('decisions').doc(d.id),
    { issue: d.issue, decided: d.decided, reviewDue: d.reviewDue || null, notes: d.notes }, false]));

  campuses.forEach((c) => plan.push([base.collection('campuses').doc(c.id),
    { name: c.name, pastor: '', status: c.status, priorities: c.priorities,
      attendanceGoal: c.attendanceGoal || 0, order: c.order }, false]));

  nextgen.forEach((n) => plan.push([base.collection('nextgen').doc(n.id),
    { name: n.name, pastor: '', status: n.status, priorities: n.priorities,
      attendanceGoal: 0, order: n.order }, false]));

  departments.forEach((d) => plan.push([base.collection('departments').doc(d.id),
    { name: d.name, pastor: '', status: d.status, priorities: d.priorities,
      attendanceGoal: 0, order: d.order }, false]));

  culture.forEach((c) => plan.push([base.collection('culture').doc(c.id),
    { group: c.group, items: c.items, order: c.order }, false]));

  picture.forEach((p) => plan.push([base.collection('picture').doc(p.id),
    { label: p.label, vision: p.vision || '', revenue: p.revenue, cash: p.cash,
      debt: p.debt, dt: p.dt, groups: p.groups, attendance: p.attendance }, false]));

  if (CHIP) {
    plan.push([db.doc(`users/${CHIP}/profile/card`), chipProfile, true]);
    chipRoles.forEach((r) => {
      const { id, ...rest } = r;
      plan.push([db.doc(`users/${CHIP}/roles/${id}`), rest, false]);
    });
  }

  if (DRY) {
    plan.forEach(([ref]) => console.log('would write', ref.path));
    console.log(`\n${plan.length} documents. Nothing written.`);
    return;
  }

  // Batches cap at 500 writes. This is well under, but chunk anyway.
  for (let i = 0; i < plan.length; i += 400) {
    const batch = db.batch();
    plan.slice(i, i + 400).forEach(([ref, data, merge]) => batch.set(ref, data, { merge: !!merge }));
    await batch.commit();
  }
  console.log(`Seeded ${plan.length} documents into orgs/${ORG}.`);
  const missing = EDITORS.filter((p) => !p.uid).map((p) => p.name);
  if (missing.length) console.log(`Still to seat: ${missing.join(', ')}. Have them sign in once, then add them from the member admin screen.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
