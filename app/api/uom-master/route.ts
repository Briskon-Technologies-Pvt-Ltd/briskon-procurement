import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET
export async function GET() {
  const { data, error } = await supabase
    .from("uom_master")
    .select("*")
    .order("uom_name", { ascending: true });

  if (error) return NextResponse.json({ success: false, error });
  return NextResponse.json({ success: true, data });
}

// POST
export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase.from("uom_master").insert([body]).select();

  if (error) return NextResponse.json({ success: false, error });
  return NextResponse.json({ success: true, data });
}

// PATCH
export async function PATCH(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase.from("uom_master")
    .update(body)
    .eq("id", body.id)
    .select();

  if (error) return NextResponse.json({ success: false, error });
  return NextResponse.json({ success: true, data });
}

// DELETE
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const { error } = await supabase.from("uom_master").delete().eq("id", id);
  if (error) return NextResponse.json({ success: false, error });

  return NextResponse.json({ success: true });
}
