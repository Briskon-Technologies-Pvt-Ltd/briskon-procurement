// /app/api/messaging/inbox/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const supplierId = url.searchParams.get("supplier_id");

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplier_id required" },
        { status: 400 }
      );
    }

    // 1) Load conversations for this supplier
    const { data: convs, error: convErr } = await supabase
      .from("conversations")
      .select("id, rfq_id, auction_id, contract_id, last_message, last_message_at")
      .eq("supplier_id", supplierId)
      .order("last_message_at", { ascending: false });

    if (convErr) throw convErr;
    if (!convs?.length) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const rfqIds = Array.from(
      new Set(convs.map((c) => c.rfq_id).filter(Boolean) as string[])
    );
    const auctionIds = Array.from(
      new Set(convs.map((c) => c.auction_id).filter(Boolean) as string[])
    );

    // 2) Load RFQ titles
    const rfqTitles: Record<string, string> = {};
    if (rfqIds.length) {
      const { data: rfqs, error: rfqErr } = await supabase
        .from("rfqs")
        .select("id, title")
        .in("id", rfqIds);
      if (rfqErr) throw rfqErr;
      for (const r of rfqs || []) {
        rfqTitles[r.id as string] = r.title as string;
      }
    }

    // 3) Load Auction titles (config.title)
    const auctionTitles: Record<string, string> = {};
    if (auctionIds.length) {
      const { data: auctions, error: aucErr } = await supabase
        .from("auctions")
        .select("id, config")
        .in("id", auctionIds);
      if (aucErr) throw aucErr;
      for (const a of auctions || []) {
        const cfg = a.config as any;
        auctionTitles[a.id as string] = cfg?.title || "Untitled auction";
      }
    }

    // 4) Build result list
    const result = convs.map((c) => {
      let title = "Conversation";
      let context_type: "rfq" | "auction" | "contract" | "unknown" = "unknown";

      if (c.rfq_id && rfqTitles[c.rfq_id]) {
        title = `RFQ: ${rfqTitles[c.rfq_id]}`;
        context_type = "rfq";
      } else if (c.auction_id && auctionTitles[c.auction_id]) {
        title = `Auction: ${auctionTitles[c.auction_id]}`;
        context_type = "auction";
      } else if (c.contract_id) {
        title = "Contract conversation";
        context_type = "contract";
      }

      return {
        id: c.id as string,
        title,
        last_message: (c.last_message as string) ?? "",
        last_message_at: c.last_message_at as string | null,
        context_type,
      };
    });

    return NextResponse.json({ success: true, conversations: result });
  } catch (err: any) {
    console.error("GET /api/messaging/inbox error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
