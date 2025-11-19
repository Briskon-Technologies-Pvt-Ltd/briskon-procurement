// /app/api/auctions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "auction-documents";

function nowISO() {
  return new Date().toISOString();
}

function ensureUUID(val: any): string | null {
  if (!val || typeof val !== "string") return null;
  const v = val.trim();
  const r = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return r.test(v) ? v : null;
}

/* ============================================================
   GET → List or Single Auction
============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    /* --------------------------------------------------------
       1) GET SINGLE AUCTION
    -------------------------------------------------------- */
    if (id) {
      const auctionId = ensureUUID(id);
      if (!auctionId)
        return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

      // Fetch auction
      const { data: auctionRow, error: aErr } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .maybeSingle();

      if (aErr) throw aErr;
      if (!auctionRow)
        return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 });

      /* --------------------------------------------------------
         RFQ info
      -------------------------------------------------------- */
      let rfq_title = null;
      let rfq_visibility = null;

      if (auctionRow.rfq_id) {
        const { data: rfq } = await supabase
          .from("rfqs")
          .select("title, visibility")
          .eq("id", auctionRow.rfq_id)
          .maybeSingle();

        rfq_title = rfq?.title ?? null;
        rfq_visibility = rfq?.visibility ?? null;
      }

      /* --------------------------------------------------------
         Auction items
      -------------------------------------------------------- */
      const { data: items } = await supabase
        .from("auction_items")
        .select("*")
        .eq("auction_id", auctionId);

      /* --------------------------------------------------------
         Supplier visibility → detailed suppliers
      -------------------------------------------------------- */
      const { data: vis } = await supabase
        .from("auction_visibility")
        .select("supplier_id")
        .eq("auction_id", auctionId);

      const supplierIds = (vis || []).map((v: any) => v.supplier_id).filter(Boolean);

      let suppliers: any[] = [];
      if (supplierIds.length) {
        const { data: sData } = await supabase
          .from("suppliers")
          .select("id, company_name")
          .in("id", supplierIds);

        const { data: contacts } = await supabase
          .from("supplier_contacts")
          .select("supplier_id, email, phone")
          .in("supplier_id", supplierIds);

        suppliers = (sData || []).map((s: any) => ({
          ...s,
          contacts: (contacts || []).filter((c: any) => c.supplier_id === s.id)
        }));
      }

      /* --------------------------------------------------------
         Files → from storage bucket
      -------------------------------------------------------- */
      const folder = `auction_${auctionId}`;
      let files: any[] = [];

      try {
        const { data: fileList, error: listErr } = await supabase.storage
          .from(BUCKET)
          .list(folder, { limit: 100 });

        if (!listErr && fileList?.length) {
          files = fileList.map((f: any) => {
            const storage_path = `${folder}/${f.name}`;

            const { data: pub } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(storage_path);

            return {
              filename: f.name,
              storage_path,
              public_url: pub?.publicUrl || null,
              size: f.metadata?.size ?? null,
              created_at: f.created_at ?? null,
              updated_at: f.updated_at ?? null
            };
          });
        }
      } catch (e: any) {
        console.warn("⚠️ Storage block failed:", e?.message);
      }

      /* --------------------------------------------------------
         RETURN SINGLE AUCTION
      -------------------------------------------------------- */
      return NextResponse.json({
        success: true,
        auction: {
          ...auctionRow,
          rfq_title,
          rfq_visibility,
          auction_items: items || [],
          suppliers,
          files
        }
      });
    }

/* --------------------------------------------------------
   2) GET LIST OF AUCTIONS  (supports supplier filter)
-------------------------------------------------------- */
const supplierIdParam = url.searchParams.get("supplier_id");
const statusFilter = url.searchParams.get("status"); // e.g. "published"

// Base query (will further restrict with in("id", allowedIds) if supplier filter present)
let baseQuery = supabase
  .from("auctions")
  .select(`
    id,
    rfq_id,
    auction_type,
    start_at,
    end_at,
    currency,
    visibility_mode,
    status,
    created_at,
    config->>title as title,
    config
  `)
  .order("created_at", { ascending: false });

if (statusFilter) {
  baseQuery = baseQuery.eq("status", statusFilter);
}

// If no supplier_id → normal admin/buyer listing
if (!supplierIdParam) {
  const { data: list, error: listErr } = await baseQuery;
  if (listErr) throw listErr;
  return NextResponse.json({ success: true, auctions: list || [] });
}

// Supplier-specific listing
const supplierUUID = ensureUUID(supplierIdParam);
if (!supplierUUID) {
  return NextResponse.json(
    { success: false, error: "Invalid supplier_id" },
    { status: 400 }
  );
}

// 1) Invited auctions for this supplier (auction_visibility)
const { data: visRows, error: visErr } = await supabase
  .from("auction_visibility")
  .select("auction_id")
  .eq("supplier_id", supplierUUID);

if (visErr) throw visErr;

const invitedAuctionIds = (visRows || []).map((v: any) => v.auction_id);

// 2) Public auctions via RFQ visibility = 'public'
//    (anyone can see them)
const { data: publicAuctions, error: pubErr } = await supabase
  .from("auctions")
  .select(
    `
    id,
    rfq:rfq_id (
      visibility
    )
  `
  );

if (pubErr) throw pubErr;

const publicAuctionIds = (publicAuctions || [])
  .filter((a: any) => a.rfq?.visibility === "public")
  .map((a: any) => a.id);

// Merge & dedupe
const allowedIdsSet = new Set<string>([
  ...invitedAuctionIds,
  ...publicAuctionIds,
]);
const allowedIds = Array.from(allowedIdsSet);

if (!allowedIds.length) {
  return NextResponse.json({ success: true, auctions: [] });
}

const { data: supplierList, error: supplierListErr } = await baseQuery.in(
  "id",
  allowedIds
);
if (supplierListErr) throw supplierListErr;

return NextResponse.json({ success: true, auctions: supplierList || [] });


  } catch (err: any) {
    console.error("GET auction error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}



/* ============================================================
   POST → CREATE AUCTION
   FormData → handles files, config, items, suppliers
============================================================ */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Required fields
    const fromRFQ = ensureUUID(form.get("from_rfq"));
    const organization_id = ensureUUID(form.get("organization_id"));
    const created_by = ensureUUID(form.get("created_by"));

    const auction_type = (form.get("auction_type") as string) || "standard_reverse";
    const start_at = form.get("start_at") as string;
    const end_at = form.get("end_at") as string;
    const currency = form.get("currency") as string;
    const visibility_mode = (form.get("visibility_mode") as string) || "rank_only";

    const config = (() => {
      try {
        return JSON.parse(form.get("config") as string);
      } catch {
        return {};
      }
    })();

    const invitedSupplierIds = (() => {
      try {
        return JSON.parse(form.get("invited_supplier_ids") as string);
      } catch {
        return [];
      }
    })();

    if (!organization_id)
      return NextResponse.json({ success: false, error: "Invalid organization_id" }, { status: 400 });

    // ---------------------------------------------
    // Load RFQ (optional)
    // ---------------------------------------------
    let rfqRow: any = null;
    if (fromRFQ) {
      const { data: rfq } = await supabase
        .from("rfqs")
        .select("*")
        .eq("id", fromRFQ)
        .maybeSingle();
      rfqRow = rfq;
    }

    // ---------------------------------------------
    // Insert AUCTION
    // ---------------------------------------------
    const auctionId = uuidv4();
    const finalTitle =
      config.title || rfqRow?.title || "Auction";

    const auctionRow = {
      id: auctionId,
      rfq_id: rfqRow?.id ?? null,
      organization_id,
      auction_type,
      start_at,
      end_at,
      currency,
      visibility_mode,
      config: { ...config, title: finalTitle },
      status: "draft",
      created_by,
      created_at: nowISO()
    };

    const { error: createErr } = await supabase
      .from("auctions")
      .insert([auctionRow]);

    if (createErr) throw createErr;

    // ---------------------------------------------
    // Copy RFQ items → auction_items
    // ---------------------------------------------
    if (rfqRow?.id) {
      const { data: rfqItems } = await supabase
        .from("rfq_items")
        .select("*")
        .eq("rfq_id", rfqRow.id);

      if (rfqItems?.length) {
        const rows = rfqItems.map((it: any) => ({
          id: uuidv4(),
          auction_id: auctionId,
          rfq_item_id: it.id,
          description: it.description,
          qty: it.qty,
          uom: it.uom,
          created_at: nowISO()
        }));

        await supabase.from("auction_items").insert(rows);
      }
    }

    // ---------------------------------------------
    // Insert invited suppliers (RFQ + manual)
    // ---------------------------------------------
    const visRows: any[] = [];

    if (fromRFQ) {
      const { data: inv } = await supabase
        .from("rfq_invited_suppliers")
        .select("*")
        .eq("rfq_id", fromRFQ);

      for (const r of inv || []) {
        if (ensureUUID(r.supplier_id)) {
          visRows.push({
            id: uuidv4(),
            auction_id: auctionId,
            supplier_id: r.supplier_id,
            visibility_type: "invited",
            created_at: nowISO()
          });
        }
      }
    }

    for (const sid of invitedSupplierIds) {
      const s = ensureUUID(sid);
      if (!s) continue;
      if (!visRows.find((v) => v.supplier_id === s)) {
        visRows.push({
          id: uuidv4(),
          auction_id: auctionId,
          supplier_id: s,
          visibility_type: "invited",
          created_at: nowISO()
        });
      }
    }

    if (visRows.length) {
      await supabase.from("auction_visibility").insert(visRows);
    }

    // ---------------------------------------------
    // File Uploads → auction_<auctionId>/...
    // ---------------------------------------------
    const files = form.getAll("files");
    const folder = `auction_${auctionId}`;

    for (const f of files as File[]) {
      const ext = f.name.split(".").pop();
      const newPath = `${folder}/${Date.now()}_${uuidv4()}.${ext}`;
      const buffer = Buffer.from(await f.arrayBuffer());

      await supabase.storage
        .from(BUCKET)
        .upload(newPath, buffer, { upsert: false });
    }

    // ---------------------------------------------
    // Copy RFQ files → auction folder
    // ---------------------------------------------
    if (rfqRow?.rfq_documents?.length) {
      for (const doc of rfqRow.rfq_documents) {
        const src = doc.storage_path;
        if (!src) continue;

        const dl = await supabase.storage.from("rfq-documents").download(src);
        if (dl.error) continue;

        const ab = await dl.data.arrayBuffer();
        const buffer = Buffer.from(ab);
        const ext = doc.file_name?.split(".").pop() || "bin";

        const destPath = `${folder}/${uuidv4()}.${ext}`;

        await supabase.storage
          .from(BUCKET)
          .upload(destPath, buffer, { upsert: false });
      }
    }

    return NextResponse.json(
      { success: true, auctionId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST auction error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ============================================================
   PATCH → UPDATE / PUBLISH / ARCHIVE
============================================================ */
export async function PATCH(req: Request) {
  try {
   // Use FormData because frontend PATCH sends multipart/form-data
const form = await req.formData();

const id = form.get("id");
const action = form.get("action");

// Parse "fields" safely (string | Blob | already parsed)
let rawFields = form.get("fields");
let fields: any = {};

if (typeof rawFields === "string") {
  fields = JSON.parse(rawFields);
} else if (rawFields instanceof Blob) {
  fields = JSON.parse(await rawFields.text());
} else if (typeof rawFields === "object" && rawFields !== null) {
  fields = rawFields;
} else {
  throw new Error("Invalid fields payload");
}


    const auctionId = ensureUUID(id);
    if (!auctionId) throw new Error("Invalid auction ID");

    // Load existing auction
    const { data: a, error: loadErr } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!a) throw new Error("Auction not found");

    /* =============================
       LOCK RULE
       Auction is editable ONLY
       when status = draft
    ============================== */
    if (a.status !== "draft" && action !== "archive")
      throw new Error("Auction is locked. Cannot edit.");

    /* =============================
       ACTION: Publish
    ============================== */
    if (action === "publish") {
      const start = new Date(a.start_at).getTime();
      const end = new Date(a.end_at).getTime();
      const now = Date.now();

      if (start <= now)
        throw new Error("Start time must be in the future.");

      if (end <= start)
        throw new Error("End time must be after start time.");

      // Must have at least 1 item
      const { count: itemCount } = await supabase
        .from("auction_items")
        .select("id", { count: "exact", head: true })
        .eq("auction_id", auctionId);

      if (!itemCount) throw new Error("Auction must have at least one item.");

      // Supplier requirement (if invited mode)

      if (a.rfq_id) {
        const { data: rfq } = await supabase
          .from("rfqs")
          .select("visibility")
          .eq("id", a.rfq_id)
          .maybeSingle();

        if (rfq?.visibility === "invited") {
          const { count: supCount } = await supabase
            .from("auction_visibility")
            .select("id", { count: "exact", head: true })
            .eq("auction_id", auctionId);

          if (!supCount)
            throw new Error("At least one supplier must be invited.");
        }
      }

      await supabase
        .from("auctions")
        .update({ status: "published" })
        .eq("id", auctionId);

      return NextResponse.json({ success: true, message: "Auction published" });
    }

    /* =============================
       ACTION: Archive
    ============================== */
    if (action === "archive") {
      await supabase
        .from("auctions")
        .update({ status: "archived" })
        .eq("id", auctionId);

      return NextResponse.json({ success: true, message: "Auction archived" });
    }

    /* =============================
       ACTION: Update
    ============================== */
    if (action !== "update") throw new Error("Unsupported action");

    // ---------------- Update Auction fields
    if (fields.auction_updates) {
      await supabase
        .from("auctions")
        .update(fields.auction_updates)
        .eq("id", auctionId);
    }

    // ---------------- Items Add
    if (fields.items?.add?.length) {
      const rows = fields.items.add.map((it: any) => ({
        id: uuidv4(),
        auction_id: auctionId,
        description: it.description,
        qty: it.qty,
        uom: it.uom,
        created_at: nowISO()
      }));
      await supabase.from("auction_items").insert(rows);
    }

    // ---------------- Items Update
    if (fields.items?.update?.length) {
      for (const it of fields.items.update) {
        await supabase
          .from("auction_items")
          .update({
            description: it.description,
            qty: it.qty,
            uom: it.uom
          })
          .eq("id", it.id)
          .eq("auction_id", auctionId);
      }
    }

    // ---------------- Items Delete
    if (fields.items?.delete?.length) {
      await supabase
        .from("auction_items")
        .delete()
        .in("id", fields.items.delete)
        .eq("auction_id", auctionId);
    }

    // ---------------- Supplier Visibility Add
    if (fields.visibility?.add?.length) {
      const rows = fields.visibility.add.map((sid: string) => ({
        id: uuidv4(),
        auction_id: auctionId,
        supplier_id: sid,
        visibility_type: "invited",
        created_at: nowISO()
      }));
      await supabase.from("auction_visibility").insert(rows);
    }

    // ---------------- Supplier Visibility Remove
    if (fields.visibility?.remove?.length) {
      await supabase
        .from("auction_visibility")
        .delete()
        .eq("auction_id", auctionId)
        .in("supplier_id", fields.visibility.remove);
    }

    // ---------------- Files Add
    if (fields.files_to_add?.length) {
      const folder = `auction_${auctionId}`;
      for (const file of fields.files_to_add) {
        const buffer = Buffer.from(file.fileBuffer, "base64");
        const newPath = `${folder}/${uuidv4()}_${file.filename}`;
        await supabase.storage.from(BUCKET).upload(newPath, buffer);
      }
    }

    // ---------------- Files Delete
    if (fields.files_to_delete?.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(fields.files_to_delete);
    }

    return NextResponse.json({ success: true, message: "Auction updated" });
  } catch (err: any) {
    console.error("PATCH auction error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
