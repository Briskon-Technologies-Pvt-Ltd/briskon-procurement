import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/notifications/unread?profile_id=<uuid>
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profile_id");
    if (!profileId) throw new Error("profile_id is required");

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", profileId)
      .eq("is_read", false);

    if (error) throw error;

    return NextResponse.json({ success: true, unread_count: count || 0 });
  } catch (err: any) {
    console.error("Error counting unread notifications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
