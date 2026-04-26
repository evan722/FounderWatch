import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Check if the webhook URL is configured
    const webhookUrl = process.env.CLAY_WEBHOOK_URL;
    if (!webhookUrl) {
      // If it's not configured, we just return a 200 so it doesn't break the frontend,
      // but we log a warning.
      console.warn("CLAY_WEBHOOK_URL is not set. Skipping Clay sync.");
      return NextResponse.json({ success: true, skipped: true });
    }

    // Forward the payload to Clay
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Clay webhook failed:", await response.text());
      return NextResponse.json({ error: "Failed to push to Clay" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in Clay outbound webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
