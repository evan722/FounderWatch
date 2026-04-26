import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { fetchLinkedInSnapshot } from "@/lib/proxycurl";

/**
 * POST /api/founders/enrich
 *
 * Fetches the current LinkedIn snapshot via Proxycurl and stores it on the
 * founder document as the baseline for future change detection.
 *
 * Body: { founderId: string }
 *
 * Stored fields:
 *   role              — current job title
 *   company           — current company
 *   headline          — LinkedIn headline
 *   linkedin_photo_url — profile picture URL
 *   last_enriched_at  — timestamp of this fetch (used by monitor cron to detect first-time vs. diff)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { founderId } = body as { founderId?: string };

    if (!founderId) {
      return NextResponse.json({ error: "founderId is required" }, { status: 400 });
    }

    const founderRef = adminDb.collection("founders").doc(founderId);
    const founderDoc = await founderRef.get();

    if (!founderDoc.exists) {
      return NextResponse.json({ error: "Founder not found" }, { status: 404 });
    }

    const founderData = founderDoc.data()!;
    const linkedinUrl = founderData.linkedin_url as string | undefined;

    if (!linkedinUrl) {
      return NextResponse.json(
        { error: "Founder has no linkedin_url stored" },
        { status: 400 }
      );
    }

    const snapshot = await fetchLinkedInSnapshot(linkedinUrl);

    const updateData = {
      role: snapshot.role ?? null,
      company: snapshot.company ?? null,
      headline: snapshot.headline ?? null,
      linkedin_photo_url: snapshot.photo_url ?? null,
      last_enriched_at: new Date(),
    };

    await founderRef.update(updateData);

    console.log(`[ENRICH] Baseline stored for founder ${founderId}:`, updateData);

    return NextResponse.json({ success: true, founderId, ...updateData });
  } catch (error) {
    console.error("Enrich founder error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
