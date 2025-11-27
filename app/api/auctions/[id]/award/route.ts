import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auctions/[id]/award
 * Body:
 * {
 *   "winning_bid_id": "uuid",
 *   "supplier_id": "uuid",
 *   "awarded_by": "uuid", // profile id of admin/buyer
 *   "award_summary": "Optional text"
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;
    const body = await req.json();
    const { winning_bid_id, supplier_id, awarded_by, award_summary } = body;

    if (!winning_bid_id || !supplier_id || !awarded_by) {
      return NextResponse.json(
        { error: "winning_bid_id, supplier_id, and awarded_by are required" },
        { status: 400 }
      );
    }

    // Validate auction
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("id, rfq_id, organization_id, status")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) throw new Error("Auction not found");

    if (auction.status !== "closed") {
      return NextResponse.json(
        { error: "Auction must be closed before awarding" },
        { status: 400 }
      );
    }

    // Ensure winning bid exists
    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .select("id, supplier_id, amount, currency")
      .eq("id", winning_bid_id)
      .single();

    if (bidError || !bid) throw new Error("Winning bid not found");

    // Create award
    const { data: newAward, error: awardError } = await supabase
      .from("awards")
      .insert([
        {
          auction_id: auctionId,
          rfq_id: auction.rfq_id,
          winning_bid_id,
          supplier_id,
          awarded_by,
          awarded_at: new Date().toISOString(),
          award_summary: award_summary ?? null,
          status: "issued",
        },
      ])
      .select()
      .single();

    if (awardError) throw awardError;

    // Log audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: awarded_by,
        resource_type: "auction",
        resource_id: auctionId,
        action: "awarded",
        payload: {
          award_id: newAward.id,
          winning_bid_id,
          supplier_id,
          amount: bid.amount,
          currency: bid.currency,
        },
      },
    ]);

    // Update auction status to 'awarded'
    await supabase
      .from("auctions")
      .update({ status: "awarded" })
      .eq("id", auctionId);

    return NextResponse.json({
      success: true,
      message: "Auction awarded successfully",
      award: newAward,
    });
  } catch (err: any) {
    console.error("Error awarding auction:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
