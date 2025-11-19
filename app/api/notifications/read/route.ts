import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/notifications/read
export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || !ids.length)
      throw new Error("Notification IDs required");

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Marked ${ids.length} notifications as read`,
    });
  } catch (err: any) {
    console.error("Error marking notifications as read:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
