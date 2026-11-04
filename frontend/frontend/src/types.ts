// Shared types mirroring the backend API.

export type Role = "CITIZEN" | "ADMIN";

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse extends AuthUser {
  token: string;
}

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ComplaintStatus =
  | "SUBMITTED"
  | "AI_ANALYSIS"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export interface Category {
  value: string;
  label: string;
}

export interface AIAnalysis {
  detectedClass: string | null;
  confidence: number | null;
  severity: Severity | null;
  boundingBox: string | null;
  modelVersion: string | null;
}

/** Result of an on-demand AI detection preview (not persisted). */
export interface AiPreview {
  detected: boolean;
  category: string | null;
  categoryLabel: string | null;
  confidence: number | null;
  severity: Severity | null;
  priority: Priority | null;
  modelVersion: string | null;
  message: string | null;
}

export interface HistoryEntry {
  status: ComplaintStatus;
  updatedBy: string | null;
  remarks: string | null;
  timestamp: string;
}

export interface Complaint {
  id: number;
  referenceCode: string | null;
  reporterId: number;
  reporterName: string;
  category: string | null;
  categoryLabel: string | null;
  description: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAddress: string | null;
  severity: Severity | null;
  priority: Priority | null;
  status: ComplaintStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  aiAnalysis: AIAnalysis | null;
  history: HistoryEntry[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string | null;
  link: string | null;
  complaintId: number | null;
  read: boolean;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  complaintCount: number;
}

// ---------------------------------------------------------------------------
// Rewards / gamification
// ---------------------------------------------------------------------------

/** The civic actions that earn (or, in future, deduct) points. */
export type RewardActivityType =
  | "REPORT_SUBMITTED"
  | "REPORT_VERIFIED"
  | "REPORT_RESOLVED"
  | "FIRST_REPORT_BONUS"
  | "STREAK_BONUS"
  | "BADGE_BONUS"
  | "ADMIN_ADJUSTMENT";

/** A single line in the citizen's points ledger. */
export interface RewardHistoryEntry {
  id: number;
  type: RewardActivityType;
  description: string;
  points: number; // positive = earned
  date: string; // ISO timestamp
  complaintId?: number | null;
}

/** A tier on the level ladder, resolved for a given point total. */
export interface RewardLevel {
  level: number;
  name: string;
  minPoints: number;
  nextLevelPoints: number | null; // null = already at the top tier
}

/** An achievement — either earned or still locked (with progress). */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji glyph
  earned: boolean;
  earnedDate?: string | null;
  current: number; // progress toward the goal
  target: number; // goal needed to unlock
  progressPercent: number; // 0..100
}

/** Everything the Rewards UI needs — fully computed, backend-mirrorable. */
export interface RewardProfile {
  totalPoints: number;
  level: RewardLevel;
  pointsIntoLevel: number; // points earned since entering the current level
  pointsToNextLevel: number | null; // points still needed to level up (null at max)
  levelSpan: number | null; // size of the current level band
  progressPercent: number; // 0..100 within the current level
  stats: {
    reportsSubmitted: number;
    reportsResolved: number;
    currentStreakDays: number;
    badgesEarned: number;
  };
  badges: Badge[];
  history: RewardHistoryEntry[];
}

/** Result of awarding points for a freshly submitted report (success modal). */
export interface RewardGrant {
  totalAwarded: number;
  breakdown: { label: string; points: number }[];
}

// ---------------------------------------------------------------------------
// Admin rewards management
// ---------------------------------------------------------------------------

/** A citizen, identified for the admin rewards views. */
export interface RewardCitizenRef {
  userId: number;
  name: string;
  email: string;
}

/** One row in the admin rewards leaderboard. */
export interface RewardLeaderboardEntry {
  rank: number;
  user: RewardCitizenRef;
  totalPoints: number;
  level: RewardLevel;
  badgesEarned: number;
  reportsSubmitted: number;
  reportsResolved: number;
  currentStreakDays: number;
  /** Last points-earning activity, ISO — used to flag "active this week". */
  lastActivity: string | null;
}

/** A single citizen's full reward profile, as seen by an admin. */
export interface AdminCitizenReward {
  user: RewardCitizenRef;
  profile: RewardProfile;
}

/** Program-wide reward analytics for the admin dashboard. */
export interface RewardsAnalytics {
  totalCitizens: number;
  totalPointsIssued: number;
  totalBadgesAwarded: number;
  activeThisWeek: number;
  averageLevel: number;
  badgeDistribution: { id: string; name: string; icon: string; earnedCount: number }[];
  levelDistribution: { level: number; name: string; count: number }[];
}
