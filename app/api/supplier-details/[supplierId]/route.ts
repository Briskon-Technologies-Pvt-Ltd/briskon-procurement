import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  context: { params: { supplierId: string } }
) {
  try {
    const { supplierId } = await context.params;  // ⭐ REQUIRED FIX

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "Missing supplierId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: supplier, error: supplierErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .single();

    if (supplierErr) throw supplierErr;

    const { data: contacts } = await supabase
      .from("supplier_contacts")
      .select("*")
      .eq("supplier_id", supplierId);

    const { data: documents } = await supabase
      .from("supplier_documents")
      .select("*")
      .eq("supplier_id", supplierId);

    const { data: mappings } = await supabase
      .from("supplier_category_map")
      .select("category_id")
      .eq("supplier_id", supplierId);

    const { data: categories } =
      mappings && mappings.length > 0
        ? await supabase
            .from("categories")
            .select("id,name")
            .in(
              "id",
              mappings.map((m: any) => m.category_id)
            )
        : { data: [], error: null };

    const { data: awards } = await supabase
      .from("awards")
      .select("*")
      .eq("supplier_id", supplierId);

    const { data: contracts } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("supplier_id", supplierId);

    return NextResponse.json(
      {
        success: true,
        supplier,
        contacts,
        documents,
        categories,
        awards,
        contracts,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 Supplier Detail API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
