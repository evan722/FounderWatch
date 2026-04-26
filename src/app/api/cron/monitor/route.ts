export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { scoreSignal } from "@/lib/openai";
import { sendImmediateAlert } from "@/lib/resend";
import { fetchLinkedInSnapshot } from "@/lib/proxycurl";

function isLinkedInUrl(url: string) {
  return /linkedin\.com\/in\//i.test(url);
}

function normalizeValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const foundersSnapshot = await adminDb.collection("founders").get();

    const results = {
      scanned: 0,
      monitored: 0,
      updated: 0,
      signalsCreated: 0,
      errors: 0,
    };

    for (const founderDoc of foundersSnapshot.docs) {
      results.scanned += 1;

      const founder = founderDoc.data();
      const linkedinUrl = founder.linkedin_url || founder.url;

      if (!linkedinUrl || !isLinkedInUrl(linkedinUrl)) {
        continue;
      }

      results.monitored += 1;

      try {
        const snapshot = await fetchLinkedInSnapshot(linkedinUrl);

        const previousRole = founder.role || "";
        const previousCompany = founder.company || "";
        const nextRole = snapshot.role || previousRole;
        const nextCompany = snapshot.company || previousCompany;

        const roleChanged = normalizeValue(nextRole) !== normalizeValue(previousRole);
        const companyChanged = normalizeValue(nextCompany) !== normalizeValue(previousCompany);

        if (!roleChanged && !companyChanged) {
          continue;
        }

        const descriptionParts = [];
        if (roleChanged) {
          descriptionParts.push(`Role changed from "${previousRole || "Unknown"}" to "${nextRole || "Unknown"}"`);
        }
        if (companyChanged) {
          descriptionParts.push(`Company changed from "${previousCompany || "Unknown"}" to "${nextCompany || "Unknown"}"`);
        }

        const description = descriptionParts.join(". ");
        const score = await scoreSignal(description, "Proxycurl LinkedIn Monitor");

        await founderDoc.ref.collection("signals").add({
          founder_id: founderDoc.id,
          type: "linkedin_update",
          description,
          relevance_score: score,
          source: "Proxycurl",
          created_at: new Date(),
        });

        const updatedFounder = {
          role: nextRole,
          company: nextCompany,
          priority: score >= 7 ? "high" : score >= 4 ? "medium" : "low",
          updated_at: new Date(),
        };

        await founderDoc.ref.update(updatedFounder);

        if (score >= 7) {
          const recipients = Array.isArray(founder.assigned_emails)
            ? founder.assigned_emails.filter((email: unknown): email is string => typeof email === "string")
            : [];

          await sendImmediateAlert({
            founderId: founderDoc.id,
            founderName: founder.name || "Unknown",
            type: "LinkedIn Update",
            description,
            score,
            recipients,
          });
        }

        results.updated += 1;
        results.signalsCreated += 1;
      } catch (error) {
        results.errors += 1;
        console.error(`[MONITOR] Failed for founder ${founderDoc.id}`, error);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Cron monitor error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
