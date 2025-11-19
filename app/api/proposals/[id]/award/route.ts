import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/proposals/[id]/award
 *
 * Body:
 * {
 *   "awarded_by": "profile_uuid",
 *   "award_summary": "optional text summary of reason or notes"
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const proposalId = params.id;
    const body = await req.json();
    const { awarded_by, award_summary } = body;

    if (!proposalId || !awarded_by) {
      return NextResponse.json(
        { error: "proposalId and awarded_by are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Get proposal details
    const { data: proposal, error: proposalError } = await supabase
      .from("proposal_submissions")
      .select("id, rfq_id, auction_id, supplier_id, status")
      .eq("id", proposalId)
      .single();

    if (proposalError) throw proposalError;
    if (!proposal) throw new Error("Proposal not found");

    // 2️⃣ Check that proposal is accepted
    if (proposal.status !== "accepted") {
      return NextResponse.json(
        { error: "Only accepted proposals can be converted to awards" },
        { status: 400 }
      );
    }

    // 3️⃣ Create award record
    const { data: award, error: awardError } = await supabase
      .from("awards")
      .insert([
        {
          rfq_id: proposal.rfq_id,
          auction_id: proposal.auction_id,
          supplier_id: proposal.supplier_id,
          awarded_by,
          awarded_at: new Date().toISOString(),
          award_summary,
          status: "issued",
        },
      ])
      .select()
      .single();

    if (awardError) throw awardError;

    // 4️⃣ Optionally update proposal status → 'awarded'
    const { error: updateError } = await supabase
      .from("proposal_submissions")
      .update({ status: "awarded" })
      .eq("id", proposalId);

    if (updateError) throw updateError;

    // 5️⃣ Log to audit_events
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: awarded_by,
        resource_type: "proposal_submission",
        resource_id: proposalId,
        action: "converted_to_award",
        payload: {
          award_id: award.id,
          supplier_id: proposal.supplier_id,
          rfq_id: proposal.rfq_id,
          auction_id: proposal.auction_id,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Award created successfully from proposal",
      award,
    });
  } catch (err: any) {
    console.error("Error converting proposal to award:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
