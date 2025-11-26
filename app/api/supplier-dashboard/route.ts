import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // --------- 1. Base suppliers ---------
    const { data: suppliers, error: suppliersErr } = await supabase
      .from("suppliers")
      .select(`
        id,
        company_name,
        country,
        billing_address,
        registration_no,
        status,
        metadata,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (suppliersErr) throw suppliersErr;

    const supplierIds = suppliers.map((s) => s.id);
    if (supplierIds.length === 0) {
      return NextResponse.json(
        { success: true, suppliers: [], registrationTrends: [] },
        { status: 200 }
      );
    }

    // --------- 2. Contacts ---------
    const { data: contacts } = await supabase
      .from("supplier_contacts")
      .select("supplier_id, title, email, phone")
      .in("supplier_id", supplierIds);

    // --------- 3. Category mapping + categories ---------
    const { data: mappings } = await supabase
      .from("supplier_category_map")
      .select("supplier_id, category_id")
      .in("supplier_id", supplierIds);

    const categoryIds = [
      ...new Set((mappings || []).map((m: any) => m.category_id).filter(Boolean)),
    ];

    const { data: categories } =
      categoryIds.length > 0
        ? await supabase
            .from("categories")
            .select("id, name")
            .in("id", categoryIds)
        : { data: [], error: null };

    // --------- 4. Documents ---------
    const { data: documents } = await supabase
      .from("supplier_documents")
      .select(
        "supplier_id, doc_type, file_url, issued_by, valid_from, valid_to"
      )
      .in("supplier_id", supplierIds);

    // --------- 5. Awards (for counts) ---------
    const { data: awards } = await supabase
      .from("awards")
      .select("supplier_id")
      .in("supplier_id", supplierIds);

    // --------- 6. Purchase orders (contracts) ---------
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("supplier_id, status")
      .in("supplier_id", supplierIds);

    // --------- 7. Build registration trends (date-wise) ---------
    const trendsMap = new Map<string, number>();

    suppliers.forEach((s) => {
      if (!s.created_at) return;
      const dateKey = new Date(s.created_at).toISOString().slice(0, 10); // YYYY-MM-DD
      trendsMap.set(dateKey, (trendsMap.get(dateKey) || 0) + 1);
    });

    const registrationTrends = Array.from(trendsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    // --------- 8. Merge everything into final suppliers ---------
    const suppliersFinal = suppliers.map((s) => {
      const supplierContacts = (contacts || []).filter(
        (c: any) => c.supplier_id === s.id
      );

      const supplierDocs = (documents || []).filter(
        (d: any) => d.supplier_id === s.id
      );

      const supplierMapping = (mappings || []).filter(
        (m: any) => m.supplier_id === s.id
      );
      const supplierCategoryIds = supplierMapping.map((m: any) => m.category_id);

      const supplierCategories = (categories || []).filter((c: any) =>
        supplierCategoryIds.includes(c.id)
      );

      const supplierAwardsCount = (awards || []).filter(
        (a: any) => a.supplier_id === s.id
      ).length;

      const supplierActiveContractsCount = (pos || []).filter(
        (p: any) => p.supplier_id === s.id && p.status === "active"
      ).length;

      // ---- Risk logic (ONLY based on documents) ----
      const now = new Date();
      const hasDocs = supplierDocs.length > 0;
      const hasExpiredDoc = supplierDocs.some((d: any) => {
        if (!d.valid_to) return false;
        const vt = new Date(d.valid_to);
        return vt < now;
      });

      const risk = !hasDocs || hasExpiredDoc ? "High" : "Low";

      // Rating, RFQ etc only from metadata if present (no hardcoded defaults)
      const md: any = s.metadata || {};
      const rating =
        typeof md.rating === "number" && !isNaN(md.rating) ? md.rating : null;
      const totalRFQs =
        typeof md.totalRFQs === "number" && !isNaN(md.totalRFQs)
          ? md.totalRFQs
          : 0;
      const totalAwards = supplierAwardsCount;
      const activeContracts = supplierActiveContractsCount;

      return {
        id: s.id,
        name: s.company_name,
        country: s.country,
        billing_address:s.billing_address,
        registration_no: s.registration_no,
        status: s.status,
        metadata: md,
        created_at: s.created_at,

        contacts: supplierContacts,
        categories: supplierCategories.map((c: any) => c.name),
        documents: supplierDocs,

        risk, // "Low" | "High"
        rating,
        totalRFQs,
        totalAwards,
        activeContracts,
      };
    });

    return NextResponse.json(
      { success: true, suppliers: suppliersFinal, registrationTrends },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 Supplier dashboard API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
