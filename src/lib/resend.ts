import { Resend } from "resend";
import { ImmediateAlertTemplate } from "./email/ImmediateAlertTemplate";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

interface AlertParams {
  founderId?: string;
  founderName: string;
  type: string;
  description: string;
  score: number;
  recipients?: string[];
}

export async function sendImmediateAlert(params: AlertParams) {
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
    console.error("Failed to send email:", error);
    throw error;
  }
}
