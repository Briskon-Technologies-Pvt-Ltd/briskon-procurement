import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/auctions/[id]/summary
 * Fetch full auction snapshot including bids, awards, and supplier stats.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;

    // Fetch auction core info
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select(
        `
        id,
        rfq_id,
        organization_id,
        auction_type,
        start_at,
        end_at,
        currency,
        language,
        visibility_mode,
        config,
        status,
        created_by,
        created_at
      `
      )
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) throw new Error("Auction not found");

    // Fetch all bids
    const { data: bids, error: bidError } = await supabase
      .from("bids")
      .select(
        `
        id,
        supplier_id,
        amount,
        currency,
        created_at,
        suppliers(company_name)
      `
      )
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: false });

    if (bidError) throw bidError;

    // Supplier stats
    const uniqueSuppliers = [...new Set(bids.map((b) => b.supplier_id))];
    const totalBids = bids.length;

    // Fetch award info
    const { data: award, error: awardError } = await supabase
      .from("awards")
      .select(
        `
        id,
        winning_bid_id,
        supplier_id,
        awarded_by,
        awarded_at,
        award_summary,
        status,
        suppliers(company_name),
        bids(amount, currency)
      `
      )
      .eq("auction_id", auctionId)
      .single();

    // Build response
    const summary = {
      auction,
      stats: {
        total_bids: totalBids,
        total_suppliers: uniqueSuppliers.length,
        lowest_bid:
          bids.length > 0
            ? bids.reduce((min, b) => (b.amount < min.amount ? b : min), bids[0])
            : null,
      },
      bids,
      award: awardError ? null : award,
    };

    // Log audit
    await supabase.from("audit_events").insert([
      {
        resource_type: "auction",
        resource_id: auctionId,
        action: "view_summary",
        payload: { viewed_at: new Date().toISOString() },
      },
    ]);

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error("Error fetching auction summary:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
