// app/api/audit-log/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // keep existing client

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const resource_type = searchParams.get("entity") || searchParams.get("resource_type");
    const resource_id = searchParams.get("entity_id") || searchParams.get("resource_id");

    if (!resource_type || !resource_id) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("audit_events")
      .select("id, actor_profile_id, resource_type, resource_id, action, payload, created_at")
      .eq("resource_type", resource_type)
      .eq("resource_id", resource_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[GET /api/audit-log]", err);
    return NextResponse.json({ success: false, error: err.message || "Unknown error" }, { status: 500 });
  }
}
