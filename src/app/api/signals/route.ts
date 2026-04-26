import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { scoreSignal } from "@/lib/openai";
import { sendImmediateAlert } from "@/lib/resend";

type IncomingSignalPayload = {
  founderId?: string;
  founder_id?: string;
  firestoreId?: string;
  type?: string;
  signalType?: string;
  eventType?: string;
  description?: string;
  summary?: string;
  message?: string;
  source?: string;
};

function normalizePayload(payload: IncomingSignalPayload) {
  const founderId = payload.founderId || payload.founder_id || payload.firestoreId;
  const type = payload.type || payload.signalType || payload.eventType || "Update";
  const description = payload.description || payload.summary || payload.message;

  return {
    founderId,
    type,
    description,
    source: payload.source || "Clay",
  };
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as IncomingSignalPayload;
    const normalized = normalizePayload(payload);

    if (!normalized.founderId || !normalized.description) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details:
            "Expected founderId (or founder_id/firestoreId) and description (or summary/message).",
        },
        { status: 400 }
      );
    }

    // 1) AI scoring
    const score = await scoreSignal(normalized.description, normalized.source);

    // 2) Save signal
    const signalData = {
      founder_id: normalized.founderId,
      type: normalized.type,
      description: normalized.description,
      relevance_score: score,
      source: normalized.source,
      created_at: new Date(),
    };

    const founderRef = adminDb.collection("founders").doc(normalized.founderId);
    const founderDoc = await founderRef.get();

    if (!founderDoc.exists) {
      return NextResponse.json(
        { error: `Founder not found for founderId=${normalized.founderId}` },
        { status: 404 }
      );
    }

    const docRef = await founderRef.collection("signals").add(signalData);

    // 3) Update founder summary status based on signal score
    const priority = score >= 7 ? "high" : score >= 4 ? "medium" : "low";
    await founderRef.update({
      priority,
      updated_at: new Date(),
    });

    // 4) Immediate alert for high score signals
    if (score >= 7) {
      const founderData = founderDoc.data() || {};
      const founderName = founderData.name || "Unknown";
      const recipients = Array.isArray(founderData.assigned_emails)
        ? founderData.assigned_emails.filter((email: unknown): email is string => typeof email === "string")
        : [];

      await sendImmediateAlert({
        founderId: normalized.founderId,
        founderName,
        type: normalized.type,
        description: normalized.description,
        score,
        recipients,
      });
      console.log(`[ALERT] Immediate email for ${founderName} (score=${score})`);
    }

    return NextResponse.json({ success: true, id: docRef.id, score });
  } catch (error) {
    console.error("Signal ingestion error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
