import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const webhookUrl = process.env.CLAY_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("CLAY_WEBHOOK_URL is not set. Skipping Clay sync.");
      return NextResponse.json({ success: true, skipped: true });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error("Clay webhook failed", {
        status: response.status,
        body: responseBody,
      });
      return NextResponse.json(
        {
          error: "Failed to push to Clay",
          status: response.status,
          body: responseBody,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in Clay outbound webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
