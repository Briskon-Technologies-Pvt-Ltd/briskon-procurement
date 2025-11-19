import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/audits
 * 
 * Query params:
 *   resource_type (required)  - e.g. 'supplier', 'auction'
 *   resource_id   (required)  - UUID of that resource
 *   action        (optional)  - e.g. 'approved'
 *   limit         (optional)  - default 20
 *   offset        (optional)  - pagination start
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const resourceType = url.searchParams.get("resource_type");
    const resourceId = url.searchParams.get("resource_id");
    const action = url.searchParams.get("action");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "Both resource_type and resource_id are required." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("audit_events")
      .select(
        `
        id,
        actor_profile_id,
        resource_type,
        resource_id,
        action,
        payload,
        created_at
      `
      )
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq("action", action);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(
      { success: true, count: data?.length || 0, records: data },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/audits
 * 
 * Body params:
 *   actor_profile_id (required)
 *   resource_type    (required)
 *   resource_id      (required)
 *   action           (required)
 *   payload          (optional)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actor_profile_id, resource_type, resource_id, action, payload } = body;

    if (!actor_profile_id || !resource_type || !resource_id || !action) {
      return NextResponse.json(
        {
          error:
            "actor_profile_id, resource_type, resource_id, and action are required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("audit_events")
      .insert([
        {
          actor_profile_id,
          resource_type,
          resource_id,
          action,
          payload,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: "Audit event recorded.", audit: data },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
