import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      conversation_id,
      sender_buyer_id,
      message_text,
    }: {
      conversation_id?: string;
      sender_buyer_id?: string;
      message_text?: string;
    } = body;

    if (!conversation_id || !sender_buyer_id || !message_text?.trim()) {
      return NextResponse.json(
        { success: false, error: "conversation_id, sender_buyer_id and message_text are required" },
        { status: 400 }
      );
    }

    // Insert message (admin side) – store text in `body` column
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id,
      sender_supplier_id: null,
      sender_buyer_id,
      body: message_text.trim(),
    });

    if (msgErr) throw msgErr;

    // Update conversation last_message
    const { error: convErr } = await supabase
      .from("conversations")
      .update({
        last_message: message_text.trim(),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    if (convErr) throw convErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/messaging/sendMessage error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
