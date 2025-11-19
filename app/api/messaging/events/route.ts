// /app/api/messaging/events/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    // const url = new URL(req.url);
    // const supplierId = url.searchParams.get("supplier_id");
    // For now, we ignore supplier-specific visibility here (can refine later)

    const [{ data: rfqs, error: rfqErr }, { data: auctions, error: aucErr }] =
      await Promise.all([
        supabase
          .from("rfqs")
          .select("id, title")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("auctions")
          .select("id, config, status")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (rfqErr) throw rfqErr;
    if (aucErr) throw aucErr;

    const rfqOptions =
      rfqs?.map((r) => ({
        id: r.id as string,
        title: (r.title as string) ?? "Untitled RFQ",
      })) ?? [];

    const auctionOptions =
      auctions?.map((a) => {
        const cfg = a.config as any;
        return {
          id: a.id as string,
          title: cfg?.title || "Untitled auction",
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      rfqs: rfqOptions,
      auctions: auctionOptions,
    });
  } catch (err: any) {
    console.error("GET /api/messaging/events error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
