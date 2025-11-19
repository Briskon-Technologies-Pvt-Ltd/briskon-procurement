// /app/api/messaging/messages/route.ts
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

    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_supplier_id, sender_buyer_id, body, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    return NextResponse.json({
      success: true,
      messages: msgs ?? [],
    });
  } catch (err: any) {
    console.error("GET /api/messaging/messages error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      conversation_id,
      supplier_id,
      context_type,
      context_id,
      message,
    }: {
      conversation_id?: string;
      supplier_id?: string;
      context_type?: "rfq" | "auction";
      context_id?: string;
      message?: string;
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "message required" },
        { status: 400 }
      );
    }

    let convId = conversation_id ?? null;

    // Case 1: existing conversation
    if (!convId) {
      if (!supplier_id || !context_type || !context_id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "supplier_id, context_type and context_id required to create conversation",
          },
          { status: 400 }
        );
      }

      // Try to find existing conversation for same supplier + context
      let match: Record<string, any> = { supplier_id };
      if (context_type === "rfq") {
        match.rfq_id = context_id;
      } else if (context_type === "auction") {
        match.auction_id = context_id;
      }

      const { data: existing, error: existingErr } = await supabase
        .from("conversations")
        .select("id")
        .match(match)
        .maybeSingle();

      if (existingErr) throw existingErr;

      if (existing?.id) {
        convId = existing.id as string;
      } else {
        // Create new conversation
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert({
            supplier_id,
            rfq_id: context_type === "rfq" ? context_id : null,
            auction_id: context_type === "auction" ? context_id : null,
            last_message: message,
          })
          .select("id")
          .single();

        if (createErr) throw createErr;
        convId = created.id as string;
      }
    }

    // Insert message
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: convId,
      sender_supplier_id: supplier_id ?? null, // for now we assume supplier side
      sender_buyer_id: null, // buyer UI will set this when we build it
      body: message,
    });

    if (msgErr) throw msgErr;

    // Update conversation last_message
    const { error: updErr } = await supabase
      .from("conversations")
      .update({
        last_message: message,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", convId);

    if (updErr) throw updErr;

    return NextResponse.json({
      success: true,
      conversation_id: convId,
    });
  } catch (err: any) {
    console.error("POST /api/messaging/messages error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
