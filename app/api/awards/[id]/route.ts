import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/awards/[id]
 * Fetch detailed information for a specific award
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const awardId = resolvedParams.id;

    const { data, error } = await supabase
      .from("awards")
      .select(`
        *,
        suppliers (company_name, country, registration_no, status),
        profiles:awarded_by(fname, lname),
        purchase_orders (id, po_number, status, total_amount, currency),
        contracts (id, signed_at, effective_from, expires_at)
      `)
      .eq("id", awardId)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      award: data,
    });
  } catch (err: any) {
    console.error("Error fetching award:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/awards/[id]
 * Update award details — status or summary
 *
 * Body:
 * {
 *   "updated_by": "profile_uuid",
 *   "status": "acknowledged" | "cancelled" | "completed",
 *   "award_summary": "text (optional)"
 * }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const awardId = resolvedParams.id;
    const body = await req.json();
    const { updated_by, status, award_summary } = body;

    if (!updated_by || !status) {
      return NextResponse.json(
        { error: "updated_by and status are required" },
        { status: 400 }
      );
    }

    // Validate status transition
    const validStatuses = ["acknowledged", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Update award record
    const { data: updatedAward, error } = await supabase
      .from("awards")
      .update({
        status,
        award_summary,
        awarded_at: new Date().toISOString(),
      })
      .eq("id", awardId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: updated_by,
        resource_type: "award",
        resource_id: awardId,
        action: `award_${status}`,
        payload: { status, award_summary },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Award updated to '${status}' successfully`,
      award: updatedAward,
    });
  } catch (err: any) {
    console.error("Error updating award:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
