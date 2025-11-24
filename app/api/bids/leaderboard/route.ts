import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get auction title from config JSON
function getAuctionTitleFromConfig(config: any): string {
  if (!config) return "Untitled auction";
  if (typeof config.title === "string" && config.title.trim()) return config.title.trim();
  if (typeof config.name === "string" && config.name.trim()) return config.name.trim();
  return "Untitled auction";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auctionId = url.searchParams.get("auction_id") || null;

    // =========================================================
    // 1. Load bids (optionally filtered by auction)
    // =========================================================
    let bidsQuery = supabase
      .from("bids")
      .select("auction_id, supplier_id, auction_item_id, amount, created_at");

    if (auctionId) {
      bidsQuery = bidsQuery.eq("auction_id", auctionId);
    }

    const { data: bids, error: bidsErr } = await bidsQuery;
    if (bidsErr) throw bidsErr;

    if (!bids || bids.length === 0) {
      // No bids at all in this scope
      if (auctionId) {
        // auction scope
        return NextResponse.json({
          success: true,
          scope: "auction",
          auction_id: auctionId,
          auction_title: null,
          total_suppliers: 0,
          leaderboard: [],
        });
      } else {
        // global scope
        return NextResponse.json({
          success: true,
          scope: "global",
          total_suppliers: 0,
          summary: [],
          auctions: [],
        });
      }
    }

    // =========================================================
    // 2. Load items with qty (for value computation)
    // =========================================================
    let itemsQuery = supabase
      .from("auction_items")
      .select("id, qty, auction_id");

    if (auctionId) {
      itemsQuery = itemsQuery.eq("auction_id", auctionId);
    }

    const { data: items, error: itemsErr } = await itemsQuery;
    if (itemsErr) throw itemsErr;

    const qtyByItem: Record<string, number> = {};
    (items || []).forEach((i: any) => {
      qtyByItem[i.id] = Number(i.qty || 1);
    });

    // =========================================================
    // 3. Compute LATEST bid per supplier+item
    //    latestBidMap: key = supplier_id|auction_item_id
    // =========================================================
    type LatestEntry = {
      supplier_id: string;
      auction_id: string;
      auction_item_id: string;
      amount: number;
      created: number;
    };

    const latestBidMap: Record<string, LatestEntry> = {};

    for (const b of bids) {
      const key = `${b.supplier_id}|${b.auction_item_id}`;
      const created = new Date(b.created_at).getTime();

      const existing = latestBidMap[key];
      if (!existing || created > existing.created) {
        latestBidMap[key] = {
          supplier_id: b.supplier_id,
          auction_id: b.auction_id,
          auction_item_id: b.auction_item_id,
          amount: Number(b.amount),
          created,
        };
      }
    }

    // =========================================================
    // 4. Aggregate by supplier AND auction
    //    bySupplierAuction[supplier_id][auction_id] = { total, bid_count }
    // =========================================================
    const bySupplierAuction: Record<
      string,
      Record<string, { total: number; bid_count: number }>
    > = {};

    Object.values(latestBidMap).forEach((entry) => {
      const qty = qtyByItem[entry.auction_item_id] ?? 1;
      const lineTotal = entry.amount * qty;

      if (!bySupplierAuction[entry.supplier_id]) {
        bySupplierAuction[entry.supplier_id] = {};
      }
      if (!bySupplierAuction[entry.supplier_id][entry.auction_id]) {
        bySupplierAuction[entry.supplier_id][entry.auction_id] = {
          total: 0,
          bid_count: 0,
        };
      }

      bySupplierAuction[entry.supplier_id][entry.auction_id].total += lineTotal;
      bySupplierAuction[entry.supplier_id][entry.auction_id].bid_count += 1;
    });

    // =========================================================
    // 5. Build per-auction structure from bySupplierAuction
    //    byAuction[auction_id] = { auction_id, suppliers: [...stats] }
    // =========================================================
    const byAuction: Record<
      string,
      { auction_id: string; suppliers: { supplier_id: string; total: number; bid_count: number }[] }
    > = {};

    for (const [supplierId, auctionMap] of Object.entries(bySupplierAuction)) {
      for (const [aId, stats] of Object.entries(auctionMap)) {
        if (!byAuction[aId]) {
          byAuction[aId] = { auction_id: aId, suppliers: [] };
        }
        byAuction[aId].suppliers.push({
          supplier_id: supplierId,
          total: stats.total,
          bid_count: stats.bid_count,
        });
      }
    }

    const supplierIds = Object.keys(bySupplierAuction);
    const auctionIds = Object.keys(byAuction);

    // =========================================================
    // 6. Load supplier names
    // =========================================================
    let supplierNameMap: Record<string, string> = {};
    if (supplierIds.length > 0) {
      const { data: supplierRows, error: sErr } = await supabase
        .from("suppliers")
        .select("id, company_name")
        .in("id", supplierIds);

      if (sErr) throw sErr;
      (supplierRows || []).forEach((s: any) => {
        supplierNameMap[s.id] = s.company_name || "Supplier";
      });
    }

    // =========================================================
    // 7. Load auction titles from config JSON
    // =========================================================
    let auctionTitleMap: Record<string, string> = {};

    if (auctionIds.length > 0) {
      const { data: auctionRows, error: aErr } = await supabase
        .from("auctions")
        .select("id, config")
        .in("id", auctionIds);

      if (aErr) throw aErr;

      (auctionRows || []).forEach((a: any) => {
        auctionTitleMap[a.id] = getAuctionTitleFromConfig(a.config);
      });
    }

    // =========================================================
    // MODE 1: Auction-specific leaderboard (?auction_id=...)
    // =========================================================
    if (auctionId) {
      const auctionBlock = byAuction[auctionId];

      if (!auctionBlock) {
        // No bids for this auction
        return NextResponse.json({
          success: true,
          scope: "auction",
          auction_id: auctionId,
          auction_title: auctionTitleMap[auctionId] || null,
          total_suppliers: 0,
          leaderboard: [],
        });
      }

      const suppliers = [...auctionBlock.suppliers].sort((a, b) => a.total - b.total);

      const leaderboard = suppliers.map((s, idx) => ({
        rank: idx + 1,
        supplier_id: s.supplier_id,
        supplier_name: supplierNameMap[s.supplier_id] || "Supplier",
        total: s.total,
        bid_count: s.bid_count,
      }));

      return NextResponse.json({
        success: true,
        scope: "auction",
        auction_id: auctionId,
        auction_title: auctionTitleMap[auctionId] || "Untitled auction",
        total_suppliers: leaderboard.length,
        leaderboard,
      });
    }

    // =========================================================
    // MODE 2: Global leaderboard (no auction_id)
    //  - summary: per supplier across all auctions
    //  - auctions: per-auction leaderboards
    // =========================================================

    // Global supplier summary
    const summary = Object.entries(bySupplierAuction).map(([supplierId, auctionMap]) => {
      let total = 0;
      let bidCount = 0;
      const auctionIdsForSupplier = Object.keys(auctionMap);

      auctionIdsForSupplier.forEach((aId) => {
        const stats = auctionMap[aId];
        total += stats.total;
        bidCount += stats.bid_count;
      });

      return {
        supplier_id: supplierId,
        supplier_name: supplierNameMap[supplierId] || "Supplier",
        total,
        bid_count: bidCount,
        auction_count: auctionIdsForSupplier.length,
      };
    });

    summary.sort((a, b) => a.total - b.total); // lowest total first (reverse auction context)

    // Per-auction leaderboards
    const auctionsList = Object.values(byAuction).map((aBlock) => {
      const suppliers = [...aBlock.suppliers].sort((a, b) => a.total - b.total);

      const leaderboard = suppliers.map((s, idx) => ({
        rank: idx + 1,
        supplier_id: s.supplier_id,
        supplier_name: supplierNameMap[s.supplier_id] || "Supplier",
        total: s.total,
        bid_count: s.bid_count,
      }));

      return {
        auction_id: aBlock.auction_id,
        auction_title: auctionTitleMap[aBlock.auction_id] || "Untitled auction",
        total_suppliers: leaderboard.length,
        leaderboard,
      };
    });

    return NextResponse.json({
      success: true,
      scope: "global",
      total_suppliers: summary.length,
      summary,
      auctions: auctionsList,
    });
  } catch (err: any) {
    console.error("LEADERBOARD API ERROR:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
