"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Must be a valid URL"),
  why: z.string().min(5, "Please provide more context"),
  assigned_emails: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddFounderModal() {
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      url: "",
      why: "",
      assigned_emails: "",
      priority: "medium",
    },
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
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
      // Parse assigned emails
      const emailsList = values.assigned_emails 
        ? values.assigned_emails.split(",").map(e => e.trim()).filter(e => e)
        : [];
      
      // Ensure the creator is always in the assigned list
      if (user.email && !emailsList.includes(user.email)) {
        emailsList.push(user.email);
      }

      const docRef = await addDoc(collection(db, "founders"), {
        ...values,
        assigned_emails: emailsList,
        owner_uid: user.uid,
        owner_name: user.displayName || user.email || "Unknown",
        status: "active",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      
      // Ping Clay Webhook in the background
      fetch("/api/clay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founderId: docRef.id,
          name: values.name,
          url: values.url,
        }),
      }).catch(err => console.error("Failed to push to Clay:", err));
      
      queryClient.invalidateQueries({ queryKey: ["founders"] });
      toast.success("Founder added successfully");
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add founder");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Founder (N)</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Add Founder</DialogTitle>
          <DialogDescription>
            Quickly add a new founder to your watchlist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Jane Doe" className="bg-background/50" {...form.register("name")} />
            {form.formState.errors.name && <span className="text-sm text-destructive">{form.formState.errors.name.message}</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">LinkedIn or Twitter URL *</Label>
            <Input id="url" placeholder="https://linkedin.com/in/..." className="bg-background/50" {...form.register("url")} />
            {form.formState.errors.url && <span className="text-sm text-destructive">{form.formState.errors.url.message}</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="why">Why we care *</Label>
            <Input id="why" placeholder="Ex-Stripe engineering lead..." className="bg-background/50" {...form.register("why")} />
            {form.formState.errors.why && <span className="text-sm text-destructive">{form.formState.errors.why.message}</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_emails">Co-Investors (Emails)</Label>
            <Input id="assigned_emails" placeholder="jane@vc.com, bob@vc.com" className="bg-background/50" {...form.register("assigned_emails")} />
            <p className="text-xs text-muted-foreground">Comma-separated emails. You are automatically added.</p>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit">Save Founder</Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
