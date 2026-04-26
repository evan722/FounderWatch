export interface Founder {
  id: string; // Document ID
  name: string;
  linkedin_url?: string;
  twitter_url?: string;
  company?: string;
  role?: string;
  tags: string[];
  priority: "high" | "medium" | "low";
  owner_uid: string;
  next_follow_up?: Date;
  status: "active" | "stale" | "invested" | "passed";
  created_at: Date;
  updated_at: Date;
}

export interface Signal {
  id: string; // Document ID
  founder_id: string;
  type: "job_change" | "new_company" | "product_launch" | "fundraising" | "hiring" | "social_traction" | "other";
  description: string;
  relevance_score: number; // 1-10
  source?: string;
  created_at: Date;
}

export interface Note {
  id: string; // Document ID
  founder_id: string;
  author_uid: string;
  content: string;
  created_at: Date;
}

export interface User {
  id: string; // UID
  name: string;
  email: string;
  role: "admin" | "member";
  timezone?: string;
}
