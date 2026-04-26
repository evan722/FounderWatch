import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: "Founder ID is required" }, { status: 400 });
    }

    const founderRef = adminDb.collection("founders").doc(params.id);
    const founderSnapshot = await founderRef.get();

    if (!founderSnapshot.exists) {
      return NextResponse.json({ error: "Founder not found" }, { status: 404 });
    }

    await adminDb.recursiveDelete(founderRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete founder error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
