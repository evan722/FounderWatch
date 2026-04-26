"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MoreHorizontal, Trash2, Linkedin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { AddFounderModal } from "./AddFounderModal";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import React, { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

export function DashboardTable() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: founders, isLoading } = useQuery({
    queryKey: ["founders", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];

      const q = query(
        collection(db, "founders"),
        where("assigned_emails", "array-contains", user.email)
      );

      const snapshot = await getDocs(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      // Sort by most recently updated/created
      return data.sort((a, b) => {
        const timeA = (a.updated_at ?? a.created_at)?.toMillis() || 0;
        const timeB = (b.updated_at ?? b.created_at)?.toMillis() || 0;
        return timeB - timeA;
      });
    },
    enabled: !!user?.email,
    refetchInterval: 20000,
  });

  const handleDeleteFounder = async (founderId: string) => {
    try {
      const response = await fetch(`/api/founders/${founderId}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete founder");
      }

      toast.success("Founder deleted");
      queryClient.invalidateQueries({ queryKey: ["founders"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete founder";
      toast.error(message);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredFounders = founders?.filter((f: any) => {
    const matchesPriority = priorityFilter === "all" || f.priority === priorityFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      f.name?.toLowerCase().includes(searchLower) ||
      f.linkedin_url?.toLowerCase().includes(searchLower) ||
      f.url?.toLowerCase().includes(searchLower) ||
      f.company?.toLowerCase().includes(searchLower) ||
      f.role?.toLowerCase().includes(searchLower) ||
      f.why?.toLowerCase().includes(searchLower);

    return matchesPriority && matchesSearch;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track high-signal founders and LinkedIn changes.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search founders, roles, companies…"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 border-border/50 focus-visible:ring-primary"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-md border border-border/50 bg-card/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <AddFounderModal />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Founder</TableHead>
              <TableHead>Co-Investors</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-[280px]">Current Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-muted-foreground">Loading founders...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredFounders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No founders found. Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">N</kbd> to add one!
                </TableCell>
              </TableRow>
            ) : (
              filteredFounders?.map((founder: any) => (
                <TableRow
                  key={founder.id}
                  className="group hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/founders/${founder.id}`)}
                >
                  {/* Founder identity */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {founder.linkedin_photo_url ? (
                        <Image
                          src={founder.linkedin_photo_url}
                          alt={founder.name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover border border-border/50 flex-shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-xs">
                            {founder.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{founder.name}</div>
                        {(founder.linkedin_url || founder.url) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Linkedin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {(founder.linkedin_url || founder.url)
                                ?.replace("https://www.linkedin.com/in/", "")
                                ?.replace("https://linkedin.com/in/", "")
                                ?.replace(/\/$/, "")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Co-investors */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {founder.assigned_emails?.map((email: string) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 truncate max-w-[100px]"
                        >
                          {email.split("@")[0]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        founder.priority === "high"
                          ? "border-destructive/50 text-destructive bg-destructive/10"
                          : founder.priority === "medium"
                          ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                          : "border-muted-foreground/50 text-muted-foreground"
                      }
                    >
                      {(founder.priority || "low").toUpperCase()}
                    </Badge>
                  </TableCell>

                  {/* Current role (replaces hardcoded "Added to watchlist") */}
                  <TableCell>
                    {founder.role || founder.company ? (
                      <div>
                        {founder.role && (
                          <div className="text-sm text-foreground">{founder.role}</div>
                        )}
                        {founder.company && (
                          <div className="text-xs text-muted-foreground">{founder.company}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-muted-foreground/70 italic">
                          {founder.last_enriched_at ? "No role detected" : "Pending enrichment…"}
                        </div>
                        <div className="text-xs text-muted-foreground/50">
                          {founder.created_at
                            ? `Added ${format(founder.created_at.toDate(), "MMM d, yyyy")}`
                            : ""}
                        </div>
                      </div>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          router.push(`/founders/${founder.id}`);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          handleDeleteFounder(founder.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
