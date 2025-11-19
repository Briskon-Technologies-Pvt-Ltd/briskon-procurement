// app/api/rfqs/[id]/convert/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rfqs/:id/convert
// Accepts FormData: auction_start_at, auction_end_at, visibility_mode, created_by
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const formData = await req.formData();
    const auction_start_at = (formData.get("auction_start_at") as string) || null;
    const auction_end_at = (formData.get("auction_end_at") as string) || null;
    const visibility_mode = (formData.get("visibility_mode") as string) || "rank_only";
    const created_by = (formData.get("created_by") as string) || null;

    // fetch rfq (must be published to convert)
    const { data: rfq, error: rfqErr } = await supabase.from("rfqs").select("*").eq("id", id).single();
    if (rfqErr) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (rfq.status !== "published")
      return NextResponse.json({ error: "Only published RFQs can be converted to auction" }, { status: 400 });

    // create auction
    const auctionId = uuidv4();
    const auctionPayload: any = {
      id: auctionId,
      rfq_id: id,
      organization_id: rfq.organization_id,
      auction_type: "reverse",
      start_at: auction_start_at,
      end_at: auction_end_at,
      currency: rfq.currency,
      language: rfq.language || "en",
      visibility_mode,
      config: JSON.stringify({}), // placeholder for config json
      status: "draft",
      created_by,
      created_at: new Date().toISOString(),
    };
    const { error: auctionErr } = await supabase.from("auctions").insert([auctionPayload]);
    if (auctionErr) throw auctionErr;

    // copy rfq_items -> auction_items
    const { data: rfqItems, error: itemsErr } = await supabase.from("rfq_items").select("*").eq("rfq_id", id);
    if (itemsErr) console.warn("Failed to fetch rfq_items for convert:", itemsErr);

    if (rfqItems && rfqItems.length) {
      const toInsert = rfqItems.map((it: any) => ({
        id: uuidv4(),
        auction_id: auctionId,
        rfq_item_id: it.id,
        description: it.description || null,
        qty: it.qty ?? null,
        uom: it.uom || null,
        created_at: new Date().toISOString(),
      }));
      const { error: aiErr } = await supabase.from("auction_items").insert(toInsert);
      if (aiErr) console.warn("Failed to insert auction_items:", aiErr);
    }

    // update rfq status to converted_to_auction
    const { error: updErr } = await supabase.from("rfqs").update({ status: "converted_to_auction", updated_at: new Date().toISOString() }).eq("id", id);
    if (updErr) console.warn("Failed to update rfq status after convert:", updErr);

    return NextResponse.json({ success: true, message: "RFQ converted to auction", auctionId }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/rfqs/:id/convert error:", err);
    return NextResponse.json({ error: err.message || "Failed to convert RFQ" }, { status: 500 });
  }
}
