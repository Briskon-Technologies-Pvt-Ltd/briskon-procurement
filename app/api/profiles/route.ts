// app/api/profiles/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // select only real columns from profiles table
    const { data, error } = await supabase
      .from("profiles")
      .select("id, fname, lname, phone, organization_id, metadata")
      .order("fname", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
