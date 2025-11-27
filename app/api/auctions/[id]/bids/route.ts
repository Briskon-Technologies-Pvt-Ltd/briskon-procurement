import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/auctions/[id]/bids
 * Query Params (optional):
        `
        id,
        auction_id,
        auction_item_id,
        supplier_id,
        amount,
        currency,
        created_at,
        suppliers(company_name),
        profiles:placed_by_profile_id(fname, lname)
      `
      )
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: sort === "asc" });

    if (supplierId) query = query.eq("supplier_id", supplierId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      bids: data || [],
    });
  } catch (err: any) {
    console.error("Error fetching bids:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/auctions/[id]/bids
 * Allows suppliers to place a bid.
 * Body:
 * {
 *   "supplier_id": "uuid",
 *   "placed_by_profile_id": "uuid",
 *   "auction_item_id": "uuid|null",
 *   "amount": 1234.56,
 *   "currency": "EUR",
 *   "metadata": { ...optional }
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;
    const body = await req.json();

    const { supplier_id, placed_by_profile_id, auction_item_id, amount, currency, metadata } = body;

    // Validate input
    if (!supplier_id || !placed_by_profile_id || !amount || !currency) {
      return NextResponse.json(
        { error: "supplier_id, placed_by_profile_id, amount, and currency are required" },
        { status: 400 }
      );
    }

    // Fetch auction and verify if live
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("id, status, currency")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) throw new Error("Auction not found");
    if (auction.status !== "live") {
      return NextResponse.json(
        { error: "Bidding is allowed only in live auctions" },
        { status: 400 }
      );
    }

    // Insert bid
    const { data: newBid, error: bidError } = await supabase
      .from("bids")
      .insert([
        {
          auction_id: auctionId,
          auction_item_id: auction_item_id ?? null,
          supplier_id,
          placed_by_profile_id,
          amount,
          currency,
          metadata: metadata ?? {},
        },
      ])
      .select()
      .single();

    if (bidError) throw bidError;

    // Log to bid_history
    await supabase.from("bid_history").insert([
      {
        bid_id: newBid.id,
        action: "created",
        actor_profile_id: placed_by_profile_id,
        amount: amount,
        currency: currency,
        metadata: { ...metadata, message: "Bid placed successfully" },
      },
    ]);

    // Audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: placed_by_profile_id,
        resource_type: "bid",
        resource_id: newBid.id,
        action: "created",
        payload: {
          auction_id: auctionId,
          supplier_id,
          amount,
          currency,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Bid placed successfully",
      bid: newBid,
    });
  } catch (err: any) {
    console.error("Error submitting bid:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
