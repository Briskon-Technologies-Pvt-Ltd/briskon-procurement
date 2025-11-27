import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/suppliers/[id]/approve
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const supplierId = resolvedParams.id;

    // Optional: read approver info from body (for audit trail)
    const body = await req.json().catch(() => ({}));
    const approved_by = body?.approved_by ?? null;

    // Update supplier status
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        status: "approved",
        metadata: {
          ...(body?.metadata || {}),
          approved_at: new Date().toISOString(),
          approved_by,
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
        action: "approved",
        performed_by: approved_by,
        details: { message: "Supplier approved successfully" },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Supplier approved successfully",
      supplier: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
