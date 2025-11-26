// /app/api/awards/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================
// GET HANDLER
// =====================================
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const auctionId = url.searchParams.get("auction_id");

    // ---------- SINGLE AWARD BY ID ----------
    if (id) {
      const { data: award, error } = await supabase
        .from("awards")
        .select(`
          id,
          auction_id,
          rfq_id,
          winning_bid_id,
          supplier_id,
          awarded_at,
          award_summary,
          status,
          suppliers (id, company_name, country),
          rfqs (id, title, currency),
          auctions (id, rfq_id, currency, status, config)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!award) {
        return NextResponse.json(
          { success: false, error: "Award not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, award }, { status: 200 });
    }

    // ---------- OPTIONAL: GET AWARD FOR A SPECIFIC AUCTION ----------
    if (auctionId) {
      const { data: award, error } = await supabase
        .from("awards")
        .select(`
          id,
          auction_id,
          rfq_id,
          winning_bid_id,
          supplier_id,
          awarded_at,
          award_summary,
          status,
          suppliers (id, company_name, country)
        `)
        .eq("auction_id", auctionId)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json({ success: true, award }, { status: 200 });
    }

    // ---------- LIST ALL AWARDS ----------
    const { data: awardsList, error: listErr } = await supabase
      .from("awards")
      .select(`
        id,
        auction_id,
        rfq_id,
        supplier_id,
        awarded_at,
        award_summary,
        status,
        suppliers (company_name),
        rfqs (title, currency),
        auctions (id, currency, config)
      `)
      .order("awarded_at", { ascending: false });

    if (listErr) throw listErr;

    return NextResponse.json(
      { success: true, awards: awardsList },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/awards error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================
// POST HANDLER
// Supports:
// 1) RFQ awards  (rfq_id + supplier_id)
// 2) Auction awards (auction_id + winning_bid_id + supplier_id)
// =====================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      rfq_id,
      auction_id,
      supplier_id,
      winning_bid_id,
      award_summary,
      awarded_by_profile_id,
    } = body;

    if (!supplier_id) {
      return NextResponse.json(
        { success: false, error: "supplier_id is required" },
        { status: 400 }
      );
    }

    if (!rfq_id && !auction_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Either rfq_id or auction_id must be provided",
        },
        { status: 400 }
      );
    }

    if (rfq_id && auction_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide only rfq_id OR auction_id, not both",
        },
        { status: 400 }
      );
    }

    // =========================
    // BEGIN: COMMON PAYLOAD
    // =========================
    const nowIso = new Date().toISOString();

    // Prepare insert payload
    const insertPayload: any = {
      supplier_id,
      award_summary,
      awarded_by: awarded_by_profile_id || null,
      awarded_at: nowIso,
      status: "issued",
    };

    if (rfq_id) insertPayload.rfq_id = rfq_id;
    if (auction_id) insertPayload.auction_id = auction_id;
    if (winning_bid_id) insertPayload.winning_bid_id = winning_bid_id;

    // =========================
    // INSERT AWARD RECORD
    // =========================
    const { data: award, error: awardErr } = await supabase
      .from("awards")
      .insert(insertPayload)
      .select()
      .single();

    if (awardErr) throw awardErr;

    // =========================
    // UPDATE PARENT ENTITY STATUS
    // =========================

    if (rfq_id) {
      const { error: rfqStatusErr } = await supabase
        .from("rfqs")
        .update({ status: "awarded" })
        .eq("id", rfq_id);

      if (rfqStatusErr) throw rfqStatusErr;
    }

    if (auction_id) {
      const { error: auctionStatusErr } = await supabase
        .from("auctions")
        .update({ status: "awarded" })
        .eq("id", auction_id);

      if (auctionStatusErr) throw auctionStatusErr;
    }

    // =========================
    // AUDIT LOG
    // =========================
    if (awarded_by_profile_id) {
      const auditPayload = {
        actor_profile_id: awarded_by_profile_id,
        resource_type: auction_id ? "auction_award" : "rfq_award",
        resource_id: award.id,
        action: "award_issued",
        payload: {
          rfq_id: rfq_id || null,
          auction_id: auction_id || null,
          supplier_id,
          winning_bid_id: winning_bid_id || null,
        },
      };

      const { error: auditErr } = await supabase
        .from("audit_events")
        .insert(auditPayload);

      if (auditErr) {
        console.error("Failed to write audit_events:", auditErr.message);
      }
    }

    // =========================
    // NOTIFICATION (simple system notification to awarding profile)
// =========================
    if (awarded_by_profile_id) {
      const notificationPayload = {
        recipient_profile_id: awarded_by_profile_id,
        related_entity: "award",
        entity_id: award.id,
        message: rfq_id
          ? `Award issued for RFQ to supplier`
          : `Award issued for Auction to supplier`,
        type: "auction", // valid per CHECK constraint
        is_read: false,
      };

      const { error: notifErr } = await supabase
        .from("notifications")
        .insert(notificationPayload);

      if (notifErr) {
        console.error("Failed to create notification:", notifErr.message);
      }
    }

    // =========================
    // RESPONSE
    // =========================
    return NextResponse.json(
      {
        success: true,
        message: "Award created successfully",
        award,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/awards error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
