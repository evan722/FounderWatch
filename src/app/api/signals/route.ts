import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { scoreSignal } from "@/lib/openai";
import { sendImmediateAlert } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Validate the incoming Clay webhook payload
    const { founderId, type, description, source } = payload;
    
    if (!founderId || !type || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. AI Scoring
    const score = await scoreSignal(description, source || "Clay Enrichment");

    // 2. Save Signal to Firestore
    const signalData = {
      founder_id: founderId,
      type,
      description,
      relevance_score: score,
      source: source || "Clay",
      created_at: new Date(),
    };

    const docRef = await adminDb.collection(`founders/${founderId}/signals`).add(signalData);

    // 3. Rules:
    // Score >= 7 -> immediate email
    // Score 4-6 -> weekly digest
    // Score <= 3 -> stored only
    
    if (score >= 7) {
      // Get founder info for the email
      const founderDoc = await adminDb.collection("founders").doc(founderId).get();
      if (founderDoc.exists) {
        const founderName = founderDoc.data()?.name || "Unknown";
        
        // Update the founder's status
        await adminDb.collection("founders").doc(founderId).update({
          status: "active",
          priority: "high",
          updated_at: new Date()
        });

        await sendImmediateAlert({ founderName, type, description, score });
        console.log(`[ALERT] Triggering immediate email for ${founderName} (Score: ${score})`);
      }
    }

    return NextResponse.json({ success: true, id: docRef.id, score });
  } catch (error) {
    console.error("Signal ingestion error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
