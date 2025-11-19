// /app/api/purchase-orders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple PO number generator: PO-YYYYMMDD-XXXX
function generatePONumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `PO-${y}${m}${d}-${rand}`;
}

// =========================================
// POST  → Create Purchase Order from Award
// =========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const award_id = body.award_id as string | undefined;

    if (!award_id) {
      return NextResponse.json(
        { success: false, error: "award_id is required" },
        { status: 400 }
      );
    }

    // 1) Load Award
    const { data: award, error: awardErr } = await supabase
      .from("awards")
      .select("id, rfq_id, supplier_id, status")
      .eq("id", award_id)
      .maybeSingle();

    if (awardErr) throw awardErr;
    if (!award) {
      return NextResponse.json(
        { success: false, error: "Award not found" },
        { status: 404 }
      );
    }

    if (award.status !== "issued") {
      return NextResponse.json(
        {
          success: false,
          error: "PO can only be created for awards in 'issued' status",
        },
        { status: 400 }
      );
    }

    // 2) Ensure we don't double-create PO for same award
    const { data: existingPO, error: existingErr } = await supabase
      .from("purchase_orders")
      .select("id, po_number")
      .eq("award_id", award_id)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existingPO) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order already exists for this award",
          po_id: existingPO.id,
          po_number: existingPO.po_number,
        },
        { status: 400 }
      );
    }

    // 3) Load RFQ (for org + currency)
    const { data: rfq, error: rfqErr } = await supabase
      .from("rfqs")
      .select("id, organization_id, currency")
      .eq("id", award.rfq_id)
      .maybeSingle();

    if (rfqErr) throw rfqErr;
    if (!rfq) {
      return NextResponse.json(
        { success: false, error: "RFQ not found for this award" },
        { status: 404 }
      );
    }

    // 4) Load latest proposal for this supplier on this RFQ
    const { data: proposal, error: proposalErr } = await supabase
      .from("proposal_submissions")
      .select("id, total_price, submitted_at")
      .eq("rfq_id", award.rfq_id)
      .eq("supplier_id", award.supplier_id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (proposalErr) throw proposalErr;

    const total_amount = proposal?.total_price ?? null;

    // 5) Generate PO number + ID
    const po_number = generatePONumber();
    const poId = uuidv4();

    // 6) Insert Purchase Order
    const { data: poRow, error: poErr } = await supabase
      .from("purchase_orders")
      .insert([
        {
          id: poId,
          award_id,
          po_number,
          supplier_id: award.supplier_id,
          organization_id: rfq.organization_id,
          currency: rfq.currency,
          total_amount,
          status: "created",
          created_at: new Date().toISOString(),
          due_date: null,
        },
      ])
      .select()
      .single();

    if (poErr) throw poErr;

    // 7) Update Award → completed
    const { error: awardUpdateErr } = await supabase
      .from("awards")
      .update({ status: "completed" })
      .eq("id", award_id);

    if (awardUpdateErr) throw awardUpdateErr;

    return NextResponse.json(
      {
        success: true,
        po_id: poRow.id,
        po_number: poRow.po_number,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/purchase-orders error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// =========================================
// GET  → Single PO / by award / list
// =========================================
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const award_id = url.searchParams.get("award_id");

    // -------- Single PO DETAIL by id --------
    if (id) {
      // 1) Load PO
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .select(
          "id, po_number, award_id, supplier_id, organization_id, currency, total_amount, status, created_at, due_date"
        )
        .eq("id", id)
        .maybeSingle();

      if (poErr) throw poErr;
      if (!po) {
        return NextResponse.json(
          { success: false, error: "Purchase order not found" },
          { status: 404 }
        );
      }

      // 2) Load Award
      const { data: award, error: awardErr } = await supabase
        .from("awards")
        .select("id, rfq_id, supplier_id, awarded_at, award_summary, status")
        .eq("id", po.award_id)
        .maybeSingle();

      if (awardErr) throw awardErr;

      // 3) Load RFQ
      let rfq = null;
      if (award?.rfq_id) {
        const { data: rfqData, error: rfqErr } = await supabase
          .from("rfqs")
          .select("id, title, currency")
          .eq("id", award.rfq_id)
          .maybeSingle();
        if (rfqErr) throw rfqErr;
        rfq = rfqData;
      }

      // 4) Load Supplier + Contacts
      const { data: supplier, error: supErr } = await supabase
        .from("suppliers")
        .select("id, company_name, country")
        .eq("id", po.supplier_id)
        .maybeSingle();

      if (supErr) throw supErr;

      const { data: contacts } = await supabase
        .from("supplier_contacts")
        .select("email, phone")
        .eq("supplier_id", po.supplier_id);

      // 5) Load latest proposal + line items (for this supplier+rfq)
      let proposal = null;
      let lineItems: any[] = [];

      if (award?.rfq_id && award?.supplier_id) {
        const { data: propData, error: propErr } = await supabase
          .from("proposal_submissions")
          .select("id, total_price, submitted_at")
          .eq("rfq_id", award.rfq_id)
          .eq("supplier_id", award.supplier_id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (propErr) throw propErr;
        proposal = propData || null;

        if (proposal?.id) {
          const { data: liData, error: liErr } = await supabase
            .from("proposal_items")
            .select(
              "id, rfq_item_id, unit_price, total, rfq_items (id, description, qty, uom)"
            )
            .eq("proposal_id", proposal.id);

          if (liErr) throw liErr;
          lineItems = liData || [];
        }
      }

      return NextResponse.json(
        {
          success: true,
          po: {
            ...po,
            award,
            rfq,
            supplier: {
              ...supplier,
              contacts: contacts || [],
            },
            proposal: proposal
              ? {
                  ...proposal,
                  line_items: lineItems,
                }
              : null,
          },
        },
        { status: 200 }
      );
    }

    // -------- Single PO by award_id (for "View PO" on Award page) --------
    if (award_id) {
      const { data: po, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, award_id, status")
        .eq("award_id", award_id)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json(
        {
          success: true,
          po: po || null,
        },
        { status: 200 }
      );
    }

    // -------- List of POs --------
    const { data: pos, error: listErr } = await supabase
      .from("purchase_orders")
      .select(
        "id, po_number, supplier_id, organization_id, currency, total_amount, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (listErr) throw listErr;

    return NextResponse.json(
      {
        success: true,
        purchase_orders: pos || [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/purchase-orders error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
