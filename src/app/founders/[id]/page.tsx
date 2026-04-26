"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Clock, MessageSquare, Globe } from "lucide-react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useState } from "react";
import { toast } from "sonner";

export default function FounderProfilePage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Fetch Founder
  const { data: founder, isLoading: isFounderLoading } = useQuery({
    queryKey: ["founder", params.id],
    queryFn: async () => {
      const docRef = doc(db, "founders", params.id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { id: snapshot.id, ...snapshot.data() } as any;
    },
    refetchInterval: 20000
  });

  // Fetch Signals
  const { data: signals = [], isLoading: isSignalsLoading } = useQuery({
    queryKey: ["founder_signals", params.id],
    queryFn: async () => {
      const q = query(collection(db, "founders", params.id, "signals"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    },
    refetchInterval: 20000
  });

  // Fetch Notes
  const { data: notes = [], isLoading: isNotesLoading } = useQuery({
    queryKey: ["founder_notes", params.id],
    queryFn: async () => {
      const q = query(collection(db, "founders", params.id, "notes"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    }
  });

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setIsSubmittingNote(true);
    try {
      await addDoc(collection(db, "founders", params.id, "notes"), {
        content: newNote,
        author_name: user.displayName || user.email?.split("@")[0] || "Unknown",
        author_uid: user.uid,
        created_at: serverTimestamp()
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

  if (isFounderLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 h-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!founder) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Link href="/" className={buttonVariants({ variant: "ghost", className: "-ml-4 mb-4 text-muted-foreground hover:text-foreground" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="text-center py-20 text-muted-foreground">Founder not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 h-full flex flex-col">
      <div>
        <Link href="/" className={buttonVariants({ variant: "ghost", className: "-ml-4 mb-4 text-muted-foreground hover:text-foreground" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Sidebar: Identity & Meta */}
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 rounded-xl border border-border/50 bg-card/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{founder.name}</h1>
                <p className="text-muted-foreground break-all text-sm mt-1">{founder.url}</p>
              </div>
              <Badge 
                variant="outline" 
                className={
                  founder.priority === "high" ? "border-destructive/50 text-destructive bg-destructive/10" :
                  founder.priority === "medium" ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10" :
                  "border-muted-foreground/50 text-muted-foreground"
                }
              >
                {(founder.priority || "low").toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex gap-2 mb-6">
              <a href={founder.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "icon", className: "h-8 w-8" })}>
                <Globe className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Co-Investors</span>
                <div className="flex flex-wrap gap-1">
                  {founder.assigned_emails?.map((email: string) => (
                    <Badge key={email} variant="secondary">{email.split("@")[0]}</Badge>
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
                  {founder.created_at ? format(founder.created_at.toDate(), "MMM d, yyyy") : "Unknown"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Signals & Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl border border-border/50 bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-primary" />
              Signal Timeline
            </h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {isSignalsLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Loading signals...</div>
              ) : signals.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm relative z-10 bg-card">No signals tracked yet.</div>
              ) : signals.map((signal) => (
                <div key={signal.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-primary z-10">
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border/50 bg-card/50 shadow-sm relative z-10">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold">{signal.type || "Update"}</div>
                      <time className="text-xs text-muted-foreground">
                        {signal.created_at ? format(signal.created_at.toDate(), "MMM d, yyyy h:mm a") : ""}
                      </time>
                    </div>
                    <div className="text-sm text-muted-foreground">{signal.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border/50 bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Notes
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {isNotesLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">No notes yet.</div>
              ) : notes.map((note) => (
                <div key={note.id} className="p-4 rounded bg-muted/20 border border-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-sm">{note.author_name}</div>
                    <time className="text-xs text-muted-foreground">
                      {note.created_at ? format(note.created_at.toDate(), "MMM d, yyyy h:mm a") : ""}
                    </time>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{note.content}</div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add a new note..."
              />
              <div className="flex justify-end mt-2">
                <Button onClick={handleAddNote} disabled={!newNote.trim() || isSubmittingNote}>
                  {isSubmittingNote ? "Saving..." : "Save Note"}
                </Button>
              </div>
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
