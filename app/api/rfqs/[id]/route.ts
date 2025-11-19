// app/api/rfqs/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===================== GET /api/rfqs/:id =====================
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    // fetch rfq header
    const { data: rfq, error: rfqErr } = await supabase.from("rfqs").select("*").eq("id", id).single();
    if (rfqErr) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });

    // items
    const { data: items } = await supabase.from("rfq_items").select("*").eq("rfq_id", id).order("created_at", { ascending: true });

    // invitations
    const { data: invites } = await supabase
      .from("invitations")
      .select("id, supplier_id, invitee_email, token, status, sent_at, accepted_at")
      .eq("rfq_id", id);

    // files (owner_type = 'rfq')
    const { data: files } = await supabase
      .from("files")
      .select("*")
      .eq("owner_type", "rfq")
      .eq("owner_id", id)
      .order("uploaded_at", { ascending: false });

    return NextResponse.json({ success: true, data: { rfq, items, invites, files } }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/rfqs/:id error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch RFQ" }, { status: 500 });
  }
}

// ===================== PUT /api/rfqs/:id =====================
// Expect FormData for fields and optional files; only allowed when status = draft
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const formData = await req.formData();

    // fetch current rfq
    const { data: existing, error: existErr } = await supabase.from("rfqs").select("*").eq("id", id).single();
    if (existErr) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (existing.status !== "draft")
      return NextResponse.json({ error: "Only draft RFQs can be edited" }, { status: 400 });

    const title = (formData.get("title") as string) || existing.title;
    const summary = (formData.get("summary") as string) || existing.summary;
    const currency = (formData.get("currency") as string) || existing.currency;
    const language = (formData.get("language") as string) || existing.language;
    const visibility = (formData.get("visibility") as string) || existing.visibility;
    const itemsRaw = (formData.get("items") as string) || null; // JSON arr
    const created_by = (formData.get("created_by") as string) || existing.created_by;
    const files = formData.getAll("files") as File[] || [];

    // update RFQ header
    const { error: updErr } = await supabase.from("rfqs").update({
      title, summary, currency, language, visibility, updated_at: new Date().toISOString()
    }).eq("id", id);
    if (updErr) console.warn("rfq update warning:", updErr);

    // update items: simplest approach - delete existing and re-insert from itemsRaw (safe for draft)
    if (itemsRaw) {
      let itemsArr = [];
      try { itemsArr = JSON.parse(itemsRaw); } catch (e) { itemsArr = []; }
      // delete existing
      const { error: delErr } = await supabase.from("rfq_items").delete().eq("rfq_id", id);
      if (delErr) console.warn("Failed to delete old rfq_items:", delErr);
      if (itemsArr.length) {
        const toInsert = itemsArr.map((it: any) => ({
          id: uuidv4(),
          rfq_id: id,
          description: it.description || null,
          qty: it.qty ?? null,
          uom: it.uom || null,
          spec: it.spec || null,
          estimated_value: it.estimated_value ?? null,
          created_at: new Date().toISOString(),
        }));
        const { error: itemsInsertErr } = await supabase.from("rfq_items").insert(toInsert);
        if (itemsInsertErr) console.warn("Failed to insert rfq_items on update:", itemsInsertErr);
      }
    }

    // handle files (upload + file metadata) same as create
    if (files && files.length) {
      for (const file of files) {
        try {
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}_${(file as any).name}`;
          const storagePath = `${id}/${filename}`;
          // @ts-ignore
          const { error: uploadErr } = await supabase.storage.from("rfq-documents").upload(storagePath, file as any, {
            cacheControl: "3600",
            upsert: false,
            contentType: (file as any).type || "application/octet-stream",
          });
          if (uploadErr) {
            console.warn("File upload error:", uploadErr);
            continue;
          }
          const { data: publicUrlData } = supabase.storage.from("rfq-documents").getPublicUrl(storagePath);
          const publicUrl = publicUrlData?.publicUrl || null;

          const fileId = uuidv4();
          const { error: fileInsertErr } = await supabase.from("files").insert([
            {
              id: fileId,
              owner_type: "rfq",
              owner_id: id,
              storage_path: storagePath,
              filename: (file as any).name,
              content_type: (file as any).type || null,
              size: (file as any).size || null,
              uploaded_by: created_by,
              uploaded_at: new Date().toISOString(),
              file_url: publicUrl,
            },
          ]);
          if (fileInsertErr) console.warn("Failed to insert files metadata on update:", fileInsertErr);
        } catch (ferr) {
          console.warn("file handling error on update:", ferr);
        }
      }
    }

    return NextResponse.json({ success: true, message: "RFQ updated", rfqId: id }, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/rfqs/:id error:", err);
    return NextResponse.json({ error: err.message || "Failed to update RFQ" }, { status: 500 });
  }
}

// ===================== DELETE /api/rfqs/:id =====================
// perform soft-delete (set status = archived)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { data: rfq, error: rfqErr } = await supabase.from("rfqs").select("status").eq("id", id).single();
    if (rfqErr) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });

    const { error: updErr } = await supabase.from("rfqs").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    if (updErr) throw updErr;

    return NextResponse.json({ success: true, message: "RFQ archived", rfqId: id }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/rfqs/:id error:", err);
    return NextResponse.json({ error: err.message || "Failed to archive RFQ" }, { status: 500 });
  }
}
