import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/auctions/[id]/publish
 * Body:
 * {
 *   "action": "publish" | "unpublish",
 *   "performed_by": "uuid"
 * }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;
    const body = await req.json();
    const { action, performed_by } = body;

    if (!["publish", "unpublish"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'publish' or 'unpublish'." },
        { status: 400 }
      );
    }

    if (!performed_by) {
      return NextResponse.json({ error: "performed_by is required" }, { status: 400 });
    }

    // Fetch current auction
    const { data: auction, error: fetchError } = await supabase
      .from("auctions")
      .select("id, status, start_at, end_at, organization_id, rfq_id")
      .eq("id", auctionId)
      .single();

    if (fetchError || !auction) throw new Error("Auction not found");

    // Prevent invalid state transitions
    if (action === "publish" && auction.status === "published") {
      return NextResponse.json(
        { message: "Auction is already published." },
        { status: 200 }
      );
    }

    if (action === "unpublish" && auction.status === "draft") {
      return NextResponse.json(
        { message: "Auction is already in draft." },
        { status: 200 }
      );
    }

    // Determine new status
    const newStatus = action === "publish" ? "published" : "draft";

    // Update auction status
    const { data: updated, error: updateError } = await supabase
      .from("auctions")
      .update({ status: newStatus })
      .eq("id", auctionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: performed_by,
        resource_type: "auction",
        resource_id: auctionId,
        action: action === "publish" ? "published" : "unpublished",
        payload: {
          timestamp: new Date().toISOString(),
          previous_status: auction.status,
          new_status: newStatus,
        },
      },
    ]);

    // Optional: in future, trigger supplier notifications when published
    // await supabase.from("notifications").insert([...]);

    return NextResponse.json({
      success: true,
      message:
        action === "publish"
          ? "Auction published successfully."
          : "Auction reverted to draft successfully.",
      auction: updated,
    });
  } catch (err: any) {
    console.error("Error updating auction publish status:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
