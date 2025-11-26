import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Create Supabase admin client
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

/* =============================================================
   GET — Ranking + last bids + leaderboard + myLines
============================================================= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const auctionId = searchParams.get("auction_id");
  const supplierId = searchParams.get("supplier_id");

  if (!auctionId) {
    return NextResponse.json(
      { success: false, error: "auction_id is required" },
      { status: 400 }
    );
  }

  try {
    // ---------- Load all bids for this auction ----------
    const { data: bids, error: bidsError } = await supabase
      .from("bids")
      .select("supplier_id, auction_item_id, amount, created_at")
      .eq("auction_id", auctionId);

    if (bidsError) {
      console.error("bidsError", bidsError);
      return NextResponse.json({ success: false, error: bidsError.message });
    }

    if (!bids || bids.length === 0) {
      return NextResponse.json({
        success: true,
        totals: [],
        count: 0,
        leaderboard: [],
        myRank: null,
        myTotal: null,
        myLines: {},
      });
    }

    // ---------- Load auction items for qty ----------
    const { data: items, error: itemsError } = await supabase
      .from("auction_items")
      .select("id, qty")
      .eq("auction_id", auctionId);

    if (itemsError) {
      console.error("itemsError", itemsError);
      return NextResponse.json({ success: false, error: itemsError.message });
    }

    const qtyMap = new Map<string, number>();
    (items || []).forEach((it: any) => {
      qtyMap.set(it.id, Number(it.qty ?? 1));
    });

    // ---------- Load supplier names ----------
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, company_name");

    if (suppliersError) {
      console.error("suppliersError", suppliersError);
      return NextResponse.json({
        success: false,
        error: suppliersError.message,
      });
    }

    const supplierNameMap = new Map<string, string>();
    (suppliers || []).forEach((s: any) => {
      supplierNameMap.set(s.id, s.company_name);
    });

    // ---------- Build latest bid per supplier + item ----------
    const latestMap = new Map<
      string,
      { supplier_id: string; auction_item_id: string; amount: number; created_at: string }
    >();

    for (const b of bids as any[]) {
      if (!b.auction_item_id) continue;
      const key = `${b.supplier_id}_${b.auction_item_id}`;
      const existing = latestMap.get(key);

      if (
        !existing ||
        new Date(b.created_at).getTime() > new Date(existing.created_at).getTime()
      ) {
        latestMap.set(key, {
          supplier_id: b.supplier_id,
          auction_item_id: b.auction_item_id,
          amount: Number(b.amount),
          created_at: b.created_at,
        });
      }
    }

    // ---------- Calculate totals per supplier: SUM(amount * qty) ----------
    const totalsMap = new Map<string, number>();

    for (const [, row] of latestMap.entries()) {
      const qty = qtyMap.get(row.auction_item_id) ?? 1;
      const lineTotal = row.amount * qty;
      totalsMap.set(
        row.supplier_id,
        (totalsMap.get(row.supplier_id) ?? 0) + lineTotal
      );
    }

    const totalsArray = Array.from(totalsMap.entries()).map(
      ([supplier_id, total]) => ({ supplier_id, total })
    );

    // ---------- Build leaderboard ----------
    const leaderboard = totalsArray
      .slice()
      .sort((a, b) => a.total - b.total)
      .map((entry, idx) => ({
        supplier_id: entry.supplier_id,
        supplier_name: supplierNameMap.get(entry.supplier_id) ?? "",
        total: entry.total,
        rank: idx + 1,
      }));

    // ---------- compute myRank + myTotal ----------
    let myRank: number | null = null;
    let myTotal: number | null = null;

    if (supplierId) {
      const me = leaderboard.find((row) => row.supplier_id === supplierId);
      if (me) {
        myRank = me.rank;
        myTotal = me.total;
      }
    }

    // ---------- Build latest per-item lines for this supplier ----------
    const myLines: Record<string, { amount: number }> = {};

    if (supplierId) {
      const myBids = bids.filter((b: any) => b.supplier_id === supplierId);
      const latestPerItem = new Map<string, { amount: number; created_at: string }>();

      for (const b of myBids) {
        if (!b.auction_item_id) continue;
        const ex = latestPerItem.get(b.auction_item_id);
        if (!ex || new Date(b.created_at).getTime() > new Date(ex.created_at).getTime()) {
          latestPerItem.set(b.auction_item_id, {
            amount: Number(b.amount),
            created_at: b.created_at,
          });
        }
      }

      latestPerItem.forEach((val, itemId) => {
        myLines[itemId] = { amount: val.amount };
      });
    }

    return NextResponse.json({
      success: true,
      totals: totalsArray,
      count: totalsArray.length,
      leaderboard,
      myRank,
      myTotal,
      myLines,
    });
  } catch (err: any) {
    console.error("GET /api/bids error", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

/* =============================================================
   POST — Submit Multiple Bids
============================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auctionId = ensureUUID(body.auction_id);
    const supplierId = ensureUUID(body.supplier_id);
    const placedBy = ensureUUID(body.placed_by_profile_id);
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!auctionId || !supplierId || !placedBy || !lines.length) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const { data: auction }: any = await supabase
      .from("auctions")
      .select("id, status, start_at, end_at, visibility_mode, auction_type, currency")
      .eq("id", auctionId)
      .maybeSingle();

    const now = Date.now();
    const start = new Date(auction.start_at).getTime();
    const end = new Date(auction.end_at).getTime();

    if (auction.status !== "published" || now < start || now > end) {
      return NextResponse.json(
        { success: false, error: "Auction is not live" },
        { status: 400 }
      );
    }

    // sealed rule
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

    const rows = lines.map((l: any) => ({
      id: uuidv4(),
      auction_id: auctionId,
      auction_item_id: ensureUUID(l.auction_item_id),
      supplier_id: supplierId,
      placed_by_profile_id: placedBy,
      amount: Number(l.amount),
      currency: auction.currency,
      created_at: nowISO(),
    }));

    await supabase.from("bids").insert(rows);

    return NextResponse.json({ success: true, message: "Bids submitted" });
  } catch (err: any) {
    console.error("POST bids error", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
