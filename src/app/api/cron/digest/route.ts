import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
// import { sendDigestEmail } from "@/lib/resend";
import { subDays } from "date-fns";

export async function POST(req: Request) {
  try {
    // Only allow authorized cron requests (e.g. from Vercel)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oneWeekAgo = subDays(new Date(), 7);

    // In a real scenario, you'd query across all founders or group by owner.
    // Assuming we do a collectionGroup query for signals
    const signalsSnapshot = await adminDb.collectionGroup("signals")
      .where("created_at", ">=", oneWeekAgo)
      .where("relevance_score", ">=", 4)
      .where("relevance_score", "<=", 6)
      .get();

    const signals = signalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Example logic: group signals by owner and send digest
    // This is MVP, so we will just print to console to simulate
    console.log(`[CRON DIGEST] Found ${signals.length} medium signals this week.`);

    // await sendDigestEmail(signals);

    return NextResponse.json({ success: true, count: signals.length });
  } catch (error) {
    console.error("Cron digest error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
