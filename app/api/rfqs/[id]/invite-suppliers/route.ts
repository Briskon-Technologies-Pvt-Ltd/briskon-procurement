import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/rfqs/[id]/invite-suppliers
 * body:
 * {
 *   "supplier_ids": ["uuid", ...],            // optional
 *   "supplier_group_id": "uuid",              // optional
 *   "invited_by": "profile_uuid",
 *   "message": "optional message"
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const rfqId = params.id;
    const body = await req.json();

    if (!body?.supplier_ids && !body?.supplier_group_id) {
      return NextResponse.json({ error: "supplier_ids or supplier_group_id required" }, { status: 400 });
    }

    const invitedBy = body.invited_by ?? null;
    const message = body.message ?? null;

    let inserted: any = null;
    let warning: string | null = null;

    // Attempt to insert into a standard 'invitations' table if present.
    // The invitations table may have columns like:
    // (id, rfq_id, supplier_id, supplier_group_id, invited_by, status, created_at)
    try {
      const rowsToInsert = [];

      if (Array.isArray(body.supplier_ids) && body.supplier_ids.length > 0) {
        for (const sid of body.supplier_ids) {
          rowsToInsert.push({
            rfq_id: rfqId,
            supplier_id: sid,
            supplier_group_id: null,
            invited_by: invitedBy,
            status: "pending",
            message,
          });
        }
      } else if (body.supplier_group_id) {
        // Insert a row linking group -> rfq (some designs use a single row)
        rowsToInsert.push({
          rfq_id: rfqId,
          supplier_id: null,
          supplier_group_id: body.supplier_group_id,
          invited_by: invitedBy,
          status: "pending",
          message,
        });
      }

      if (rowsToInsert.length > 0) {
        const { data, error } = await supabase.from("invitations").insert(rowsToInsert).select();
        if (!error) inserted = data;
        else {
          // If invitations table structure differs, capture warning and continue
          warning = `invitation insert error: ${error.message}`;
        }
      }
    } catch (e: any) {
      // probably invitations table doesn't exist or different shape
      warning = `invitation insert failed: ${e?.message ?? String(e)}`;
    }

    // Always create an audit event (using audit_events schema you provided)
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: invitedBy,
        resource_type: "rfq",
        resource_id: rfqId,
        action: "invited_suppliers",
        payload: {
          supplier_ids: body.supplier_ids ?? null,
          supplier_group_id: body.supplier_group_id ?? null,
          message,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Invitation processed",
      invitations: inserted,
      warning,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
