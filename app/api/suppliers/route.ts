import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ must be service key
);

// ===================== POST =====================
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const company_name = formData.get("company_name") as string;
    const country = formData.get("country") as string;
    const registration_no = formData.get("registration_no") as string;
    const org_onboarded_to = formData.get("org_onboarded_to") as string;
    const metadataRaw = formData.get("metadata") as string;
    const categoriesRaw = formData.get("categories") as string;
    const documentsRaw = formData.get("documents") as string;
    const files = formData.getAll("files") as File[];

    if (!company_name || !org_onboarded_to) {
      return NextResponse.json(
        { error: "Missing required fields: company_name or org_onboarded_to" },
        { status: 400 }
      );
    }

    const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
    const contacts = metadata?.contacts || [];
    const categories = categoriesRaw ? JSON.parse(categoriesRaw) : [];
    const documents = documentsRaw ? JSON.parse(documentsRaw) : [];

    const supplierId = uuidv4();

    const { error: supplierErr } = await supabase.from("suppliers").insert([
      {
        id: supplierId,
        company_name,
        country,
        registration_no,
        org_onboarded_to,
        metadata,
        status: "pending",
      },
    ]);
    if (supplierErr) throw supplierErr;

    for (const c of contacts) {
      if (c.name || c.email) {
        const { error: contactErr } = await supabase.from("supplier_contacts").insert([
          {
            supplier_id: supplierId,
            title: c.name,
            email: c.email,
            phone: c.phone,
          },
        ]);
        if (contactErr) console.warn("⚠️ Contact insert failed:", contactErr);
      }
    }

    for (const catId of categories) {
      const { error: mapErr } = await supabase
        .from("supplier_category_map")
        .insert([{ supplier_id: supplierId, category_id: catId }]);
      if (mapErr) console.warn("⚠️ Category map failed:", mapErr);
    }

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const file = files[i];
      let fileUrl: string | null = null;
      let storagePath: string | null = null;

      if (file) {
        try {
          const ext = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;
          storagePath = `supplier_docs/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("supplier-documents")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
            });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("supplier-documents")
            .getPublicUrl(storagePath);
          fileUrl = publicUrlData?.publicUrl || null;
        } catch (uploadErr: any) {
          console.error("❌ File upload failed:", uploadErr.message);
        }
      }

      const { error: docErr } = await supabase.from("supplier_documents").insert([
        {
          supplier_id: supplierId,
          doc_type: doc.doc_type || "Unspecified",
          issued_by: doc.issued_by || "N/A",
          valid_from: doc.valid_from || null,
          valid_to: doc.valid_to || null,
          storage_path: storagePath,
          file_url: fileUrl,
          created_at: new Date().toISOString(),
        },
      ]);

      if (docErr) console.warn("⚠️ Failed to insert supplier_documents row", docErr);
    }

    return NextResponse.json(
      { success: true, message: "Supplier fully created", supplierId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ Supplier creation failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ===================== GET =====================
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_onboarded_to");
    const status = url.searchParams.get("status");
    const categoryId = url.searchParams.get("category_id"); // ✅ NEW

    // Base supplier query
    let query = supabase
      .from("suppliers")
      .select(
        "id, company_name, country, registration_no, status, org_onboarded_to, created_at"
      )
      .order("created_at", { ascending: false });

    if (orgId) query = query.eq("org_onboarded_to", orgId);
    if (status) query = query.eq("status", status);

    // ✅ If category filter is passed → only suppliers mapped to that category
    if (categoryId) {
      const { data: mappings, error: mapErr } = await supabase
        .from("supplier_category_map")
        .select("supplier_id")
        .eq("category_id", categoryId);

      if (mapErr) throw mapErr;

      const supplierIds = mappings?.map((m) => m.supplier_id) || [];
      if (supplierIds.length === 0)
        return NextResponse.json(
          { success: true, suppliers: [] },
          { status: 200 }
        );

      query = query.in("id", supplierIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, suppliers: data }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Supplier fetch failed:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
