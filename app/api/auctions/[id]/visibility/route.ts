import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/auctions/[id]/visibility
 * Fetch all suppliers, groups, and categories that have visibility to the auction.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auctionId = params.id;

    const { data, error } = await supabase
      .from("auction_visibility")
      .select(`
        id,
        auction_id,
        supplier_id,
        supplier_group_id,
        category_id,
        visibility_type,
        created_at,
        suppliers(company_name),
        supplier_groups(name),
        categories(name)
      `)
      .eq("auction_id", auctionId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      visibility: data,
    });
  } catch (err: any) {
    console.error("Error fetching auction visibility:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/auctions/[id]/visibility
 * Add suppliers, groups, or categories who can see this auction.
 * Body Example:
 * {
 *   "supplier_ids": ["uuid1", "uuid2"],
 *   "supplier_group_ids": ["uuid3"],
 *   "category_ids": ["uuid4"],
 *   "visibility_type": "invited",
 *   "created_by": "uuid"
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auctionId = params.id;
    const body = await req.json();

    const {
      supplier_ids = [],
      supplier_group_ids = [],
      category_ids = [],
      visibility_type = "invited",
      created_by,
    } = body;

    if (!created_by)
      return NextResponse.json({ error: "created_by is required" }, { status: 400 });

    if (
      supplier_ids.length === 0 &&
      supplier_group_ids.length === 0 &&
      category_ids.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one supplier, group, or category must be provided" },
        { status: 400 }
      );
    }

    // Build insert entries
    const entries: any[] = [];

    supplier_ids.forEach((sid: string) =>
      entries.push({
        auction_id: auctionId,
        supplier_id: sid,
        visibility_type,
      })
    );

    supplier_group_ids.forEach((gid: string) =>
      entries.push({
        auction_id: auctionId,
        supplier_group_id: gid,
        visibility_type,
      })
    );

    category_ids.forEach((cid: string) =>
      entries.push({
        auction_id: auctionId,
        category_id: cid,
        visibility_type,
      })
    );

    // Insert, skipping duplicates due to unique constraint
    const { data, error } = await supabase
      .from("auction_visibility")
      .upsert(entries, { onConflict: "auction_id,supplier_id" })
      .select();

    if (error) throw error;

    // Audit log entry
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "auction",
        resource_id: auctionId,
        action: "visibility_updated",
        payload: {
          supplier_ids,
          supplier_group_ids,
          category_ids,
          visibility_type,
          count_added: data.length,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Auction visibility updated successfully",
      count: data.length,
      visibility: data,
    });
  } catch (err: any) {
    console.error("Error updating auction visibility:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
