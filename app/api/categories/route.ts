import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// ============ GET ALL CATEGORIES ============
export async function GET() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}

// ============ CREATE CATEGORY ============
export async function POST(req: Request) {
  const body = await req.json();
  const { name, code, description, parent_id } = body;

  const { data, error } = await supabase
    .from("categories")
    .insert([{ name, code, description, parent_id: parent_id || null }])
    .select();

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data: data[0] });
}

// ============ UPDATE CATEGORY ============
export async function PUT(req: Request) {
  const body = await req.json();
  const { id, name, code, description, parent_id } = body;

  const { data, error } = await supabase
    .from("categories")
    .update({ name, code, description, parent_id: parent_id || null })
    .eq("id", id)
    .select();

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data: data[0] });
}

// ============ DELETE CATEGORY ============
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID missing" });

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true });
}
