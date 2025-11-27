import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- Type Definitions ---
interface Profile {
  id: string;
  fname?: string;
  lname?: string;
}

interface Role {
  id: string;
  name: string;
}

interface Step {
  id: string;
  step_no: number;
  roles?: Role | Role[] | null;
  profiles?: Profile | Profile[] | null;
}

interface Template {
  id: string;
  name: string;
  description?: string;
}

interface Approval {
  id: string;
  entity_type: string;
  entity_id: string;
  template_id: string;
  current_step_no: number;
  status: string;
  created_by?: string;
  created_at: string;
  acted_at?: string;
  comments?: any[];
  approval_templates?: Template | Template[];
  profiles?: Profile | Profile[];
}

interface AuditEvent {
  id: string;
  action: string;
  payload?: any;
  created_at: string;
  profiles?: Profile | Profile[];
}

// --- Supabase Client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Main Route ---
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const approvalId = resolvedParams.id;

    // 1️⃣ Fetch the main approval record
    const { data: approvalData, error: approvalError } = await supabase
      .from("approvals")
      .select(
        `
        id,
        entity_type,
        entity_id,
        template_id,
        current_step_no,
        status,
        created_by,
        created_at,
        acted_at,
        comments,
        approval_templates (id, name, description),
        profiles!approvals_created_by_fkey (id, fname, lname)
      `
      )
      .eq("id", approvalId)
      .maybeSingle();

    if (approvalError || !approvalData)
      throw new Error("Approval not found");

    const approval = approvalData as Approval;

    // 2️⃣ Fetch steps for the template
    const { data: stepsData, error: stepsError } = await supabase
      .from("approval_steps")
      .select(
        `
        id,
        step_no,
        roles (id, name),
        profiles (id, fname, lname)
      `
      )
      .eq("template_id", approval.template_id)
      .order("step_no", { ascending: true });

    if (stepsError) throw stepsError;

    // --- Flatten roles & profiles arrays ---
    const steps = (stepsData || []).map((s: any) => ({
      ...s,
      roles: Array.isArray(s.roles) ? s.roles[0] : s.roles,
      profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
    })) as Step[];

    // 3️⃣ Fetch audit events
    const { data: auditsData, error: auditsError } = await supabase
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

    if (auditsError) throw auditsError;

    const audits = (auditsData || []).map((a: any) => ({
      ...a,
      profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
    })) as AuditEvent[];

    // --- Flatten nested single-record relations ---
    const template = Array.isArray(approval.approval_templates)
      ? approval.approval_templates[0]
      : approval.approval_templates;

    const creator = Array.isArray(approval.profiles)
      ? approval.profiles[0]
      : approval.profiles;

    // 4️⃣ Determine current approver (based on step)
    const currentStep = steps.find(
      (s) => s.step_no === approval.current_step_no
    );

    const nextApprover =
      currentStep?.profiles || currentStep?.roles
        ? {
          role: (currentStep.roles as Role)?.name ?? null,
          profile: (currentStep.profiles as Profile)
            ? `${(currentStep.profiles as Profile)?.fname ?? ""} ${(currentStep.profiles as Profile)?.lname ?? ""
              }`.trim()
            : null,
        }
        : null;

    // 5️⃣ Construct structured response
    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        entity_type: approval.entity_type,
        entity_id: approval.entity_id,
        status: approval.status,
        current_step_no: approval.current_step_no,
        current_approver: nextApprover,
        template: {
          id: template?.id ?? null,
          name: template?.name ?? null,
          description: template?.description ?? null,
        },
        started_by: {
          id: creator?.id ?? null,
          name: `${creator?.fname ?? ""} ${creator?.lname ?? ""}`.trim(),
        },
        started_at: approval.created_at,
        acted_at: approval.acted_at,
        comments: approval.comments ?? [],
        steps,
        audits,
      },
    });
  } catch (err: any) {
    console.error("Error fetching approval details:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
