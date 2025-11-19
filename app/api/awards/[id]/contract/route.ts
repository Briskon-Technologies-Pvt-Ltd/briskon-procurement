import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/awards/[id]/contract
 *
 * Body:
 * {
 *   "po_id": "uuid",             // optional if award has a PO
 *   "file_id": "uuid",           // required - file reference
 *   "created_by": "profile_uuid",
 *   "effective_from": "2025-11-10",
 *   "expires_at": "2026-11-10",
 *   "metadata": { "signed_by": "John Smith" }
 * }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const awardId = params.id;
    const body = await req.json();
    const {
      po_id,
      file_id,
      created_by,
      effective_from,
      expires_at,
      metadata,
    } = body;

    if (!file_id || !created_by) {
      return NextResponse.json(
        { error: "file_id and created_by are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Validate award
    const { data: award, error: awardError } = await supabase
      .from("awards")
      .select("id, status, supplier_id, rfq_id, auction_id")
      .eq("id", awardId)
      .single();

    if (awardError) throw awardError;
    if (!award) return NextResponse.json({ error: "Award not found" }, { status: 404 });

    if (!["completed", "issued"].includes(award.status)) {
      return NextResponse.json(
        { error: "Contracts can only be created for issued or completed awards" },
        { status: 400 }
      );
    }

    // 2️⃣ Check for existing contract
    const { data: existingContract } = await supabase
      .from("contracts")
      .select("*")
      .eq("award_id", awardId)
      .maybeSingle();

    if (existingContract) {
      return NextResponse.json({
        success: false,
        message: "Contract already exists for this award",
        contract: existingContract,
      });
    }

    // 3️⃣ Insert new contract record
    const { data: contract, error: insertError } = await supabase
      .from("contracts")
      .insert([
        {
          award_id: awardId,
          po_id: po_id || null,
          file_id,
          signed_at: new Date().toISOString(),
          effective_from: effective_from ? new Date(effective_from) : new Date(),
          expires_at: expires_at ? new Date(expires_at) : null,
          metadata: metadata || {},
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4️⃣ Record audit log
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "contract",
        resource_id: contract.id,
        action: "contract_created",
        payload: {
          award_id: awardId,
          file_id,
          po_id,
          metadata,
        },
      },
    ]);

    // 5️⃣ Update award status → finalized
    await supabase.from("awards").update({ status: "finalized" }).eq("id", awardId);

    return NextResponse.json({
      success: true,
      message: "Contract created and linked successfully",
      contract,
    });
  } catch (err: any) {
    console.error("Error creating contract:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/awards/[id]/contract
 * Fetch contract linked to an award
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const awardId = params.id;

    const { data, error } = await supabase
      .from("contracts")
      .select(
        `
        *,
        files (id, filename, storage_path, uploaded_at, content_type)
      `
      )
      .eq("award_id", awardId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        success: false,
        message: "No contract found for this award",
      });
    }

    return NextResponse.json({
      success: true,
      contract: data,
    });
  } catch (err: any) {
    console.error("Error fetching contract:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
