import { Resend } from "resend";
import { ImmediateAlertTemplate } from "./email/ImmediateAlertTemplate";
import { LinkedInChangeTemplate } from "./email/LinkedInChangeTemplate";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

// ─── Immediate Alert (high-score Clay signals) ────────────────────────────────

export interface ImmediateAlertParams {
  founderId?: string;
  founderName: string;
  type: string;
  description: string;
  score: number;
  recipients?: string[];
}

export async function sendImmediateAlert(params: ImmediateAlertParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[MOCK EMAIL] Sending immediate alert:", params);
    return;
  }

  const to = params.recipients?.length ? params.recipients : ["investor@example.com"];

  try {
    const data = await resend.emails.send({
      from: "FounderWatch <alerts@founderwatch.app>",
      to,
      subject: `🔥 High Signal: ${params.founderName}`,
      react: ImmediateAlertTemplate(params),
    });
    return data;
  } catch (error) {
    console.error("Failed to send immediate alert:", error);
    throw error;
  }
}

// ─── LinkedIn Change Alert (monitor cron) ─────────────────────────────────────

export interface LinkedInChangeParams {
  founderId: string;
  founderName: string;
  /** Human-readable bullets describing each field that changed */
  changes: string[];
  /** Full combined description string (used for email body + AI scoring) */
  description: string;
  score: number;
  recipients: string[];
  source?: string;
}

export async function sendChangeAlert(params: LinkedInChangeParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[MOCK EMAIL] LinkedIn change alert:", params);
    return;
  }

  const to = params.recipients.length ? params.recipients : ["investor@example.com"];

  const scoreEmoji = params.score >= 7 ? "🔥" : params.score >= 4 ? "📊" : "📌";
  const subject = `${scoreEmoji} ${params.founderName} updated their LinkedIn`;

  try {
    const data = await resend.emails.send({
      from: "FounderWatch <alerts@founderwatch.app>",
      to,
      subject,
      react: LinkedInChangeTemplate(params),
    });
    return data;
  } catch (error) {
    console.error("Failed to send LinkedIn change alert:", error);
    throw error;
  }
}
