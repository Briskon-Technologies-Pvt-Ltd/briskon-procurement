import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
// --- Type Definitions ---
interface Profile {
  id: string;
  fname?: string;
  lname?: string;
}

interface ApprovalStep {
  id: string;
  step_no: number;
  role_id?: string | null;
  profile_id?: string | null;
}

interface AuditEvent {
  id: string;
  action: string;
  payload?: any;
  created_at: string;
  profiles?: Profile | Profile[];
  actor?: string; // ✅ Added
}

interface ApprovalRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  template_id?: string | null; // ✅ Added
  current_step_no: number;
  status: string;
  comments?: Array<{
    actor_profile_id: string;
    action: string;
    comment?: string;
    step_no: number;
    timestamp: string;
  }>;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- GET /api/approvals/[id]/history ---
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approvalId = params.id;

    // 1️⃣ Fetch main approval record
    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .select(
        "id, entity_type, entity_id, template_id, current_step_no, status, comments"
      ) // ✅ template_id added
      .eq("id", approvalId)
      .maybeSingle();

    if (approvalError || !approval)
      throw new Error("Approval record not found.");

    const parsedComments =
      (approval.comments as ApprovalRecord["comments"]) || [];

    // 2️⃣ Fetch audit events related to this approval
    const { data: auditData, error: auditError } = await supabase
      .from("audit_events")
      .select(
        `
        id,
        action,
        payload,
        created_at,
        profiles!audit_events_actor_profile_id_fkey (id, fname, lname)
      `
      )
      .eq("resource_id", approvalId)
      .order("created_at", { ascending: true });

    if (auditError) throw auditError;

    const audits = (auditData || []).map((a: any) => ({
      id: a.id,
      action: a.action,
      payload: a.payload,
      created_at: a.created_at,
      actor: Array.isArray(a.profiles)
        ? `${a.profiles[0]?.fname ?? ""} ${a.profiles[0]?.lname ?? ""}`.trim()
        : `${a.profiles?.fname ?? ""} ${a.profiles?.lname ?? ""}`.trim(),
    })) as AuditEvent[];

    // 3️⃣ Fetch all workflow steps for reference
    const { data: steps, error: stepsError } = await supabase
      .from("approval_steps")
      .select("id, step_no, role_id, profile_id")
      .eq("template_id", approval.template_id)
      .order("step_no", { ascending: true });

    if (stepsError) throw stepsError;

    // 4️⃣ Map comments to include actor details (optional)
    const actorIds = parsedComments.map((c) => c.actor_profile_id);
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, fname, lname")
      .in("id", actorIds);

    const commentsEnriched = parsedComments.map((c) => {
      const actor = actors?.find((a) => a.id === c.actor_profile_id);
      return {
        ...c,
        actor_name: actor
          ? `${actor.fname ?? ""} ${actor.lname ?? ""}`.trim()
          : "Unknown",
      };
    });

    // 5️⃣ Build unified timeline
    const timeline = [
      ...commentsEnriched.map((c) => ({
        type: "comment",
        action: c.action,
        actor: c.actor_name,
        step_no: c.step_no,
        timestamp: c.timestamp,
        details: c.comment || "",
      })),
      ...audits.map((a) => ({
        type: "audit",
        action: a.action,
        actor: a.actor || "System",
        timestamp: a.created_at,
        details: a.payload || {},
      })),
    ].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 6️⃣ Return formatted response
    return NextResponse.json({
      success: true,
      approval_id: approval.id,
      entity_type: approval.entity_type,
      entity_id: approval.entity_id,
      status: approval.status,
      current_step_no: approval.current_step_no,
      steps,
      timeline,
    });
  } catch (err: any) {
    console.error("Error fetching approval history:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
