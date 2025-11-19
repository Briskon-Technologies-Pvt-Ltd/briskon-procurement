// /app/api/supplier/opportunities/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const supplierId = url.searchParams.get("supplier_id");

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplier_id required" },
        { status: 400 }
      );
    }

    // Load published RFQs + join organization name
    const { data: rfqs, error: rfqErr } = await supabase
      .from("rfqs")
      .select(`
        id,
        title,
        summary,
        visibility,
        status,
        created_at,
        end_at,
        organization_id,
        organizations(name)
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (rfqErr) throw rfqErr;

    if (!rfqs?.length) {
      return NextResponse.json({ success: true, rfqs: [] });
    }

    const rfqIds = rfqs.map((r) => r.id as string);

    const { data: invitedRows, error: invitedErr } = await supabase
      .from("rfq_invited_suppliers")
      .select("rfq_id, supplier_id")
      .in("rfq_id", rfqIds)
      .eq("supplier_id", supplierId);

    if (invitedErr) throw invitedErr;

    const invitedRfqIds = new Set((invitedRows || []).map((r) => r.rfq_id));

    const visibleRfqs = rfqs.filter(
      (r) => r.visibility === "public" || invitedRfqIds.has(r.id)
    );

    if (!visibleRfqs.length) {
      return NextResponse.json({ success: true, rfqs: [] });
    }

    const visibleIds = visibleRfqs.map((r) => r.id as string);

    const { data: proposals, error: propErr } = await supabase
      .from("proposal_submissions")
      .select("rfq_id, status, submitted_at")
      .eq("supplier_id", supplierId)
      .in("rfq_id", visibleIds);

    if (propErr) throw propErr;

    const proposalByRfq: Record<string, any> = {};
    for (const p of proposals || []) {
      proposalByRfq[p.rfq_id] = {
        status: p.status,
        submitted_at: p.submitted_at,
      };
    }

    const result = visibleRfqs.map((r) => {
      const proposal = proposalByRfq[r.id] || null;
      return {
        id: r.id,
        title: r.title,
        summary: r.summary,
        visibility: r.visibility,
        status: r.status,
        created_at: r.created_at,
        start_at: r.created_at, // using created date as fallback
        end_at: r.end_at, // no deadline field yet
        buyer_name: r.organizations?.name || "Unknown organization",
        proposal_status: proposal ? proposal.status : "Not submitted",
        proposal_submitted_at: proposal ? proposal.submitted_at : null,
      };
    });

    return NextResponse.json({ success: true, rfqs: result });
  } catch (err: any) {
    console.error("GET /api/supplier/opportunities error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
