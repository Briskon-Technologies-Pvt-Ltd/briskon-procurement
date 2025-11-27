import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/auctions/[id]/close
 * Body Example:
 * {
 *   "performed_by": "uuid",
 *   "reason": "Auction ended as scheduled"
 * }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;
    const body = await req.json();
    const { performed_by, reason } = body;

    if (!performed_by)
      return NextResponse.json({ error: "performed_by is required" }, { status: 400 });

    // Fetch current auction
    const { data: auction, error: fetchError } = await supabase
      .from("auctions")
      .select("id, status, end_at, organization_id, rfq_id")
      .eq("id", auctionId)
      .single();

    if (fetchError || !auction) throw new Error("Auction not found");

    // Allow closure only if auction is live or published
    if (!["live", "published"].includes(auction.status)) {
      return NextResponse.json(
        { error: `Auction in '${auction.status}' state cannot be closed.` },
        { status: 400 }
      );
    }

    // Update status to 'closed'
    const { data: updated, error: updateError } = await supabase
      .from("auctions")
      .update({
        status: "closed",
        end_at: auction.end_at || new Date().toISOString(),
      })
      .eq("id", auctionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log closure in audit_events
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: performed_by,
        resource_type: "auction",
        resource_id: auctionId,
        action: "closed",
        payload: {
          closed_at: new Date().toISOString(),
          previous_status: auction.status,
          new_status: "closed",
          reason: reason || "Closed manually by user",
        },
      },
    ]);

    // Optional future step: trigger system-level notifications
    // await supabase.from("notifications").insert([...]);

    return NextResponse.json({
      success: true,
      message: "Auction closed successfully.",
      auction: updated,
    });
  } catch (err: any) {
    console.error("Error closing auction:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
