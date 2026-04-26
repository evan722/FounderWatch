Product Requirements Document — v1.0
Product Name: FounderWatch
 Platform: Vercel / Next.js
 Database: Firebase Firestore
 Alerts: Email only (Resend)
 Status: Draft — MVP
 Build Estimate: 4 weeks
 Date: April 2026

Contents
Objective and problem statement
Users and design principles
MVP feature set
Tech stack
UX flows
Data model (Firebase)
System architecture
Success metrics
Risks and mitigations
Roadmap and open questions
Non-functional requirements
Access control model
API contracts
Email specification
Edge cases
Logging and monitoring
Testing strategy
Launch plan
Future evolution
Final summary

01. Objective and Problem Statement
Investors regularly encounter promising founders who are not yet ready for investment. These individuals exist in a fragmented system of personal notes, Slack messages, memory, and occasional spreadsheets. There is no shared infrastructure to track them.
As a result:
High-signal moments (job changes, launches) are missed
Investors duplicate outreach
Institutional knowledge is lost
Founder relationships decay over time
FounderWatch is a shared system to track these “pre-pipeline” founders. Investors add individuals quickly, the system monitors public signals, and meaningful updates trigger timely notifications.
FounderWatch is not a CRM. It operates before pipeline entry. Once a founder becomes active, they move into existing tools such as Affinity or Attio.

02. Users and Design Principles
Primary Users
Investors (partners and associates)
Non-technical
Time-constrained
Require minimal friction
Secondary Users
Platform and ops teams
Maintain system quality
Manage enrichment
Design Principles
Speed over completeness
 The add flow must take under 30 seconds.
Signal over noise
 Only meaningful alerts are surfaced.
Shared awareness
 Ownership and context must be visible to all.
Passive value
 The system should generate value without active use.

03. MVP Feature Set
F-01 Add Founder
Minimal form with required fields:
Name
LinkedIn or Twitter URL
“Why we care” note
Owner
Optional:
Tags
Priority
Follow-up date
Features:
Duplicate detection (URL + fuzzy match)
Keyboard shortcut (N)
Confirmation toast
Background enrichment trigger

F-02 Founder Profile Page
Central record containing:
Identity
Name, role, company, links
Tags, priority, status
Owner and watchers
Signal timeline
Chronological list of events
Notes
Plain text, timestamped
Next action
Follow-up field + date
Actions:
Edit profile
Add note
Change owner/status
Add signal

F-03 Dashboard and Filtering
Table view of founders.
Default sort:
Most recent activity
Filters:
Owner
Priority
Tags
Signal type
Follow-up date
Saved views:
My watchlist
High priority
Follow up soon
Hot this week
No owner
Search:
Name, company, tags, notes

F-04 Team Coordination
One owner per founder
Optional watchers
Activity log (immutable)
Ownership transfer logging
Prevents duplicate outreach and maintains shared context.

F-05 Signal Detection and Alerts
Signals:
Job changes
New company
Product launch
Fundraising
Hiring
Social traction
Pipeline:
Clay enrichment
API ingestion
GPT scoring (1–10)
Rules:
Score ≥7 → immediate email
Score 4–6 → weekly digest
Score ≤3 → stored only
Limits:
Max 5 alerts/day per user

F-06 Weekly Digest
Sent Monday at 8:00 AM.
Sections:
Hot signals
Follow-ups
Stale founders
New additions
Medium signals
Delivered via Resend.

04. Tech Stack
Frontend
Next.js 14 (App Router)
Tailwind CSS
shadcn/ui
React Query + Zustand
React Hook Form + Zod
Backend
Next.js API routes (Vercel serverless)
Database
Firebase Firestore
Auth
Firebase Auth
Email
Resend + React Email
AI
OpenAI GPT-4o
Enrichment
Clay
Google Alerts fallback
Hosting
Vercel
Monitoring
Sentry

05. UX Flows
Add Founder
Open modal
Paste link
Add note
Assign owner
Save
Daily Usage
Open dashboard
Filter
View profile
Take action
Signal Alert
Signal detected
AI scored
Email sent
Investor acts

06. Data Model (Firebase)
founders/{id}
name
linkedin_url
tags
priority
owner_uid
next_follow_up
created_at
signals/{id}
type
description
relevance_score
created_at
notes/{id}
author_uid
content
created_at
users/{id}
name
email
role
timezone

07. System Architecture
Flow:
Investor → Next.js app → API routes → Firestore
Signals:
Clay webhook → API → Firestore → GPT scoring → Resend
Cron jobs:
Daily enrichment
Weekly digest
All infrastructure is serverless.

08. Success Metrics
Activation
≥80% users add ≥3 founders
Engagement
≥60% weekly usage
Alert quality
≥50% email open → profile click
Collaboration
≥30% founders have multiple contributors
Outcome
% of pipeline founders previously tracked

09. Risks and Mitigations
Low adoption
 → Minimize friction
Alert fatigue
 → High threshold + batching
Data staleness
 → Daily enrichment + timestamps
Duplicates
 → URL + fuzzy matching
Firestore limits
 → Predefined indexes
Privacy concerns
 → Public data only

10. Roadmap
Week 1
Auth + DB + add flow
Week 2
Dashboard + profiles
Week 3
Signals + alerts
Week 4
Digest + polish

11. Non-Functional Requirements
Performance
<2s dashboard load
Scalability
Up to 1000 founders
Reliability
Idempotent cron jobs
Security
Auth required everywhere

12. Access Control
Roles:
Admin
Member
Members:
Add + edit owned founders
Admins:
Full control

13. API Contracts
POST /api/founders
Creates founder
GET /api/founders
Returns filtered list
POST /api/signals
Ingests signals
POST /api/cron/digest
Runs weekly digest

14. Email Specification
Immediate alert:
Founder + signal + summary
Weekly digest:
Structured summary
Plain-text + HTML hybrid.

15. Edge Cases
Duplicate founders
Missing enrichment
Email failures
Cron retries

16. Logging and Monitoring
API logs
Email logs
Error tracking via Sentry

17. Testing Strategy
Unit tests (API)
Integration tests (flows)
Manual QA (UX + email)

18. Launch Plan
Alpha (Week 2)
Core features
Beta (Week 4)
Signals + email
Success = adoption + usage

19. Future Evolution
Chrome extension
CRM sync
Founder scoring
Search engine
Mobile app

20. Final Summary
FounderWatch is a lightweight system that captures and tracks early founder relationships before they become investment opportunities.
It focuses on:
Fast capture
High-signal alerts
Shared context
Passive value
The MVP deliberately avoids complexity and prioritizes usability, ensuring that investors actually adopt and rely on the system.


