import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/approvals/start
 * Starts a new approval process for an entity (e.g., RFQ, Auction)
 *
 * Body:
 * {
 *   "entity_type": "auction",
 *   "entity_id": "uuid",
 *   "template_id": "uuid",
 *   "created_by": "profile_uuid"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entity_type, entity_id, template_id, created_by } = body;

    if (!entity_type || !entity_id || !template_id || !created_by) {
      return NextResponse.json(
        { error: "entity_type, entity_id, template_id, and created_by are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Validate that template exists
    const { data: template, error: templateError } = await supabase
      .from("approval_templates")
      .select("id, name")
      .eq("id", template_id)
      .single();

    if (templateError || !template)
      throw new Error("Approval template not found");

    // 2️⃣ Check if approval already exists for this entity
    const { data: existing } = await supabase
      .from("approvals")
      .select("id, status")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An approval workflow already exists for this entity" },
        { status: 409 }
      );
    }

    // 3️⃣ Fetch first step (step_no = 1)
    const { data: firstStep, error: stepError } = await supabase
      .from("approval_steps")
      .select("id, step_no, role_id, profile_id, sla_hours")
      .eq("template_id", template_id)
      .eq("step_no", 1)
      .maybeSingle();

    if (stepError) throw stepError;
    if (!firstStep)
      throw new Error("Approval template does not have a first step defined");

    // 4️⃣ Create approval instance
    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .insert([
        {
          entity_type,
          entity_id,
          template_id,
          current_step_no: 1,
          status: "pending",
          created_by,
        },
      ])
      .select()
      .single();

    if (approvalError) throw approvalError;

    // 5️⃣ Log audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "approval",
        resource_id: approval.id,
        action: "started",
        payload: {
          entity_type,
          entity_id,
          template_id,
          current_step_no: 1,
        },
      },
    ]);

    // 6️⃣ Notify first approver (optional future enhancement)
    // await supabase.from("notifications").insert(...)

    return NextResponse.json({
      success: true,
      message: `Approval process started using template '${template.name}'`,
      approval,
      next_approver: firstStep.profile_id || firstStep.role_id,
    });
  } catch (err: any) {
    console.error("Error starting approval workflow:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
