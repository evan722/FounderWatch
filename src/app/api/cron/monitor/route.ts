export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { scoreSignal } from "@/lib/openai";
import { sendChangeAlert } from "@/lib/resend";
import { fetchLinkedInSnapshot } from "@/lib/proxycurl";

function isLinkedInUrl(url: string): boolean {
  return /linkedin\.com\/in\//i.test(url);
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * GET /api/cron/monitor
 *
 * Scheduled daily at 00:00 UTC via vercel.json.
 *
 * For every founder with a linkedin_url:
 *   1. If never enriched (no last_enriched_at) → store baseline, no signal.
 *   2. If baseline exists → fetch current snapshot, diff role/company/headline.
 *      • Any change → score with GPT-4o → save signal → email all assigned_emails
 *        (regardless of score, since the monitor is the core value-add).
 *      • Update stored values and last_enriched_at either way.
 */
export async function GET(req: Request) {
  try {
    // Auth guard for production
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const foundersSnapshot = await adminDb.collection("founders").get();

    const results = {
      scanned: 0,
      skipped: 0,      // No LinkedIn URL
      baselined: 0,    // First run — stored baseline, no signal
      unchanged: 0,    // Had baseline, nothing changed
      signalsCreated: 0,
      emailsSent: 0,
      errors: 0,
    };

    for (const founderDoc of foundersSnapshot.docs) {
      results.scanned += 1;
      const founder = founderDoc.data();

      // Only process LinkedIn URLs
      const linkedinUrl = (founder.linkedin_url || founder.url) as string | undefined;
      if (!linkedinUrl || !isLinkedInUrl(linkedinUrl)) {
        results.skipped += 1;
        continue;
      }

      try {
        const snapshot = await fetchLinkedInSnapshot(linkedinUrl);
        const hasBaseline = !!founder.last_enriched_at;

        if (!hasBaseline) {
          // ── First time ───────────────────────────────────────────────────────
          // Just store the initial state as the baseline. No signal, no email.
          // The next cron run will diff against this.
          await founderDoc.ref.update({
            role: snapshot.role ?? null,
            company: snapshot.company ?? null,
            headline: snapshot.headline ?? null,
            linkedin_photo_url: snapshot.photo_url ?? null,
            last_enriched_at: new Date(),
          });
          results.baselined += 1;
          console.log(`[MONITOR] Baseline stored for ${founderDoc.id} (${founder.name})`);
          continue;
        }

        // ── Diff against stored baseline ──────────────────────────────────────
        const prevRole = (founder.role as string) || "";
        const prevCompany = (founder.company as string) || "";
        const prevHeadline = (founder.headline as string) || "";

        const nextRole = snapshot.role || "";
        const nextCompany = snapshot.company || "";
        const nextHeadline = snapshot.headline || "";

        const roleChanged = normalize(nextRole) !== normalize(prevRole) && !!nextRole;
        const companyChanged = normalize(nextCompany) !== normalize(prevCompany) && !!nextCompany;
        const headlineChanged = normalize(nextHeadline) !== normalize(prevHeadline) && !!nextHeadline;

        // Always refresh the stored values and timestamp
        await founderDoc.ref.update({
          role: snapshot.role ?? founder.role ?? null,
          company: snapshot.company ?? founder.company ?? null,
          headline: snapshot.headline ?? founder.headline ?? null,
          linkedin_photo_url: snapshot.photo_url ?? founder.linkedin_photo_url ?? null,
          last_enriched_at: new Date(),
        });

        if (!roleChanged && !companyChanged && !headlineChanged) {
          results.unchanged += 1;
          continue;
        }

        // ── Build change description ──────────────────────────────────────────
        const changes: string[] = [];
        if (roleChanged) {
          changes.push(`Role: "${prevRole || "Unknown"}" → "${nextRole}"`);
        }
        if (companyChanged) {
          changes.push(`Company: "${prevCompany || "Unknown"}" → "${nextCompany}"`);
        }
        if (headlineChanged) {
          changes.push(`Headline: "${prevHeadline || "Unknown"}" → "${nextHeadline}"`);
        }

        const description = changes.join(". ");

        // ── Score with GPT-4o ────────────────────────────────────────────────
        const score = await scoreSignal(description, "Proxycurl LinkedIn Monitor");

        // ── Save signal to Firestore ─────────────────────────────────────────
        await founderDoc.ref.collection("signals").add({
          founder_id: founderDoc.id,
          type: "linkedin_update",
          description,
          relevance_score: score,
          source: "Proxycurl",
          created_at: new Date(),
        });

        // Update founder priority based on signal score
        const priority = score >= 7 ? "high" : score >= 4 ? "medium" : "low";
        await founderDoc.ref.update({
          priority,
          updated_at: new Date(),
        });

        results.signalsCreated += 1;
        console.log(
          `[MONITOR] Signal created for ${founder.name} (score=${score}): ${description}`
        );

        // ── Send email to ALL assigned owners (every change, not just high score) ──
        const recipients = (
          Array.isArray(founder.assigned_emails) ? founder.assigned_emails : []
        ).filter((e: unknown): e is string => typeof e === "string");

        if (recipients.length > 0) {
          try {
            await sendChangeAlert({
              founderId: founderDoc.id,
              founderName: founder.name || "Unknown",
              changes,
              description,
              score,
              recipients,
              source: "Proxycurl LinkedIn Monitor",
            });
            results.emailsSent += 1;
            console.log(
              `[MONITOR] Email sent for ${founder.name} to: ${recipients.join(", ")}`
            );
          } catch (emailErr) {
            console.error(`[MONITOR] Email failed for ${founderDoc.id}:`, emailErr);
            // Don't count as an error — signal is already saved
          }
        } else {
          console.warn(
            `[MONITOR] No recipients for founder ${founderDoc.id} — signal saved but no email sent`
          );
        }


      } catch (err) {
        results.errors += 1;
        console.error(`[MONITOR] Failed for founder ${founderDoc.id}:`, err);
      }
    }

    console.log("[MONITOR] Run complete:", results);
    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Cron monitor error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
