import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("id, code, name, is_active, organization_id")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const { organization_id, code, name, is_active } = body;
    const { data, error } = await supabase
      .from("departments")
      .insert([{ organization_id, code, name, is_active }])
      .select();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function PATCH(req: Request) {
  const body = await req.json();
  try {
    const { id, ...fields } = body;
    const { error } = await supabase.from("departments").update(fields).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "Missing ID" });
  try {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
