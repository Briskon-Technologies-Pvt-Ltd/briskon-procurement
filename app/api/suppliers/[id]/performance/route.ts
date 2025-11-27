import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET /api/suppliers/[id]/performance
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const supplierId = resolvedParams.id;

  try {
    if (!supplierId) {
      return NextResponse.json(
        { error: "Supplier ID is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch RFQs where supplier participated
    const { data: rfqSubs, error: rfqError } = await supabase
      .from("proposal_submissions")
      .select("id")
      .eq("supplier_id", supplierId);
    if (rfqError) throw rfqError;
    const totalRFQs = rfqSubs?.length || 0;

    // 2️⃣ Fetch total awards
    const { data: awardsData, error: awardsError } = await supabase
      .from("awards")
      .select("id, status")
      .eq("supplier_id", supplierId);
    if (awardsError) throw awardsError;
    const totalAwards = awardsData?.length || 0;

    // 3️⃣ Fetch active purchase orders / contracts
    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .select("id, status")
      .eq("supplier_id", supplierId)
      .in("status", ["created", "active"]);
    if (poError) throw poError;
    const activeContracts = poData?.length || 0;

    // 4️⃣ Calculate mock performance (for now, until integrated with delivery table)
    const onTime = 85 + Math.floor(Math.random() * 10); // random 85–95%
    const quality = 80 + Math.floor(Math.random() * 15); // random 80–95%

    // 5️⃣ Build response summary
    const data = {
      supplier_id: supplierId,
      total_rfqs: totalRFQs,
      total_awards: totalAwards,
      active_contracts: activeContracts,
      on_time_delivery: onTime,
      quality_score: quality,
      performance_chart: [
        { name: "RFQs", value: totalRFQs },
        { name: "Awards", value: totalAwards },
        { name: "Contracts", value: activeContracts },
      ],
    };

    // Optional: Audit log entry (non-blocking)
    await supabase.from("audit_events").insert([
      {
        resource_type: "supplier",
        resource_id: supplierId,
        action: "performance_viewed",
        payload: { metrics: data },
      },
    ]);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching supplier performance:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch performance" },
      { status: 500 }
    );
  }
}
