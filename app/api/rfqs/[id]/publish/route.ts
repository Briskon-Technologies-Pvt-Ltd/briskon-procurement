// app/api/rfqs/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rfqs/:id/publish
// Accepts FormData: send_invitations (true/false), invited_supplier_ids (JSON arr) or invited_emails (JSON arr)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const formData = await req.formData();
    const sendInvitations = (formData.get("send_invitations") as string) === "true";
    const invitedSupplierIdsRaw = (formData.get("invited_supplier_ids") as string) || null;
    const invitedEmailsRaw = (formData.get("invited_emails") as string) || null;
    const sender = (formData.get("sent_by") as string) || null;

    // fetch rfq
    const { data: rfq, error: rfqErr } = await supabase.from("rfqs").select("*").eq("id", id).single();
    if (rfqErr) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (rfq.status !== "draft")
      return NextResponse.json({ error: "Only draft RFQs can be published" }, { status: 400 });

    // update status to published
    const { error: updErr } = await supabase.from("rfqs").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
    if (updErr) throw updErr;

    // create invitations if requested
    let invitedIds: string[] = [];
    let invitedEmails: string[] = [];

    if (invitedSupplierIdsRaw) {
      try { invitedIds = JSON.parse(invitedSupplierIdsRaw); } catch (e) { invitedIds = []; }
    }
    if (invitedEmailsRaw) {
      try { invitedEmails = JSON.parse(invitedEmailsRaw); } catch (e) { invitedEmails = []; }
    }

    if (sendInvitations) {
      // invitations by supplier ids
      for (const sid of invitedIds) {
        const invId = uuidv4();
        const token = uuidv4();
        const { error: invErr } = await supabase.from("invitations").insert([
          {
            id: invId,
            rfq_id: id,
            supplier_id: sid,
            token,
            sent_by: sender,
            status: "sent",
            sent_at: new Date().toISOString(),
          },
        ]);
        if (invErr) console.warn("invitation insert error:", invErr);
      }
      // invitations by email (for external invite)
      for (const email of invitedEmails) {
        const invId = uuidv4(); const token = uuidv4();
        const { error: invErr } = await supabase.from("invitations").insert([
          {
            id: invId,
            rfq_id: id,
            invitee_email: email,
            token,
            sent_by: sender,
            status: "sent",
            sent_at: new Date().toISOString(),
          },
        ]);
        if (invErr) console.warn("invitation insert error (email):", invErr);
      }
    }

    // Optionally: insert a notification row per invited supplier (not implementing email sending here)
    return NextResponse.json({ success: true, message: "RFQ published", rfqId: id }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/rfqs/:id/publish error:", err);
    return NextResponse.json({ error: err.message || "Failed to publish RFQ" }, { status: 500 });
  }
}
