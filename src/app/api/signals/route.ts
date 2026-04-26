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

/**
 * POST /api/signals
 *
 * Ingests a signal from Clay (or any external source).
 * 1. Normalises the flexible payload format
 * 2. Scores the signal with GPT-4o
 * 3. Saves the signal to the founder's signals subcollection
 * 4. Updates the founder's priority
 * 5. Sends an immediate email alert to all assigned_emails for score >= 7
 */
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

    // 1) Score with AI
    const score = await scoreSignal(normalized.description, normalized.source || "Clay");

    // 2) Fetch founder to get name and assigned_emails
    const founderRef = adminDb.collection("founders").doc(normalized.founderId);
    const founderDoc = await founderRef.get();

    if (!founderDoc.exists) {
      return NextResponse.json(
        { error: `Founder not found for founderId=${normalized.founderId}` },
        { status: 404 }
      );
    }

    const founderData = founderDoc.data()!;

    // 3) Save signal
    const signalData = {
      founder_id: normalized.founderId,
      type: normalized.type,
      description: normalized.description,
      relevance_score: score,
      source: normalized.source,
      created_at: new Date(),
    };

    const docRef = await founderRef.collection("signals").add(signalData);

    // 4) Update founder priority based on signal score
    const priority = score >= 7 ? "high" : score >= 4 ? "medium" : "low";
    await founderRef.update({
      priority,
      updated_at: new Date(),
    });

    // 5) Immediate email for high-score signals — send to all assigned owners
    if (score >= 7) {
      const recipients = (
        Array.isArray(founderData.assigned_emails) ? founderData.assigned_emails : []
      ).filter((e: unknown): e is string => typeof e === "string");

      const founderName = (founderData.name as string) || "Unknown";

      await sendImmediateAlert({
        founderId: founderDoc.id,
        founderName,
        type: normalized.type,
        description: normalized.description,
        score,
        recipients,
      });

      console.log(
        `[SIGNALS] Immediate alert sent for ${founderName} (score=${score}) to: ${recipients.join(", ")}`
      );
    }

    return NextResponse.json({ success: true, id: docRef.id, score });
  } catch (error) {
    console.error("Signal ingestion error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
