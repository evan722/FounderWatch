"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { AddFounderModal } from "./AddFounderModal";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useState } from "react";



export function DashboardTable() {
  const router = useRouter();
  const { user } = useAuth();
  
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
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];
      
      // Sort client-side to avoid needing a composite index immediately
      return data.sort((a, b) => {
        const timeA = a.created_at?.toMillis() || 0;
        const timeB = b.created_at?.toMillis() || 0;
        return timeB - timeA;
      });
    },
    enabled: !!user?.email
  });

  const filteredFounders = founders?.filter((f) => {
    const matchesPriority = priorityFilter === "all" || f.priority === priorityFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      f.name?.toLowerCase().includes(searchLower) || 
      f.url?.toLowerCase().includes(searchLower);
    
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track high-signal founders and recent updates.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search founders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 border-border/50 focus-visible:ring-primary"
            />
          </div>
          
          <select 
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
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

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[250px]">Founder</TableHead>
              <TableHead>Co-Investors</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-[300px]">Latest Signal</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading founders...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredFounders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No founders found. Try adjusting your filters or press N to add one!
                </TableCell>
              </TableRow>
            ) : filteredFounders?.map((founder) => (
              <TableRow 
                key={founder.id} 
                className="group hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/founders/${founder.id}`)}
              >
                <TableCell>
                  <div className="font-medium text-foreground">{founder.name}</div>
                  <div className="text-sm text-muted-foreground">{founder.url}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {founder.assigned_emails?.map((email: string) => (
                      <Badge key={email} variant="secondary" className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 truncate max-w-[120px]">
                        {email.split("@")[0]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">Added to watchlist</div>
                  <div className="text-xs text-muted-foreground">
                    {founder.created_at ? format(founder.created_at.toDate(), "MMM d, yyyy") : "Unknown date"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
