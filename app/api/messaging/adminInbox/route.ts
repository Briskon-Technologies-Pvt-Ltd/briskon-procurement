import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        rfq_id,
        auction_id,
        supplier_id,
        last_message,
        last_message_at,
        unread_admin,
        suppliers:supplier_id (company_name),
        rfqs:rfq_id (title),
        auctions:auction_id (config)
      `)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    const result = (data || []).map((c: any) => ({
      id: c.id,
      rfq_id: c.rfq_id,
      auction_id: c.auction_id,
      supplier_id: c.supplier_id,
      supplier_name: c.suppliers?.company_name || "Supplier",

      rfq_name: c.rfqs?.title || null,
      auction_name: c.auctions?.config?.title || null,  // Extract title from JSON

      last_message: c.last_message,
      last_message_at: c.last_message_at,
      unread_admin: c.unread_admin,
    }));

    return NextResponse.json({ success: true, conversations: result });
  } catch (err: any) {
    console.error("Admin inbox error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
