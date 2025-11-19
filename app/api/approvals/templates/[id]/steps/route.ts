import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/approvals/templates/[id]/steps
 * Fetches all steps for a given template ID in ascending order
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id;

    const { data, error } = await supabase
      .from("approval_steps")
      .select(
        `
        id,
        step_no,
        role_id,
        profile_id,
        escalate_to,
        sla_hours,
        condition_json,
        created_at,
        roles (id, name),
        profiles (id, fname, lname)
      `
      )
      .eq("template_id", templateId)
      .order("step_no", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      steps: data,
    });
  } catch (err: any) {
    console.error("Error fetching approval steps:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/approvals/templates/[id]/steps
 * Adds a new approval step to an existing template
 *
 * Body:
 * {
 *   "step_no": 1,
 *   "role_id": "uuid",
 *   "profile_id": null,
 *   "condition_json": { "min_value": 10000 },
 *   "escalate_to": "procurement_head@org.com",
 *   "sla_hours": 24,
 *   "created_by": "profile_uuid"
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id;
    const body = await req.json();

    const {
      step_no,
      role_id,
      profile_id,
      condition_json,
      escalate_to,
      sla_hours,
      created_by,
    } = body;

    if (!templateId || !step_no || !created_by) {
      return NextResponse.json(
        { error: "template_id, step_no, and created_by are required" },
        { status: 400 }
      );
    }

    // Ensure unique step number within template
    const { data: existing } = await supabase
      .from("approval_steps")
      .select("id")
      .eq("template_id", templateId)
      .eq("step_no", step_no)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Step number ${step_no} already exists for this template` },
        { status: 409 }
      );
    }

    // Insert step
    const { data, error } = await supabase
      .from("approval_steps")
      .insert([
        {
          template_id: templateId,
          step_no,
          role_id,
          profile_id,
          condition_json,
          escalate_to,
          sla_hours,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Add audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "approval_step",
        resource_id: data.id,
        action: "created",
        payload: {
          template_id: templateId,
          step_no,
          role_id,
          profile_id,
          escalate_to,
          sla_hours,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Step ${step_no} added successfully`,
      step: data,
    });
  } catch (err: any) {
    console.error("Error creating approval step:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
