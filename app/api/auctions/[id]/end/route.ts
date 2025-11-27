import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auctions/[id]/end
 * Ends an auction (status → 'closed')
 * Body: { ended_by: "profile_uuid", reason?: "optional reason" }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;
    const body = await req.json();
    const endedBy = body.ended_by;
    const reason = body.reason || "Manually ended by admin";

    if (!endedBy)
      return NextResponse.json({ error: "ended_by is required" }, { status: 400 });

    // Fetch current auction
    const { data: auction, error: fetchError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (fetchError || !auction)
      throw new Error("Auction not found or could not be fetched");

    if (auction.status !== "live") {
      return NextResponse.json(
        { error: "Only live auctions can be ended" },
        { status: 400 }
      );
    }

    // Update auction status
    const { data: updatedAuction, error: updateError } = await supabase
      .from("auctions")
      .update({
        status: "closed",
        end_at: new Date().toISOString(),
      })
      .eq("id", auctionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log audit
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: endedBy,
        resource_type: "auction",
        resource_id: auctionId,
        action: "ended",
        payload: {
          prev_status: auction.status,
          new_status: "closed",
          reason,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Auction ended successfully",
      auction: updatedAuction,
    });
  } catch (err: any) {
    console.error("Error ending auction:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
