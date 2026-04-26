"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Clock, MessageSquare, Globe, Twitter, Linkedin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import React, { useState } from "react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSignalType(type: string): string {
  const map: Record<string, string> = {
    linkedin_update: "LinkedIn Update",
    job_change: "Job Change",
    new_company: "New Company",
    product_launch: "Product Launch",
    fundraising: "Fundraising",
    hiring: "Hiring",
    social_traction: "Social Traction",
    other: "Update",
  };
  return map[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreBadge({ score }: { score: number }) {
  const className =
    score >= 7
      ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
      : score >= 4
      ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
      : "border-muted-foreground/30 text-muted-foreground";

  return (
    <Badge variant="outline" className={className}>
      {score}/10
    </Badge>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  return (
    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
      {source}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderProfilePage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // ── Fetch founder ────────────────────────────────────────────────────────────
  const { data: founder, isLoading: isFounderLoading } = useQuery({
    queryKey: ["founder", params.id],
    queryFn: async () => {
      const docRef = doc(db, "founders", params.id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { id: snapshot.id, ...snapshot.data() } as any;
    },
    refetchInterval: 20000,
  });

  // ── Fetch signals ────────────────────────────────────────────────────────────
  const { data: signals = [], isLoading: isSignalsLoading } = useQuery({
    queryKey: ["founder_signals", params.id],
    queryFn: async () => {
      const q = query(
        collection(db, "founders", params.id, "signals"),
        orderBy("created_at", "desc")
      );
      const snapshot = await getDocs(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
    },
    refetchInterval: 20000,
  });

  // ── Fetch notes ──────────────────────────────────────────────────────────────
  const { data: notes = [], isLoading: isNotesLoading } = useQuery({
    queryKey: ["founder_notes", params.id],
    queryFn: async () => {
      const q = query(
        collection(db, "founders", params.id, "notes"),
        orderBy("created_at", "desc")
      );
      const snapshot = await getDocs(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  // ── Add note ─────────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setIsSubmittingNote(true);
    try {
      await addDoc(collection(db, "founders", params.id, "notes"), {
        content: newNote,
        author_name: user.displayName || user.email?.split("@")[0] || "Unknown",
        author_uid: user.uid,
        created_at: serverTimestamp(),
      });
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["founder_notes", params.id] });
      toast.success("Note added!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (isFounderLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!founder) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            className: "-ml-4 mb-4 text-muted-foreground hover:text-foreground",
          })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="text-center py-20 text-muted-foreground">Founder not found</div>
      </div>
    );
  }

  const linkedinUrl = founder.linkedin_url || founder.url;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 h-full flex flex-col">
      <div>
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            className: "-ml-4 mb-4 text-muted-foreground hover:text-foreground",
          })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* ── Left sidebar: Identity & Meta ─────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 rounded-xl border border-border/50 bg-card/50">
            {/* Avatar + name + priority */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {founder.linkedin_photo_url ? (
                  <Image
                    src={founder.linkedin_photo_url}
                    alt={founder.name}
                    width={48}
                    height={48}
                    className="rounded-full border border-border/50 object-cover flex-shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-lg">
                      {founder.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold leading-tight">{founder.name}</h1>
                  {founder.role && founder.company && (
                    <p className="text-sm text-muted-foreground">
                      {founder.role} at {founder.company}
                    </p>
                  )}
                  {founder.role && !founder.company && (
                    <p className="text-sm text-muted-foreground">{founder.role}</p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  founder.priority === "high"
                    ? "border-destructive/50 text-destructive bg-destructive/10 shrink-0"
                    : founder.priority === "medium"
                    ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10 shrink-0"
                    : "border-muted-foreground/50 text-muted-foreground shrink-0"
                }
              >
                {(founder.priority || "low").toUpperCase()}
              </Badge>
            </div>

            {/* Headline */}
            {founder.headline && (
              <p className="text-sm text-muted-foreground italic mb-4 leading-relaxed border-l-2 border-primary/30 pl-3">
                "{founder.headline}"
              </p>
            )}

            {/* Links */}
            <div className="flex gap-2 mb-5">
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon",
                    className: "h-8 w-8",
                  })}
                  title="LinkedIn Profile"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                </a>
              )}
              {founder.url && founder.linkedin_url && (
                <a
                  href={founder.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon",
                    className: "h-8 w-8",
                  })}
                  title="Website / Twitter"
                >
                  {/twitter\.com|x\.com/i.test(founder.url) ? (
                    <Twitter className="h-3.5 w-3.5" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                </a>
              )}
            </div>

            {/* Meta fields */}
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Co-Investors</span>
                <div className="flex flex-wrap gap-1">
                  {founder.assigned_emails?.map((email: string) => (
                    <Badge key={email} variant="secondary">
                      {email.split("@")[0]}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Why we care</span>
                <div className="font-medium text-sm leading-relaxed">{founder.why}</div>
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Added</span>
                <div className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {founder.created_at
                    ? format(founder.created_at.toDate(), "MMM d, yyyy")
                    : "Unknown"}
                </div>
              </div>

              {founder.last_enriched_at && (
                <div>
                  <span className="text-muted-foreground block mb-1">Last LinkedIn check</span>
                  <div className="text-xs text-muted-foreground/70">
                    {format(founder.last_enriched_at.toDate(), "MMM d, yyyy h:mm a")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main content: Signals & Notes ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Signal Timeline */}
          <div className="p-6 rounded-xl border border-border/50 bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-primary" />
              Signal Timeline
              {signals.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {signals.length}
                </Badge>
              )}
            </h2>

            {isSignalsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              </div>
            ) : signals.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm space-y-1">
                <p>No signals yet.</p>
                <p className="text-xs text-muted-foreground/60">
                  LinkedIn changes will appear here automatically once detected.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {signals.map((signal: any) => (
                  <div
                    key={signal.id}
                    className="flex gap-4 p-4 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    {/* Icon dot */}
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <ActivityIcon className="w-3.5 h-3.5 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {formatSignalType(signal.type)}
                        </span>
                        {signal.relevance_score != null && (
                          <ScoreBadge score={signal.relevance_score} />
                        )}
                        <SourceBadge source={signal.source} />
                        <time className="text-xs text-muted-foreground ml-auto">
                          {signal.created_at
                            ? format(signal.created_at.toDate(), "MMM d, yyyy h:mm a")
                            : ""}
                        </time>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="p-6 rounded-xl border border-border/50 bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Notes
            </h2>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 mb-5">
              {isNotesLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading notes...
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No notes yet. Add context about this founder below.
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-sm">{note.author_name}</div>
                        <time className="text-xs text-muted-foreground">
                          {note.created_at
                            ? format(note.created_at.toDate(), "MMM d, yyyy h:mm a")
                            : ""}
                        </time>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-foreground/80">
                        {note.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={newNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
              className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Add a note..."
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isSubmittingNote}
              >
                {isSubmittingNote ? "Saving…" : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
