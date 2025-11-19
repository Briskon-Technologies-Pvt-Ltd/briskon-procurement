import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { conversation_id } = body as { conversation_id?: string };

    if (!conversation_id) {
      return NextResponse.json(
        { success: false, error: "conversation_id required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("conversations")
      .update({ unread_admin: 0 })
      .eq("id", conversation_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/messaging/markReadAdmin error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
