import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// --- Interfaces ---
interface Approval {
  id: string;
  entity_type: string;
  entity_id: string;
  template_id: string;
  current_step_no: number;
  status: string;
  created_by?: string;
  created_at?: string;
  acted_at?: string;
  comments?: any[];
}

interface ApprovalStep {
  id: string;
  template_id: string;
  step_no: number;
  role_id?: string | null;
  profile_id?: string | null;
  condition_json?: Record<string, any> | null;
  escalate_to?: string | null;
  sla_hours?: number | null;
}

interface AuditEvent {
  actor_profile_id?: string;
  resource_type: string;
  resource_id: string;
  action: string;
  payload?: Record<string, any>;
}

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- POST /api/approvals/[id]/advance ---
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const approvalId = resolvedParams.id;
    const body = await req.json();

    const { actor_profile_id, action, comment } = body;

    if (!actor_profile_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: actor_profile_id, action" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch current approval
    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .select("id, entity_type, entity_id, template_id, current_step_no, status, comments")
      .eq("id", approvalId)
      .maybeSingle();

    if (approvalError || !approval)
      throw new Error("Approval record not found");

    if (approval.status === "approved" || approval.status === "rejected") {
      return NextResponse.json(
        { error: `This approval is already ${approval.status}` },
        { status: 400 }
      );
    }

    // 2️⃣ Fetch all steps for this template
    const { data: steps, error: stepsError } = await supabase
      .from("approval_steps")
      .select("id, step_no, role_id, profile_id")
      .eq("template_id", approval.template_id)
      .order("step_no", { ascending: true });

    if (stepsError) throw stepsError;
    if (!steps || steps.length === 0)
      throw new Error("No steps defined for this approval template");

    const currentStepIndex = steps.findIndex(
      (s) => s.step_no === approval.current_step_no
    );

    if (currentStepIndex === -1)
      throw new Error("Invalid current step in approval record");

    // 3️⃣ Update based on approver action
    let newStatus = approval.status;
    let nextStepNo = approval.current_step_no;

    if (action === "approve") {
      if (currentStepIndex + 1 < steps.length) {
        nextStepNo = steps[currentStepIndex + 1].step_no;
        newStatus = "in_progress";
      } else {
        nextStepNo = approval.current_step_no;
        newStatus = "approved"; // last step approved
      }
    } else if (action === "reject") {
      newStatus = "rejected";
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be either 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    // Append to comments history
    const updatedComments = [
      ...(approval.comments || []),
      {
        actor_profile_id,
        action,
        comment: comment || null,
        step_no: approval.current_step_no,
        timestamp: new Date().toISOString(),
      },
    ];

    // 4️⃣ Update the approval record
    const { error: updateError } = await supabase
      .from("approvals")
      .update({
        current_step_no: nextStepNo,
        status: newStatus,
        acted_at: new Date().toISOString(),
        comments: updatedComments,
      })
      .eq("id", approvalId);

    if (updateError) throw updateError;

    // 5️⃣ Insert audit event
    const auditEvent: AuditEvent = {
      actor_profile_id,
      resource_type: "approval",
      resource_id: approvalId,
      action,
      payload: {
        previous_status: approval.status,
        new_status: newStatus,
        step_no: approval.current_step_no,
        entity_type: approval.entity_type,
        entity_id: approval.entity_id,
      },
    };

    const { error: auditError } = await supabase
      .from("audit_events")
      .insert([auditEvent]);

    if (auditError) throw auditError;

    // 6️⃣ Respond success
    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? newStatus === "approved"
            ? "Approval process completed successfully."
            : "Step approved. Moved to next approver."
          : "Approval has been rejected.",
      next_step_no: nextStepNo,
      status: newStatus,
    });
  } catch (err: any) {
    console.error("Error advancing approval:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
