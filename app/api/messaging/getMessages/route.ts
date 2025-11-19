import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "conversation_id required" },
        { status: 400 }
      );
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        conversation_id,
        sender_supplier_id,
        sender_buyer_id,
        message_text:body,
        created_at
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error("GET /api/messaging/getMessages error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
