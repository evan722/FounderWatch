import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Clay integration has been removed",
      message: "Use /api/cron/monitor with Proxycurl instead.",
    },
    { status: 410 }
  );
}
