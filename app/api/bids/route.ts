// /app/api/bids/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function nowISO() {
  return new Date().toISOString();
}

function ensureUUID(val: any): string | null {
  if (!val || typeof val !== "string") return null;
  const v = val.trim();
  const r = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return r.test(v) ? v : null;
}

/* ============================================================
   GET — Ranking + current bids + visibility behavior
============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auctionId = ensureUUID(url.searchParams.get("auction_id"));
    const supplierId = ensureUUID(url.searchParams.get("supplier_id"));

    if (!auctionId || !supplierId) {
      return NextResponse.json(
        { success: false, error: "auction_id and supplier_id required" },
        { status: 400 }
      );
    }

    // Load auction
    const { data: auction, error: aErr } = await supabase
      .from("auctions")
      .select("id, visibility_mode, currency, auction_type")
      .eq("id", auctionId)
      .maybeSingle();

    if (aErr) throw aErr;
    if (!auction)
      return NextResponse.json(
        { success: false, error: "Auction not found" },
        { status: 404 }
      );

    // Load items + qty
    const { data: items } = await supabase
      .from("auction_items")
      .select("id, qty")
      .eq("auction_id", auctionId);

    const qtyByItem: Record<string, number> = {};
    for (const it of items || []) {
      qtyByItem[it.id] = Number(it.qty || 1);
    }

    // Load bids
    const { data: bids, error: bidsErr } = await supabase
      .from("bids")
      .select("id, auction_item_id, supplier_id, amount, created_at")
      .eq("auction_id", auctionId);

    if (bidsErr) throw bidsErr;

    const latestBids: Record<string, Record<string, { amount: number; created_at: string }>> = {};

    for (const b of bids || []) {
      const s = b.supplier_id;
      const i = b.auction_item_id;

      latestBids[s] = latestBids[s] || {};
      const existing = latestBids[s][i];

      if (!existing || new Date(b.created_at).getTime() > new Date(existing.created_at).getTime()) {
        latestBids[s][i] = { amount: Number(b.amount), created_at: b.created_at };
      }
    }

    // compute totals
    const totals = Object.entries(latestBids).map(([supplier_id, itemMap]) => {
      let sum = 0;
      for (const [itemId, { amount }] of Object.entries(itemMap)) {
        const qty = qtyByItem[itemId] ?? 1;
        sum += amount * qty;
      }
      return { supplier_id, total: sum };
    });

    totals.sort((a, b) => a.total - b.total);

    const rankMap: Record<string, number> = {};
    totals.forEach((t, idx) => {
      rankMap[t.supplier_id] = idx + 1;
    });

    const myEntry = totals.find((t) => t.supplier_id === supplierId) || null;
    const myTotal = myEntry?.total ?? null;
    const myRank = myEntry ? rankMap[supplierId] : null;

    // Build leaderboard per visibility mode
    let leaderboard: any[] = [];

    if (auction.visibility_mode === "open_lowest") {
      const ids = totals.map((t) => t.supplier_id);
      const { data: supData } = await supabase
        .from("suppliers")
        .select("id, company_name")
        .in("id", ids);

      const nameMap: Record<string, string> = {};
      for (const s of supData || []) nameMap[s.id] = s.company_name;

      leaderboard = totals.map((t, idx) => ({
        supplier_id: t.supplier_id,
        supplier_name: nameMap[t.supplier_id] || "Supplier",
        total: t.total,
        rank: idx + 1,
      }));
    }

    return NextResponse.json({
      success: true,
      auction_type: auction.auction_type,
      visibility_mode: auction.visibility_mode,
      myTotal,
      myRank,
      leaderboard,
      myLines: latestBids[supplierId] || {},
    });
  } catch (err: any) {
    console.error("GET bids error", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ============================================================
   POST — Submit Multiple Bids
============================================================ */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const auctionId = ensureUUID(body.auction_id);
    const supplierId = ensureUUID(body.supplier_id);
    const placedBy = ensureUUID(body.placed_by_profile_id);
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!auctionId || !supplierId || !placedBy || !lines.length) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    // Load auction meta
    const { data: auction } = await supabase
      .from("auctions")
      .select("id, status, start_at, end_at, visibility_mode, auction_type, currency")
      .eq("id", auctionId)
      .maybeSingle();

    const now = Date.now();
    const start = new Date(auction.start_at).getTime();
    const end = new Date(auction.end_at).getTime();

    if (auction.status !== "published" || now < start || now > end) {
      return NextResponse.json({ success: false, error: "Auction is not live" }, { status: 400 });
    }

    // Sealed bid rule
    if (auction.auction_type === "sealed_reverse") {
      const { count } = await supabase
        .from("bids")
        .select("id", { count: "exact", head: true })
        .eq("auction_id", auctionId)
        .eq("supplier_id", supplierId);

      if (count && count > 0) {
        return NextResponse.json(
          { success: false, error: "Sealed bid already submitted" },
          { status: 400 }
        );
      }
    }

    const currency = body.currency || auction.currency;

    const rows = lines.map((l: any) => ({
      id: uuidv4(),
      auction_id: auctionId,
      auction_item_id: ensureUUID(l.auction_item_id),
      supplier_id: supplierId,
      placed_by_profile_id: placedBy,
      amount: Number(l.amount),
      currency,
      created_at: nowISO(),
    }));

    await supabase.from("bids").insert(rows);

    // history
    const hist = rows.map((r) => ({
      id: uuidv4(),
      bid_id: r.id,
      action: "placed",
      actor_profile_id: placedBy,
      amount: r.amount,
      currency: r.currency,
      metadata: {},
      created_at: nowISO(),
    }));

    await supabase.from("bid_history").insert(hist);

    return NextResponse.json({ success: true, message: "Bids submitted" });
  } catch (err: any) {
    console.error("POST bids error", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
