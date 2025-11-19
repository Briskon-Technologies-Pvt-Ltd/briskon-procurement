import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/proposals/[id]/review
 *
 * Body:
 * {
 *   "reviewed_by": "profile_uuid",
 *   "status": "accepted" | "rejected" | "under_review",
 *   "comments": "optional remarks or justification"
 * }
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const proposalId = params.id;
    const body = await req.json();
    const { reviewed_by, status, comments } = body;

    if (!proposalId || !reviewed_by || !status) {
      return NextResponse.json(
        { error: "proposalId, reviewed_by, and status are required" },
        { status: 400 }
      );
    }

    if (!["accepted", "rejected", "under_review"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed: accepted, rejected, under_review" },
        { status: 400 }
      );
    }

    // 1️⃣ Update the proposal status and metadata
    const { data: updatedProposal, error: updateError } = await supabase
      .from("proposal_submissions")
      .update({
        status,
        submission_text: comments ? comments : undefined,
        submitted_at: new Date().toISOString(), // optional timestamp refresh
      })
      .eq("id", proposalId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2️⃣ Audit trail entry
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: reviewed_by,
        resource_type: "proposal_submission",
        resource_id: proposalId,
        action: `proposal_${status}`,
        payload: {
          status,
          comments,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Proposal marked as ${status}`,
      proposal: updatedProposal,
    });
  } catch (err: any) {
    console.error("Error reviewing proposal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
