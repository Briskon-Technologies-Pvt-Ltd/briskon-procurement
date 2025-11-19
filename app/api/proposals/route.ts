// /app/api/proposals/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "proposal-docs";

function ensureUUID(val: any): string | null {
  if (!val || typeof val !== "string") return null;
  const v = val.trim();
  const r =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return r.test(v) ? v : null;
}

function nowISO() {
  return new Date().toISOString();
}

/* ============================================================
   GET → Current proposal + history (+ line items)
   /api/proposals?rfq_id=...&supplier_id=...
============================================================ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rfqIdParam = url.searchParams.get("rfq_id");
    const supplierIdParam = url.searchParams.get("supplier_id");

    const rfq_id = ensureUUID(rfqIdParam);
    const supplier_id = ensureUUID(supplierIdParam);

    // -----------------------------------------------------------------
    //  NEW BRANCH: ADMIN PROPOSAL LIST /api/proposals?rfq_id=xxxx
    // -----------------------------------------------------------------
    if (rfq_id && !supplier_id) {
      const { data: proposalsRaw, error: listErr } = await supabase
        .from("proposal_submissions")
        .select("id, rfq_id, supplier_id, total_price, submitted_at, attachments")
        .eq("rfq_id", rfq_id)
        .order("submitted_at", { ascending: true });

      if (listErr) throw listErr;

      if (!proposalsRaw || !proposalsRaw.length) {
        return NextResponse.json({
          success: true,
          proposals: [],
        });
      }

      // Keep only the latest proposal per supplier
      const latestBySupplier: Record<string, any> = {};
      for (const p of proposalsRaw) latestBySupplier[p.supplier_id] = p;

      const latestProposals = Object.values(latestBySupplier);

      // Supplier details
      const supplierIds = latestProposals.map((p: any) => p.supplier_id);
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, company_name, country")
        .in("id", supplierIds);

      // Proposal line items
      const proposalIds = latestProposals.map((p: any) => p.id);
      const { data: lineItems } = await supabase
        .from("proposal_items")
        .select("proposal_id, rfq_item_id, unit_price, total")
        .in("proposal_id", proposalIds);

      const itemsByProposal: Record<string, any[]> = {};
      for (const li of lineItems || []) {
        if (!itemsByProposal[li.proposal_id]) itemsByProposal[li.proposal_id] = [];
        itemsByProposal[li.proposal_id].push(li);
      }

      // Final output
      const proposals = latestProposals.map((p: any) => ({
        ...p,
        supplier: suppliers?.find((s) => s.id === p.supplier_id) || null,
        line_items: itemsByProposal[p.id] || [],
      }));

      return NextResponse.json({
        success: true,
        proposals,
      });
    }

    // -----------------------------------------------------------------
    // ORIGINAL EXISTING SUPPLIER-SIDE FLOW (UNCHANGED)
    // -----------------------------------------------------------------
    if (!rfq_id || !supplier_id) {
      return NextResponse.json(
        {
          success: false,
          error: "rfq_id and supplier_id are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("proposal_submissions")
      .select(
        "id, rfq_id, supplier_id, submitted_by_profile_id, submission_text, total_price, change_notes, attachments, status, submitted_at"
      )
      .eq("rfq_id", rfq_id)
      .eq("supplier_id", supplier_id)
      .order("submitted_at", { ascending: true });

    if (error) throw error;

    if (!data || !data.length) {
      return NextResponse.json({
        success: true,
        current: null,
        history: [],
      });
    }

    const proposalIds = data.map((p) => p.id);

    const { data: piData, error: piErr } = await supabase
      .from("proposal_items")
      .select("proposal_id, rfq_item_id, unit_price, total")
      .in("proposal_id", proposalIds);

    if (piErr) throw piErr;

    const itemsByProposal: Record<string, any[]> = {};
    for (const row of piData || []) {
      if (!itemsByProposal[row.proposal_id]) {
        itemsByProposal[row.proposal_id] = [];
      }
      itemsByProposal[row.proposal_id].push({
        rfq_item_id: row.rfq_item_id,
        unit_price: row.unit_price,
        total: row.total,
      });
    }

    const history = data.map((p) => ({
      ...p,
      line_items: itemsByProposal[p.id] || [],
    }));

    const current = history[history.length - 1];

    return NextResponse.json({
      success: true,
      current,
      history,
    });
  } catch (err: any) {
    console.error("GET /api/proposals error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST → Submit / update proposal (new version)
============================================================ */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const rfq_id = ensureUUID(form.get("rfq_id"));
    const supplier_id = ensureUUID(form.get("supplier_id"));
    const submitted_by_profile_id = ensureUUID(
      form.get("submitted_by_profile_id")
    );

    const total_price_raw = form.get("total_price") as string | null;
    const note = (form.get("note") as string) || "";
    const change_notes = (form.get("change_notes") as string) || "";

    const lineItemsRaw = form.get("line_items") as string | null;
    let lineItems: { rfq_item_id: string; unit_price: number }[] = [];
    if (lineItemsRaw) {
      try {
        const parsed = JSON.parse(lineItemsRaw);
        if (Array.isArray(parsed)) {
          lineItems = parsed.map((li: any) => ({
            rfq_item_id: li.rfq_item_id,
            unit_price: Number(li.unit_price),
          }));
        }
      } catch (e) {
        console.warn("Invalid line_items JSON:", e);
      }
    }

    if (!rfq_id || !supplier_id || !submitted_by_profile_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "rfq_id, supplier_id and submitted_by_profile_id are required",
        },
        { status: 400 }
      );
    }

    // RFQ deadline enforcement
    const { data: rfq, error: rfqErr } = await supabase
      .from("rfqs")
      .select("id, status, end_at")
      .eq("id", rfq_id)
      .maybeSingle();

    if (rfqErr) throw rfqErr;
    if (!rfq)
      return NextResponse.json(
        { success: false, error: "RFQ not found" },
        { status: 404 }
      );

    const now = Date.now();
    const end = rfq.end_at ? new Date(rfq.end_at).getTime() : 0;

    if (rfq.status !== "published" || (end && now > end)) {
      return NextResponse.json(
        {
          success: false,
          error: "Proposal submission window is closed for this RFQ.",
        },
        { status: 400 }
      );
    }

    // RFQ items qty
    const { data: rfqItems, error: rfqItemsErr } = await supabase
      .from("rfq_items")
      .select("id, qty")
      .eq("rfq_id", rfq_id);

    if (rfqItemsErr) throw rfqItemsErr;

    const qtyByItem: Record<string, number> = {};
    for (const it of rfqItems || []) {
      qtyByItem[it.id] = Number(it.qty || 1);
    }

    // file uploads
    const files = form.getAll("files") as File[];
    const attachmentMeta: any[] = [];

    for (const f of files) {
      if (!(f instanceof File)) continue;

      const ext = f.name.split(".").pop() || "bin";
      const newPath = `rfq_${rfq_id}/supplier_${supplier_id}/${uuidv4()}.${ext}`;

      const buffer = Buffer.from(await f.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, buffer, { upsert: false });

      if (uploadErr) {
        console.warn("⚠️ Proposal file upload failed:", uploadErr.message);
        continue;
      }

      const { data: pub } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(newPath);

      attachmentMeta.push({
        file_name: f.name,
        storage_path: newPath,
        file_url: pub?.publicUrl || null,
        uploaded_at: nowISO(),
      });
    }

    const total_price = total_price_raw ? Number(total_price_raw) : null;

    const proposalId = uuidv4();

    const proposalRow = {
      id: proposalId,
      rfq_id,
      supplier_id,
      submitted_by_profile_id,
      submission_text: note,
      total_price,
      change_notes,
      attachments: attachmentMeta.length ? attachmentMeta : null,
      status: "submitted" as const,
      submitted_at: nowISO(),
      language: "en",
    };

    const { error: insertErr } = await supabase
      .from("proposal_submissions")
      .insert([proposalRow]);

    if (insertErr) throw insertErr;

    if (lineItems.length) {
      const itemRows = lineItems
        .map((li) => {
          const itemId = ensureUUID(li.rfq_item_id);
          if (!itemId || isNaN(li.unit_price)) return null;
          const qty = qtyByItem[itemId] ?? 1;
          const total = li.unit_price * qty;
          return {
            id: uuidv4(),
            proposal_id: proposalId,
            rfq_item_id: itemId,
            unit_price: li.unit_price,
            total,
            created_at: nowISO(),
          };
        })
        .filter(Boolean) as any[];

      if (itemRows.length) {
        const { error: piErr2 } = await supabase
          .from("proposal_items")
          .insert(itemRows);
        if (piErr2) throw piErr2;
      }
    }

    return NextResponse.json(
      { success: true, proposal_id: proposalId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/proposals error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
