"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  linkedin_url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (val: string) => /linkedin\.com\/in\//i.test(val),
      "Must be a LinkedIn profile URL (e.g. linkedin.com/in/janedoe)"
    ),
  url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  why: z.string().min(5, "Please provide more context"),
  assigned_emails: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
});

type FormValues = z.infer<typeof formSchema>;

export function AddFounderModal() {
  const [open, setOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      linkedin_url: "",
      url: "",
      why: "",
      assigned_emails: "",
      priority: "medium",
    },
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Keyboard shortcut: press N to open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast.error("You must be logged in to add a founder");
      return;
    }

    try {
      // Parse co-investor emails, always include the creator
      const emailsList = values.assigned_emails
        ? values.assigned_emails
            .split(",")
            .map((e: string) => e.trim())
            .filter((e: string) => e)
        : [];
      if (user.email && !emailsList.includes(user.email)) {
        emailsList.push(user.email);
      }

      // Save founder to Firestore
      const docRef = await addDoc(collection(db, "founders"), {
        name: values.name,
        linkedin_url: values.linkedin_url,
        url: values.url || null,
        why: values.why,
        priority: values.priority,
        assigned_emails: emailsList,
        owner_uid: user.uid,
        owner_name: user.displayName || user.email || "Unknown",
        status: "active",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        // Enrichment fields — will be populated by /api/founders/enrich
        role: null,
        company: null,
        headline: null,
        linkedin_photo_url: null,
        last_enriched_at: null,
      });

      // Dismiss modal and show success immediately
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["founders"] });
      toast.success("Founder added!");

      // Trigger LinkedIn enrichment in the background
      setIsEnriching(true);
      const enrichToastId = toast.loading("Fetching LinkedIn data...");

      try {
        const res = await fetch("/api/founders/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ founderId: docRef.id }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.dismiss(enrichToastId);
          const roleLabel = data.role && data.company
            ? `${data.role} at ${data.company}`
            : data.role || data.company || "profile loaded";
          toast.success(`LinkedIn enriched — ${roleLabel}`);
          // Refresh so the dashboard shows the new role/company
          queryClient.invalidateQueries({ queryKey: ["founders"] });
        } else {
          const err = await res.json().catch(() => ({}));
          toast.dismiss(enrichToastId);
          toast.warning(
            `Founder saved, but LinkedIn enrichment failed: ${err.error || "unknown error"}`
          );
        }
      } catch (enrichErr) {
        toast.dismiss(enrichToastId);
        toast.warning("Founder saved. LinkedIn enrichment will run on the next daily sync.");
        console.warn("Enrichment request failed:", enrichErr);
      } finally {
        setIsEnriching(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add founder");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={isEnriching}>
        {isEnriching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enriching…
          </>
        ) : (
          "Add Founder (N)"
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Add Founder</DialogTitle>
            <DialogDescription>
              Paste their LinkedIn URL — we&apos;ll automatically track profile changes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                className="bg-background/50"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>

            {/* LinkedIn URL — primary tracked field */}
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL *</Label>
              <Input
                id="linkedin_url"
                placeholder="https://linkedin.com/in/janedoe"
                className="bg-background/50"
                {...form.register("linkedin_url")}
              />
              <p className="text-xs text-muted-foreground">
                Used to detect profile changes and send alerts.
              </p>
              {form.formState.errors.linkedin_url && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.linkedin_url.message}
                </span>
              )}
            </div>

            {/* Why we care */}
            <div className="space-y-2">
              <Label htmlFor="why">Why we care *</Label>
              <Input
                id="why"
                placeholder="Ex-Stripe engineering lead, building in fintech"
                className="bg-background/50"
                {...form.register("why")}
              />
              {form.formState.errors.why && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.why.message}
                </span>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                {...form.register("priority")}
                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Co-investors */}
            <div className="space-y-2">
              <Label htmlFor="assigned_emails">Co-Investors (emails)</Label>
              <Input
                id="assigned_emails"
                placeholder="jane@vc.com, bob@vc.com"
                className="bg-background/50"
                {...form.register("assigned_emails")}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. You are automatically included. All added emails receive alerts.
              </p>
            </div>

            {/* Optional website/twitter */}
            <div className="space-y-2">
              <Label htmlFor="url">Website / Twitter (optional)</Label>
              <Input
                id="url"
                placeholder="https://twitter.com/janedoe"
                className="bg-background/50"
                {...form.register("url")}
              />
              {form.formState.errors.url && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.url.message}
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Founder"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
