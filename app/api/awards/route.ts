// /app/api/awards/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

      // Load proposal for this supplier + rfq
      const { data: proposal, error: proposalErr } = await supabase
        .from("proposal_submissions")
        .select("id, total_price, submitted_at")
        .eq("rfq_id", award.rfq_id)
        .eq("supplier_id", award.supplier_id)
        .maybeSingle();

      if (proposalErr) throw proposalErr;

      // Load line item pricing
      let lineItems: any[] = [];
      if (proposal) {
        const { data: items } = await supabase
          .from("proposal_items")
          .select("rfq_item_id, unit_price, total, rfq_items(description, qty, uom)")
          .eq("proposal_id", proposal.id);

        lineItems = items || [];
      }

      return NextResponse.json(
        {
          success: true,
          award: {
            ...award,
            proposal: {
              ...proposal,
              line_items: lineItems
            }
          }
        },
        { status: 200 }
      );
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
