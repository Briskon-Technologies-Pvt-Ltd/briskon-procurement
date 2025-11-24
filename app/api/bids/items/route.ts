import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auctionId = url.searchParams.get("auction_id");
    const supplierId = url.searchParams.get("supplier_id");

    if (!auctionId || !supplierId) {
      return NextResponse.json({ success: false, error: "auction_id & supplier_id required" });
    }

    // Load items for the auction
    const { data: items, error: itemsErr } = await supabase
      .from("auction_items")
      .select("id, description, qty")
      .eq("auction_id", auctionId);

    if (itemsErr) throw itemsErr;

    // Load latest bids per item for this supplier
    const { data: bids, error: bidsErr } = await supabase
      .from("bids")
      .select("auction_item_id, amount, created_at")
      .eq("auction_id", auctionId)
      .eq("supplier_id", supplierId);

    if (bidsErr) throw bidsErr;

    const latest: Record<string, { amount: number; created: number }> = {};

    for (const b of bids || []) {
      const key = b.auction_item_id;
      const created = new Date(b.created_at).getTime();

      if (!latest[key] || created > latest[key].created) {
        latest[key] = { amount: Number(b.amount), created };
      }
    }

    const rows = (items || []).map((item: any) => {
      const entry = latest[item.id];
      const qty = Number(item.qty || 1);
      return {
        item_name: item.description,
        qty,
        unit_price: entry?.amount ?? null,
        total: entry ? entry.amount * qty : null,
      };
    });

    return NextResponse.json({
      success: true,
      items: rows.filter((r) => r.unit_price !== null),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
