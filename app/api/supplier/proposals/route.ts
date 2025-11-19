import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function ensureUUID(val: any): string | null {
  if (!val || typeof val !== "string") return null;
  const v = val.trim();
  const r =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return r.test(v) ? v : null;
}

/* =========================================================================
   GET → Supplier Proposal Dashboard Data
   /api/supplier/proposals?supplier_id=...
=========================================================================== */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const supplierIdParam = url.searchParams.get("supplier_id");
    const supplier_id = ensureUUID(supplierIdParam);

    if (!supplier_id) {
      return NextResponse.json(
        { success: false, error: "supplier_id is required" },
        { status: 400 }
      );
    }

    // Load latest version of proposals per RFQ
    const { data: proposals, error: pErr } = await supabase
      .from("proposal_submissions")
      .select(
        "id, rfq_id, supplier_id, status, submitted_at"
      )
      .eq("supplier_id", supplier_id)
      .order("submitted_at", { ascending: false });

    if (pErr) throw pErr;

    if (!proposals?.length) {
      return NextResponse.json({ success: true, proposals: [] });
    }

    // Get latest record per rfq_id by grouping
    const latestByRFQ: Record<string, any> = {};
    for (const p of proposals) {
      if (!latestByRFQ[p.rfq_id]) latestByRFQ[p.rfq_id] = p;
    }

    const latestList = Object.values(latestByRFQ);

    // Grab proposal ids for line item price calc
    const proposalIds = latestList.map((p: any) => p.id);

    // Evaluate total price from proposal_items
    const { data: itemsData, error: iErr } = await supabase
      .from("proposal_items")
      .select("proposal_id, total")
      .in("proposal_id", proposalIds);

    if (iErr) throw iErr;

    const totalByProposal: Record<string, number> = {};
    for (const row of itemsData || []) {
      totalByProposal[row.proposal_id] =
        (totalByProposal[row.proposal_id] || 0) + Number(row.total);
    }

    // Load RFQ info
    const rfqIds = latestList.map((p: any) => p.rfq_id);
    const { data: rfqs, error: rErr } = await supabase
      .from("rfqs")
      .select("id, title, summary, visibility, status, created_at, end_at, currency")
      .in("id", rfqIds);

    if (rErr) throw rErr;

    // Merge into final dataset
    const final = latestList.map((p: any) => {
      const r = rfqs.find((x: any) => x.id === p.rfq_id);
      return {
        proposal_id: p.id,
        rfq_id: p.rfq_id,
        title: r?.title || "Untitled RFQ",
        summary: r?.summary || "",
        visibility: r?.visibility || "",
        rfq_status: r?.status || "",
        currency: r?.currency || "",
        submitted_at: p.submitted_at,
        proposal_status: p.status,
        total_price: totalByProposal[p.id] || 0,
      };
    });

    return NextResponse.json({ success: true, proposals: final }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/supplier/proposals error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
