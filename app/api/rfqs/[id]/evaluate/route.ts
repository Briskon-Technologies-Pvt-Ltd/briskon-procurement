import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/rfqs/[id]/evaluate
 * Body:
 * {
 *   "evaluated_by": "profile_uuid",
 *   "evaluations": [
 *      {"proposal_id": "uuid", "score": 85, "remarks": "Good value"},
 *      ...
 *   ]
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const rfqId = resolvedParams.id;
    const body = await req.json();

    if (!body.evaluated_by || !Array.isArray(body.evaluations)) {
      return NextResponse.json({ error: "evaluated_by and evaluations[] required" }, { status: 400 });
    }

    // Update each proposal with evaluation score and remarks
    for (const ev of body.evaluations) {
      await supabase
        .from("proposal_submissions")
        .update({
          evaluation_score: ev.score ?? null,
          evaluation_remarks: ev.remarks ?? null,
          status: "evaluated",
        })
        .eq("id", ev.proposal_id);
    }

    // Log evaluation audit
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: body.evaluated_by,
        resource_type: "rfq",
        resource_id: rfqId,
        action: "evaluated_proposals",
        payload: { evaluations: body.evaluations },
      },
    ]);

    return NextResponse.json({ success: true, message: "Proposals evaluated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
