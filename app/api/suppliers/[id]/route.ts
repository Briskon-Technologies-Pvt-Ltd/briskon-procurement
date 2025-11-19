import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/suppliers/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, supplier: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/suppliers/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const updateFields = ["company_name", "country", "registration_no", "status", "metadata"];
    const updates: Record<string, any> = {};

    updateFields.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    const { data, error } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully",
      supplier: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
