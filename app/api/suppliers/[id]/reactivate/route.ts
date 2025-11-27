import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/suppliers/[id]/reactivate
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json().catch(() => ({}));

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        status: "approved",
        metadata: {
          ...(body?.metadata || {}),
          reactivated_at: new Date().toISOString(),
          reactivated_by: body?.actor_profile_id || null,
        },
      })
      .eq("id", resolvedParams.id)
      .select()
      .single();

    if (error) throw error;

    // Log audit trail
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: body?.actor_profile_id ?? null,
        resource_type: "supplier",
        resource_id: resolvedParams.id,
        action: "reactivated",
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Supplier reactivated successfully",
      supplier: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
