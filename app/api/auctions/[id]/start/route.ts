import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auctions/[id]/start
 * Starts an auction (status → 'live')
 * Body: { started_by: "profile_uuid" }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auctionId = params.id;
    const body = await req.json();
    const startedBy = body.started_by;

    if (!startedBy)
      return NextResponse.json({ error: "started_by is required" }, { status: 400 });

    // Fetch current auction
    const { data: auction, error: fetchError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (fetchError || !auction)
      throw new Error("Auction not found or could not be fetched");

    if (auction.status !== "published") {
      return NextResponse.json(
        { error: "Only published auctions can be started" },
        { status: 400 }
      );
    }

    // Update to live
    const { data: updatedAuction, error: updateError } = await supabase
      .from("auctions")
      .update({
        status: "live",
        start_at: new Date().toISOString(),
      })
      .eq("id", auctionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: startedBy,
        resource_type: "auction",
        resource_id: auctionId,
        action: "started",
        payload: { prev_status: auction.status, new_status: "live" },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Auction started successfully",
      auction: updatedAuction,
    });
  } catch (err: any) {
    console.error("Error starting auction:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
