import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/rfqs/[id]/submit-proposal
 * Body:
 * {
 *   "supplier_id": "uuid",
 *   "submitted_by": "profile_uuid",
 *   "price_total": 12345.67,
 *   "currency": "EUR",
 *   "notes": "optional",
 *   "documents": [
 *       {"file_id": "uuid", "file_name": "quotation.pdf"},
 *       ...
 *   ]
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const rfqId = params.id;
    const body = await req.json();

    if (!body.supplier_id || !body.submitted_by) {
      return NextResponse.json({ error: "supplier_id and submitted_by are required" }, { status: 400 });
    }

    // Insert proposal submission
    const { data: proposal, error } = await supabase
      .from("proposal_submissions")
      .insert([
        {
          rfq_id: rfqId,
          supplier_id: body.supplier_id,
          submitted_by: body.submitted_by,
          total_price: body.price_total ?? null,
          currency: body.currency ?? "EUR",
          notes: body.notes ?? null,
          status: "submitted",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Insert attached documents, if any
    if (Array.isArray(body.documents) && body.documents.length > 0) {
      const docs = body.documents.map((d: any) => ({
        proposal_id: proposal.id,
        rfq_id: rfqId,
        file_id: d.file_id,
        file_name: d.file_name,
      }));
      await supabase.from("proposal_documents").insert(docs);
    }

    // Log audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: body.submitted_by,
        resource_type: "rfq",
        resource_id: rfqId,
        action: "proposal_submitted",
        payload: {
          supplier_id: body.supplier_id,
          total_price: body.price_total,
          currency: body.currency,
        },
      },
    ]);

    return NextResponse.json({ success: true, proposal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
