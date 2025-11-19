import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/approvals/templates
 * Returns all templates for a given organization (optionally filter by is_default)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get("organization_id");
    const is_default = searchParams.get("is_default");

    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
    }

    const query = supabase
      .from("approval_templates")
      .select("id, name, description, is_default, created_at")
      .eq("organization_id", organization_id);

    if (is_default) query.eq("is_default", is_default === "true");

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      templates: data,
    });
  } catch (err: any) {
    console.error("Error fetching approval templates:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/approvals/templates
 * Creates a new approval template
 *
 * Body:
 * {
 *   "organization_id": "uuid",
 *   "name": "Auction Publish Template",
 *   "description": "Two-step approval (Buyer > Admin)",
 *   "is_default": true,
 *   "created_by": "profile_uuid"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { organization_id, name, description, is_default, created_by } = body;

    if (!organization_id || !name || !created_by) {
      return NextResponse.json(
        { error: "organization_id, name, and created_by are required" },
        { status: 400 }
      );
    }

    // Ensure unique name within organization
    const { data: existing } = await supabase
      .from("approval_templates")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An approval template with this name already exists" },
        { status: 409 }
      );
    }

    // Create template
    const { data, error } = await supabase
      .from("approval_templates")
      .insert([
        {
          organization_id,
          name,
          description,
          is_default: !!is_default,
          created_by,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Audit log entry
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "approval_template",
        resource_id: data.id,
        action: "created",
        payload: {
          organization_id,
          name,
          description,
          is_default,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Approval template created successfully",
      template: data,
    });
  } catch (err: any) {
    console.error("Error creating approval template:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
