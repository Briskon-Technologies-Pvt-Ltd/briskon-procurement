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

    // 1) Load all published auctions
    const { data: auctions, error: auctionsErr } = await supabase
      .from("auctions")
      .select(`
        id,
        auction_type,
        visibility_mode,
        status,
        start_at,
        end_at,
        currency,
        config
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (auctionsErr) throw auctionsErr;
    if (!auctions?.length)
      return NextResponse.json({ success: true, auctions: [] });

    const auctionIds = auctions.map((a) => a.id);

    // 2) Visibility rules
    const { data: visibilityRows, error: visErr } = await supabase
      .from("auction_visibility")
      .select("auction_id, supplier_id")
      .in("auction_id", auctionIds);

    if (visErr) throw visErr;

    const auctionsHavingVisibilityRows = new Set(
      (visibilityRows || []).map((v) => v.auction_id as string)
    );

    const invitedIds = new Set(
      (visibilityRows || [])
        .filter((v) => v.supplier_id === supplierId)
        .map((v) => v.auction_id as string)
    );

    const openIds = new Set(
      auctionIds.filter((id) => !auctionsHavingVisibilityRows.has(id))
    );

    const visible = auctions.filter(
      (a) => openIds.has(a.id) || invitedIds.has(a.id)
    );

    if (!visible.length)
      return NextResponse.json({ success: true, auctions: [] });

    const visibleIds = visible.map((a) => a.id);

    // 3) Load all bids for rank & best bid calculation
    const { data: bids, error: bidsErr } = await supabase
      .from("bids")
      .select("auction_id, supplier_id, amount, created_at")
      .in("auction_id", visibleIds)
      .order("amount", { ascending: true });

    if (bidsErr) throw bidsErr;

    // Group bids per auction
    const grouped: Record<
      string,
      {
        attempts: number;
        suppliers: Set<string>;
        lastBid: string | null;
        bestBid: number | null;
        rank_position: number | null;
        rank_total: number;
      }
    > = {};

    for (const a of visible) {
      grouped[a.id] = {
        attempts: 0,
        suppliers: new Set(),
        lastBid: null,
        bestBid: null,
        rank_position: null,
        rank_total: 0,
      };
    }

    // Build aggregates
    for (const b of bids || []) {
      const id = b.auction_id as string;
      const group = grouped[id];
      if (!group) continue;

      group.attempts++;
      if (b.supplier_id) group.suppliers.add(b.supplier_id);

      const amt = Number(b.amount);
      if (!Number.isNaN(amt)) {
        if (group.bestBid === null || amt < group.bestBid) group.bestBid = amt;
      }

      if (
        !group.lastBid ||
        new Date(b.created_at!).getTime() > new Date(group.lastBid).getTime()
      ) {
        group.lastBid = b.created_at!;
      }
    }

    // Compute ranking
    for (const id of visibleIds) {
      const supplierBids = (bids || []).filter((x) => x.auction_id === id);
      const uniqueSuppliers = [
        ...new Set(supplierBids.map((x) => x.supplier_id)),
      ].filter(Boolean);

      grouped[id].rank_total = uniqueSuppliers.length;

      const sorted = supplierBids.sort((a, b) => Number(a.amount) - Number(b.amount));
      const rankIndex = sorted.findIndex((b) => b.supplier_id === supplierId);

      grouped[id].rank_position = rankIndex >= 0 ? rankIndex + 1 : null;
    }

    // 4) Final return payload
    const response = visible.map((a) => {
      const g = grouped[a.id];
      const access_type = openIds.has(a.id) ? "open" : "invited";

      return {
        id: a.id,
        title: a.config?.title || "Untitled Auction",
        auction_type: a.auction_type,
        visibility_mode: a.visibility_mode,
        access_type,
        start_at: a.start_at,
        end_at: a.end_at,
        currency: a.currency,
        bid_attempts: g.attempts,
        supplier_count: g.suppliers.size,
        last_bid_time: g.lastBid,
        best_bid:
          a.auction_type === "standard_reverse" ? g.bestBid ?? null : null,
        rank_position: g.rank_position,
        rank_total: g.rank_total,
      };
    });

    return NextResponse.json({ success: true, auctions: response });
  } catch (err: any) {
    console.error("GET /api/supplier/auctions error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
