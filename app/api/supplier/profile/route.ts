import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/supplier/profile?supplier_id=...
 * Returns combined supplier profile overview
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const supplierId = url.searchParams.get("supplier_id");

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplier_id required" },
        { status: 400 }
      );
    }

    // 1) Supplier core info
    const { data: supplierRaw, error: supplierErr } = await supabase
      .from("suppliers")
      .select(
        `
        id,
        company_name,
        country,
        registration_no,
        status,
        org_onboarded_to,
        metadata,
        created_at,
        organizations ( name )
      `
      )
      .eq("id", supplierId)
      .maybeSingle();

    if (supplierErr) throw supplierErr;
    if (!supplierRaw) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    const supplier: any = supplierRaw;

    // Extract onboarded org name safely (array or null)
    const onboardedOrgName =
      Array.isArray(supplier.organizations) &&
      supplier.organizations.length > 0
        ? supplier.organizations[0].name
        : null;

    // 2) Contacts (primary contact = first created)
    const { data: contacts, error: contactsErr } = await supabase
      .from("supplier_contacts")
      .select("id, title, phone, email, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: true });

    if (contactsErr) throw contactsErr;
    const primaryContact = contacts && contacts.length > 0 ? contacts[0] : null;

    // 3) Categories via join table
    const { data: categoryRows, error: catErr } = await supabase
      .from("supplier_category_map")
      .select(
        `
        category_id,
        categories ( id, name )
      `
      )
      .eq("supplier_id", supplierId);

    if (catErr) throw catErr;

    const categories =
      categoryRows?.map((row: any) => ({
        id: row.category_id as string,
        name: row.categories?.name as string,
      })) ?? [];

    // All categories for selector (for edit mode)
    const { data: allCategories, error: allCatErr } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (allCatErr) throw allCatErr;

    // 4) Documents
    const { data: documents, error: docsErr } = await supabase
      .from("supplier_documents")
      .select(
        `
        id,
        doc_type,
        issued_by,
        valid_from,
        valid_to,
        file_url,
        storage_path,
        created_at
      `
      )
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });

    if (docsErr) throw docsErr;

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          company_name: supplier.company_name,
          country: supplier.country,
          registration_no: supplier.registration_no,
          status: supplier.status,
          onboarded_org_name: onboardedOrgName,
          metadata: supplier.metadata ?? null,
          created_at: supplier.created_at,
        },
        primary_contact: primaryContact,
        contacts: contacts ?? [],
        categories,
        all_categories: allCategories ?? [],
        documents: documents ?? [],
      },
    });
  } catch (err: any) {
    console.error(
      "GET /api/supplier/profile error:",
      err?.message || err
    );
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
