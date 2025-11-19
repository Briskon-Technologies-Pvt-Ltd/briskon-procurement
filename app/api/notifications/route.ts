import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/notifications
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profile_id"); // optional filter
    const limit = Number(searchParams.get("limit") || 30);

    let query = supabase
      .from("notifications")
      .select(
        `
        id,
        related_entity,
        entity_id,
        message,
        type,
        is_read,
        created_at,
        read_at,
        recipient_profile_id,
        profiles:recipient_profile_id (fname, lname)
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (profileId) query = query.eq("recipient_profile_id", profileId);

    const { data, error } = await query;
    if (error) throw error;

    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      message: n.message,
      entity_type: n.related_entity,
      entity_id: n.entity_id,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
      read_at: n.read_at,
      recipient: `${n.profiles?.fname ?? ""} ${n.profiles?.lname ?? ""}`.trim(),
    }));

    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
