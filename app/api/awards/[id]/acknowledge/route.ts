import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/awards/[id]/acknowledge
 *
 * Body:
 * {
 *   "supplier_id": "uuid",
 *   "acknowledged_by": "profile_uuid",
 *   "comments": "optional text confirmation",
 *   "acknowledged_at": "optional timestamp (auto if missing)"
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const awardId = params.id;
    const body = await req.json();
    const { supplier_id, acknowledged_by, comments } = body;

    if (!supplier_id || !acknowledged_by) {
      return NextResponse.json(
        { error: "supplier_id and acknowledged_by are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Validate award belongs to this supplier
    const { data: award, error: fetchError } = await supabase
      .from("awards")
      .select("id, supplier_id, status")
      .eq("id", awardId)
      .single();

    if (fetchError) throw fetchError;
    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    if (award.supplier_id !== supplier_id) {
      return NextResponse.json(
        { error: "Supplier not authorized to acknowledge this award" },
        { status: 403 }
      );
    }

    if (award.status !== "issued") {
      return NextResponse.json(
        { error: "Only issued awards can be acknowledged" },
        { status: 400 }
      );
    }

    // 2️⃣ Update award status
    const { data: updatedAward, error: updateError } = await supabase
      .from("awards")
      .update({
        status: "acknowledged",
        award_summary: comments || "Supplier acknowledged the award.",
        awarded_at: new Date().toISOString(),
      })
      .eq("id", awardId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3️⃣ Record audit log
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: acknowledged_by,
        resource_type: "award",
        resource_id: awardId,
        action: "acknowledged_by_supplier",
        payload: {
          supplier_id,
          comments,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Award acknowledged successfully",
      award: updatedAward,
    });
  } catch (err: any) {
    console.error("Error acknowledging award:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
