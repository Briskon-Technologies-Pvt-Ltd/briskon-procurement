import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/suppliers/[id]/reject
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const supplierId = resolvedParams.id;

    // Optional rejection reason and user
    const body = await req.json().catch(() => ({}));
    const rejected_by = body?.rejected_by ?? null;
    const reason = body?.reason ?? "No reason provided";

    // Update supplier status
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        status: "rejected",
        metadata: {
          ...(body?.metadata || {}),
          rejected_at: new Date().toISOString(),
          rejected_by,
          rejection_reason: reason,
        },
      })
      .eq("id", supplierId)
      .select()
      .single();

    if (error) throw error;

    // Optional audit log
    await supabase.from("audit_events").insert([
      {
        entity: "supplier",
        entity_id: supplierId,
        action: "rejected",
        performed_by: rejected_by,
        details: { reason },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Supplier rejected successfully",
      supplier: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
