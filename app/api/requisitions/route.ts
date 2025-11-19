import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------
   ✅ Centralized Audit Logging Helper
------------------------------------------------------ */
async function logAuditEvent(
  actor_profile_id: string,
  resource_type: string,
  resource_id: string,
  action: string,
  payload: any = {}
) {
  try {
    const { error } = await supabase.from("audit_events").insert([
      {
        actor_profile_id,
        resource_type,
        resource_id,
        action,
        payload,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) console.error("❌ Audit insert error:", error.message);
  } catch (err: any) {
    console.error("🚨 Audit logging failed:", err.message);
  }
}

// ---------- GET ----------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // =====================================================
    // GET SINGLE REQUISITION (DETAIL VIEW)
    // =====================================================
    if (id) {
      const { data, error } = await supabase
        .from("requisitions")
        .select(
          `
          id, organization_id, requested_by, description, estimated_value, currency,
          status, created_at, submitted_at, approved_at, approved_by, rejected_at,
          rejected_by, reject_reason, department_id, cost_center_id,
          category_id, subcategory_id, attachments,
          profiles:profiles!requested_by(fname, lname),
          departments:departments(name),
          cost_centers:cost_centers(code, name),
          category:categories!requisitions_category_id_fkey(name),
          subcategory:categories!requisitions_subcategory_id_fkey(name)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // =====================================================
    // GET ALL REQUISITIONS (LIST VIEW)
    // =====================================================
    const { data, error } = await supabase
      .from("requisitions")
      .select(
        `
        id, description, cost_center_id, department_id,
        estimated_value, currency, status, created_at, attachments,
        profiles:profiles!requested_by(fname, lname),
        departments:departments(name),
        cost_centers:cost_centers(code, name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[GET /api/requisitions]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ---------- POST (CREATE) ----------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      organization_id,
      requested_by,
      department_id,
      cost_center_id,
      category_id,
      subcategory_id,
      description,
      estimated_value,
      currency,
      attachments = [],
    } = body;

    // Validate requester
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, metadata")
      .eq("id", requested_by)
      .maybeSingle();

    if (!profile) throw new Error("Requester profile not found");

    const isAdmin = profile.metadata?.role === "admin";
    const status = isAdmin ? "pending" : "draft";

    // ✅ Create requisition record with all new fields and attachments
    const { data, error } = await supabase
      .from("requisitions")
      .insert([
        {
          organization_id,
          requested_by: profile.id,
          department_id: department_id || null,
          cost_center_id: cost_center_id || null,
          category_id: category_id || null,
          subcategory_id: subcategory_id || null,
          description: description?.trim() || "",
          estimated_value: estimated_value ? Number(estimated_value) : null,
          currency: currency || "USD",
          attachments, // ← store all uploaded file metadata
          status,
          submitted_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;

    // ✅ Audit entry
    await logAuditEvent(profile.id, "requisition", data.id, "create", {
      status,
      attachments_count: attachments.length,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[POST /api/requisitions]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------
   ✅ PATCH — Approve, Reject, Update
------------------------------------------------------ */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, actor_id, comments, fields } = body;

    let update = {};
    let payload = {};

    if (action === "approve") {
      update = {
        status: "approved",
        approved_by: actor_id,
        approved_at: new Date().toISOString(),
      };
      payload = { note: "approved" };
    } else if (action === "reject") {
      update = {
        status: "rejected",
        rejected_by: actor_id,
        rejected_at: new Date().toISOString(),
        reject_reason: comments || null,
      };
      payload = { reason: comments || null };
    } else if (action === "update") {
      update = fields || {};
      payload = { fields };
    }

    const { error } = await supabase.from("requisitions").update(update).eq("id", id);
    if (error) throw error;

    await logAuditEvent(actor_id, "requisition", id, action, payload);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PATCH /api/requisitions]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
