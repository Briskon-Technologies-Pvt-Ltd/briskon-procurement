import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  const { po_id, status } = await req.json();

  if (!po_id || !status) {
    return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
  }

  // Update PO status
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", po_id);

  if (error) {
    console.error("PO status update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Optionally update related award status
  if (status === "fulfilled") {
    await supabase.from("awards").update({ status: "completed" }).eq("id",
      supabase.from("purchase_orders").select("award_id").eq("id", po_id)
    );
  } else if (status === "cancelled") {
    await supabase.from("awards").update({ status: "cancelled" }).eq("id",
      supabase.from("purchase_orders").select("award_id").eq("id", po_id)
    );
  }

  return NextResponse.json({ success: true });
}
