import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ======================================================
//                     📌 POST (CREATE RFQ)
// ======================================================
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const title = (formData.get("title") as string) || "";
    const summary = (formData.get("summary") as string) || "";
    const currency = (formData.get("currency") as string) || "USD";
    const visibility = (formData.get("visibility") as string) || "invited";
    const organization_id = formData.get("organization_id") as string;
    const created_by = formData.get("created_by") as string | null;
    const requisition_id = formData.get("requisition_id") as string | null;

    const items = JSON.parse((formData.get("items") as string) || "[]");
    const invitedSupplierIds = JSON.parse(
      (formData.get("invited_supplier_ids") as string) || "[]"
    );

    const files = formData.getAll("files") as File[];

    if (!organization_id || !title)
      return NextResponse.json(
        { success: false, error: "Missing organization_id or title" },
        { status: 400 }
      );

    const rfqId = uuidv4();
    const uploadedDocs: any[] = [];

    // ---------- Upload docs ----------
    for (const file of files) {
      try {
        const ext = file.name.split(".").pop();
        const storagePath = `rfq_docs/${Date.now()}_${uuidv4()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("rfq-documents")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("rfq-documents")
          .getPublicUrl(storagePath);

        uploadedDocs.push({
          file_name: file.name,
          file_url: data?.publicUrl || null,
          storage_path: storagePath,
          uploaded_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn("⚠️ File upload failed:", e.message);
      }
    }

    // ---------- Insert RFQ ----------
    await supabase.from("rfqs").insert([
      {
        id: rfqId,
        organization_id,
        created_by,
        requisition_id,
        title,
        summary,
        currency,
        visibility,
        status: "draft",
        rfq_documents: uploadedDocs,
        created_at: new Date().toISOString(),
      },
    ]);

    // ---------- Insert items ----------
    if (items.length) {
      await supabase.from("rfq_items").insert(
        items.map((i: any) => ({
          id: uuidv4(),
          rfq_id: rfqId,
          description: i.description,
          qty: i.qty,
          uom: i.uom,
          estimated_value: i.estimated_value,
          created_at: new Date().toISOString(),
        }))
      );
    }

    // ---------- Insert invited suppliers ----------
    if (invitedSupplierIds.length) {
      await supabase.from("rfq_invited_suppliers").insert(
        invitedSupplierIds.map((sid: string) => ({
          id: uuidv4(),
          rfq_id: rfqId,
          supplier_id: sid,
          invited_at: new Date().toISOString(),
        }))
      );
    }

    return NextResponse.json(
      { success: true, rfqId, message: "RFQ created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("❌ POST RFQ error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ======================================================
//                     📌 GET (LIST + DETAIL)
// ======================================================
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // ======================================================
    //            📄 SINGLE RFQ VIEW (WITH AWARD DATA)
// ======================================================
    if (id) {
      const { data: rfq, error } = await supabase
        .from("rfqs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!rfq)
        return NextResponse.json(
          { success: false, error: "RFQ not found" },
          { status: 404 }
        );

      const { data: items } = await supabase
        .from("rfq_items")
        .select("id, description, qty, uom, estimated_value")
        .eq("rfq_id", id);

      const { data: invites } = await supabase
        .from("rfq_invited_suppliers")
        .select("supplier_id")
        .eq("rfq_id", id);

      let suppliers: any[] = [];
      if (invites?.length) {
        const supplierIds = invites.map((i: any) => i.supplier_id);

        const { data: sData } = await supabase
          .from("suppliers")
          .select("id, company_name, country")
          .in("id", supplierIds);

        const { data: cData } = await supabase
          .from("supplier_contacts")
          .select("supplier_id, email, phone")
          .in("supplier_id", supplierIds);

        suppliers = (sData || []).map((s) => ({
          ...s,
          contacts: (cData || []).filter((c) => c.supplier_id === s.id),
        }));
      }

      // 🔥 Load award data for this RFQ
      const { data: awardData } = await supabase
        .from("awards")
        .select("supplier_id, awarded_at")
        .eq("rfq_id", id)
        .maybeSingle();

      return NextResponse.json(
        {
          success: true,
          rfq: {
            ...rfq,
            rfq_items: items || [],
            invited_suppliers: suppliers,
            items_count: items?.length || 0,
            invited_suppliers_count: suppliers.length,
            rfq_documents: rfq.rfq_documents || [],
            awarded_supplier_id: awardData?.supplier_id || null,
            awarded_at: awardData?.awarded_at || null,
          },
        },
        { status: 200 }
      );
    }

    // ======================================================
    //            📄 LIST ALL RFQs (SUPER FAST)
    // ======================================================
    const { data: rfqs, error } = await supabase
      .from("rfqs")
      .select("id, title, organization_id, status, visibility, currency, created_at, end_at, requisition_id")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!rfqs.length)
      return NextResponse.json({ success: true, rfqs: [] }, { status: 200 });

    const rfqIds = rfqs.map((r) => r.id);

    const { data: itemsCountData } = await supabase
      .from("rfq_items")
      .select("rfq_id, id");

    const itemCountMap: Record<string, number> = {};
    itemsCountData?.forEach((r) => {
      itemCountMap[r.rfq_id] = (itemCountMap[r.rfq_id] || 0) + 1;
    });

    const { data: inviteCountData } = await supabase
      .from("rfq_invited_suppliers")
      .select("rfq_id, id");

    const inviteCountMap: Record<string, number> = {};
    inviteCountData?.forEach((r) => {
      inviteCountMap[r.rfq_id] = (inviteCountMap[r.rfq_id] || 0) + 1;
    });

    const { data: proposalCountData } = await supabase
      .from("proposal_submissions")
      .select("rfq_id, id");

    const proposalCountMap: Record<string, number> = {};
    proposalCountData?.forEach((r) => {
      proposalCountMap[r.rfq_id] = (proposalCountMap[r.rfq_id] || 0) + 1;
    });

    const enriched = rfqs.map((r) => ({
      ...r,
      items_count: itemCountMap[r.id] || 0,
      invited_suppliers_count: inviteCountMap[r.id] || 0,
      received_proposals: proposalCountMap[r.id] || 0,
    }));

    return NextResponse.json({ success: true, rfqs: enriched }, { status: 200 });
  } catch (err: any) {
    console.error("❌ GET RFQs error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ======================================================
//                     📌 PATCH
// ======================================================
export async function PATCH(req: Request) {
  try {
    const { id, action, fields } = await req.json();
    if (!id) throw new Error("Missing RFQ ID");

    let update: any = {};
    if (action === "publish")
      update = { status: "published", published_at: new Date().toISOString() };
    else if (action === "archive") update = { status: "archived" };
    else if (action === "convert_to_auction")
      update = { status: "converted_to_auction" };
    else if (action === "update") update = fields;
    else throw new Error("Unsupported action");

    await supabase.from("rfqs").update(update).eq("id", id);

    return NextResponse.json(
      { success: true, message: "RFQ updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ PATCH RFQs error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
