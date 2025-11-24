// /app/api/awards/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================
// GET HANDLER (existing)
// =====================================
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // ======================== SINGLE AWARD ========================
    if (id) {
      const { data: award, error } = await supabase
        .from("awards")
        .select(`
          id, rfq_id, supplier_id, awarded_at, award_summary, status,
          suppliers (id, company_name, country),
          rfqs (id, title, currency)
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

    // ======================== LIST ALL AWARDS ========================
    const { data: awardsList, error: listErr } = await supabase
      .from("awards")
      .select(`
        id, rfq_id, supplier_id, awarded_at, status,
        suppliers (company_name),
        rfqs (title, currency)
      `)
      .order("awarded_at", { ascending: false });

    if (listErr) throw listErr;

    return NextResponse.json({ success: true, awards: awardsList }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/awards error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================
// POST HANDLER (new)
// =====================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rfq_id, supplier_id, award_summary, awarded_by_profile_id } = body;

    if (!rfq_id || !supplier_id) {
      return NextResponse.json(
        { success: false, error: "rfq_id and supplier_id are required" },
        { status: 400 }
      );
    }

    // ============= INSERT AWARD RECORD =================
    const { data: award, error: awardErr } = await supabase
      .from("awards")
      .insert({
        rfq_id,
        supplier_id,
        award_summary,
        awarded_by: awarded_by_profile_id || null,
        awarded_at: new Date().toISOString(),
        status: "issued",
      })
      .select()
      .single();

    if (awardErr) throw awardErr;

    // ============= UPDATE RFQ STATUS =================
    const { error: rfqStatusErr } = await supabase
      .from("rfqs")
      .update({ status: "awarded" })
      .eq("id", rfq_id);

    if (rfqStatusErr) throw rfqStatusErr;

    // ============= RESPONSE =================
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
