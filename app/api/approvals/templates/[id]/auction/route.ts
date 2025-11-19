import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// --- Type Definitions ---
interface ApprovalTemplate {
  id: string;
  name: string;
  description?: string;
}

interface Profile {
  id: string;
  fname?: string;
  lname?: string;
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

interface Approval {
  id: string;
  entity_type: string;
  entity_id: string;
  template_id: string;
  current_step_no: number;
  status: string;
  created_by?: string | null;
  created_at?: string;
  acted_at?: string | null;
  comments?: Record<string, any>[] | null;
}

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- POST /api/approvals/templates/[id]/auction ---
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id;
    const body = await req.json();

    const { auction_id, created_by } = body;
    if (!auction_id || !created_by) {
      return NextResponse.json(
        { error: "Missing required fields: auction_id, created_by" },
        { status: 400 }
      );
    }

    // 1️⃣ Verify the approval template exists
    const { data: template, error: templateError } = await supabase
      .from("approval_templates")
      .select("id, name, description")
      .eq("id", templateId)
      .maybeSingle();

    if (templateError || !template)
      throw new Error("Approval template not found.");

    // 2️⃣ Fetch template steps
    const { data: steps, error: stepsError } = await supabase
      .from("approval_steps")
      .select("id, step_no, role_id, profile_id, condition_json, escalate_to, sla_hours")
      .eq("template_id", templateId)
      .order("step_no", { ascending: true });

    if (stepsError) throw stepsError;
    if (!steps || steps.length === 0)
      throw new Error("No steps defined in this approval template.");

    // 3️⃣ Create approval record
    const newApproval: Approval = {
      id: uuidv4(),
      entity_type: "auction",
      entity_id: auction_id,
      template_id: templateId,
      current_step_no: 1,
      status: "pending",
      created_by,
      created_at: new Date().toISOString(),
      comments: [],
    };

    const { data: insertedApproval, error: insertError } = await supabase
      .from("approvals")
      .insert([newApproval])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4️⃣ Log an audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "approval",
        resource_id: insertedApproval.id,
        action: "created",
        payload: {
          entity_type: "auction",
          auction_id,
          template_name: template.name,
          steps_count: steps.length,
        },
      },
    ]);

    // 5️⃣ Respond with the created approval
    return NextResponse.json({
      success: true,
      message: "Approval workflow started for auction.",
      approval: insertedApproval,
      template,
      steps,
    });
  } catch (err: any) {
    console.error("Error starting approval for auction:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
