import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) throw new Error("Missing PO ID");

    // 1) Load PO with supplier + award (no RFQ/proposal joins here)
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(
        `
        *,
        supplier:suppliers(
          id,
          company_name,
          country,
          contacts:supplier_contacts(email, phone)
        ),
        award:awards(
          id,
          rfq_id,
          supplier_id,
          status,
          award_summary,
          awarded_at
        )
      `
      )
      .eq("id", id)
      .single();

    if (poError) throw poError;
    if (!po) throw new Error("PO not found");

    // 2) Fetch RFQ info via award.rfq_id
    const { data: rfq } = await supabase
      .from("rfqs")
      .select("id, title, currency, organization_id")
      .eq("id", po.award.rfq_id)
      .single();

    // 3) Try to fetch organization (buyer) – if schema differs, this will just be null
    let organization: any = null;
    if (rfq?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", rfq.organization_id)
        .maybeSingle();
      organization = org;
    }

    // 4) Fetch winning supplier's proposal (rfq_id + supplier_id)
    const { data: proposal } = await supabase
      .from("proposal_submissions")
      .select(
        `
        id,
        total_price,
        submitted_at,
        line_items:proposal_items(
          id,
          unit_price,
          total,
          rfq_item_id,
          rfq_items:rfq_items(
            id,
            description,
            qty,
            uom
          )
        )
      `
      )
      .eq("rfq_id", po.award.rfq_id)
      .eq("supplier_id", po.award.supplier_id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Attach helpers (for easier access)
    po.rfq = rfq;
    po.org = organization;
    po.proposal = proposal;

    // --------- PDF BUILDING ---------
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4-ish
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { height } = page.getSize();

    let y = height - 40;

    // Try to draw PNG logo from /public (svg cannot be embedded directly)
    let logoWidth = 0;
    try {
      const logoPathPng = `${process.cwd()}/public/briskon-logo.png`; // if ever added
      const logoBytes = fs.readFileSync(logoPathPng);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const scaled = logoImage.scale(0.25);
      logoWidth = scaled.width;
      page.drawImage(logoImage, {
        x: 40,
        y: height - 80,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      // Fallback: text logo
      const logoText = "BRISKON PROCUREMENT SOLUTION";
      page.drawText(logoText, {
        x: 40,
        y: height - 70,
        size: 14,
        font: boldFont,
        color: rgb(0.05, 0.2, 0.45),
      });
      logoWidth = 220;
    }

    // Header: PO Title + basic info
    page.drawText("PURCHASE ORDER", {
      x: 350,
      y: height - 60,
      size: 18,
      font: boldFont,
      color: rgb(0, 0.25, 0.6),
    });

    const createdDate = po.created_at
      ? new Date(po.created_at).toISOString().slice(0, 10)
      : "";

    page.drawText(`PO Number: ${po.po_number}`, {
      x: 350,
      y: height - 80,
      size: 11,
      font,
    });
    page.drawText(`Date: ${createdDate}`, {
      x: 350,
      y: height - 96,
      size: 11,
      font,
    });

    y = height - 130;

    // -------- Buyer & Supplier blocks --------
    // Buyer
    page.drawText("Buyer (Issued By)", {
      x: 40,
      y,
      size: 11,
      font: boldFont,
    });
    y -= 16;
    page.drawText(
      organization?.name || "Briskon Procurement",
      { x: 40, y, size: 10, font }
    );
    y -= 14;
    page.drawText("Address: (on file)", { x: 40, y, size: 9, font });
    y -= 14;
    page.drawText("Contact: (System User)", { x: 40, y, size: 9, font });

    // Supplier (right side)
    let yRight = height - 130;
    page.drawText("Supplier", {
      x: 320,
      y: yRight,
      size: 11,
      font: boldFont,
    });
    yRight -= 16;
    page.drawText(po.supplier?.company_name || "-", {
      x: 320,
      y: yRight,
      size: 10,
      font,
    });
    yRight -= 14;
    page.drawText(`Country: ${po.supplier?.country || "-"}`, {
      x: 320,
      y: yRight,
      size: 9,
      font,
    });
    yRight -= 14;

    const primaryContact = po.supplier?.contacts?.[0];
    if (primaryContact) {
      page.drawText(
        `Email: ${primaryContact.email || "-"}`,
        { x: 320, y: yRight, size: 9, font }
      );
      yRight -= 14;
      page.drawText(
        `Phone: ${primaryContact.phone || "-"}`,
        { x: 320, y: yRight, size: 9, font }
      );
      yRight -= 14;
    }

    // Move main cursor down a bit
    y = Math.min(y, yRight) - 20;

    // -------- RFQ & Award summary --------
    page.drawText("Order Summary", {
      x: 40,
      y,
      size: 11,
      font: boldFont,
      color: rgb(0, 0.25, 0.6),
    });
    y -= 16;

    page.drawText(`RFQ: ${po.rfq?.title || "-"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 14;

    if (po.award?.award_summary) {
      page.drawText(`Award: ${po.award.award_summary}`, {
        x: 40,
        y,
        size: 10,
        font,
      });
      y -= 14;
    }

    const currency = po.rfq?.currency || po.currency || "USD";
    const totalAmount = Number(po.total_amount || proposal?.total_price || 0);
    page.drawText(`Currency: ${currency}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 14;
    page.drawText(`PO Total: ${currency} ${totalAmount.toFixed(2)}`, {
      x: 40,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.4, 0.1),
    });

    y -= 24;

    // -------- Line items table --------
    page.drawText("Line Item Breakdown", {
      x: 40,
      y,
      size: 11,
      font: boldFont,
    });
    y -= 16;

    const tableHeaderY = y;
    const colX = {
      desc: 40,
      qty: 280,
      uom: 320,
      unit: 370,
      total: 450,
    };

    // Table header
    page.drawText("Description", {
      x: colX.desc,
      y: tableHeaderY,
      size: 9,
      font: boldFont,
    });
    page.drawText("Qty", {
      x: colX.qty,
      y: tableHeaderY,
      size: 9,
      font: boldFont,
    });
    page.drawText("UOM", {
      x: colX.uom,
      y: tableHeaderY,
      size: 9,
      font: boldFont,
    });
    page.drawText("Unit Price", {
      x: colX.unit,
      y: tableHeaderY,
      size: 9,
      font: boldFont,
    });
    page.drawText("Total", {
      x: colX.total,
      y: tableHeaderY,
      size: 9,
      font: boldFont,
    });

    y = tableHeaderY - 14;

    if (proposal?.line_items?.length) {
      for (const item of proposal.line_items) {
        if (y < 80) break; // basic single-page guard

        const desc = item.rfq_items?.description || "-";
        const qty = item.rfq_items?.qty ?? "";
        const uom = item.rfq_items?.uom ?? "";
        const unitPrice = Number(item.unit_price || 0);
        const lineTotal = Number(item.total || 0);

        page.drawText(desc.substring(0, 45), {
          x: colX.desc,
          y,
          size: 9,
          font,
        });
        page.drawText(String(qty), {
          x: colX.qty,
          y,
          size: 9,
          font,
        });
        page.drawText(String(uom), {
          x: colX.uom,
          y,
          size: 9,
          font,
        });
        page.drawText(`${unitPrice.toFixed(2)}`, {
          x: colX.unit,
          y,
          size: 9,
          font,
        });
        page.drawText(`${lineTotal.toFixed(2)}`, {
          x: colX.total,
          y,
          size: 9,
          font,
        });

        y -= 14;
      }
    } else {
      page.drawText("No line items found for this proposal.", {
        x: 40,
        y,
        size: 9,
        font,
      });
      y -= 14;
    }

    y -= 10;

    // -------- Totals summary --------
    const taxRate = 0.18;
    const subTotal = totalAmount;
    const taxAmount = subTotal * taxRate;
    const grandTotal = subTotal + taxAmount;

    page.drawText("Subtotal:", {
      x: 380,
      y,
      size: 10,
      font,
    });
    page.drawText(`${currency} ${subTotal.toFixed(2)}`, {
      x: 450,
      y,
      size: 10,
      font,
    });
    y -= 14;

    page.drawText(`Tax (${(taxRate * 100).toFixed(0)}%):`, {
      x: 380,
      y,
      size: 10,
      font,
    });
    page.drawText(`${currency} ${taxAmount.toFixed(2)}`, {
      x: 450,
      y,
      size: 10,
      font,
    });
    y -= 14;

    page.drawText("Grand Total:", {
      x: 380,
      y,
      size: 10,
      font: boldFont,
    });
    page.drawText(`${currency} ${grandTotal.toFixed(2)}`, {
      x: 450,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.4, 0.1),
    });

    y -= 40;

    // -------- Signatures --------
    page.drawText("Authorized Signatures", {
      x: 40,
      y,
      size: 11,
      font: boldFont,
    });
    y -= 30;

    page.drawText("__________________________", {
      x: 40,
      y,
      size: 10,
      font,
    });
    page.drawText("Buyer Representative", {
      x: 40,
      y: y - 12,
      size: 9,
      font,
    });

    page.drawText("__________________________", {
      x: 320,
      y,
      size: 10,
      font,
    });
    page.drawText("Supplier Representative", {
      x: 320,
      y: y - 12,
      size: 9,
      font,
    });

    // -------- Footer Note --------
    page.drawText(
      "Note: This is a system-generated Purchase Order from Briskon Procurement Solution.",
      {
        x: 40,
        y: 40,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      }
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="PO-${po.po_number}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF API ERROR:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
