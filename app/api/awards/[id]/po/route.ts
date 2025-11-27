import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/awards/[id]/po
 *
 * Body:
 * {
 *   "organization_id": "uuid",
 *   "supplier_id": "uuid",
 *   "created_by": "profile_uuid",
 *   "currency": "USD",
 *   "total_amount": 10500
 * }
 *
 * Behavior:
 * - Validates that award exists & is acknowledged.
 * - Generates unique PO number.
 * - Inserts into `purchase_orders`.
 * - Links PO to award.
 * - Adds audit log entry.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const awardId = resolvedParams.id;
    const body = await req.json();

    const { organization_id, supplier_id, created_by, currency, total_amount } = body;

    if (!organization_id || !supplier_id || !created_by || !currency) {
      return NextResponse.json(
        { error: "organization_id, supplier_id, created_by, and currency are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Validate award
    const { data: award, error: fetchError } = await supabase
      .from("awards")
      .select("id, status, supplier_id, auction_id, rfq_id")
      .eq("id", awardId)
      .single();

    if (fetchError) throw fetchError;

    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    if (award.status !== "acknowledged") {
      return NextResponse.json(
        { error: "Purchase Order can only be created after award acknowledgment" },
        { status: 400 }
      );
    }

    if (award.supplier_id !== supplier_id) {
      return NextResponse.json(
        { error: "Supplier mismatch with award record" },
        { status: 400 }
      );
    }

    // 2️⃣ Generate unique PO number
    const poNumber = `PO-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // 3️⃣ Insert into purchase_orders
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert([
        {
          award_id: awardId,
          po_number: poNumber,
          supplier_id,
          organization_id,
          currency,
          total_amount: total_amount || null,
          status: "created",
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days default
        },
      ])
      .select()
      .single();

    if (poError) throw poError;

    // 4️⃣ Audit log entry
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: created_by,
        resource_type: "purchase_order",
        resource_id: po.id,
        action: "po_created",
        payload: {
          award_id: awardId,
          supplier_id,
          po_number: poNumber,
          total_amount,
        },
      },
    ]);

    // 5️⃣ Update award status to 'completed'
    await supabase
      .from("awards")
      .update({ status: "completed" })
      .eq("id", awardId);

    return NextResponse.json({
      success: true,
      message: "Purchase Order created successfully",
      purchase_order: po,
    });
  } catch (err: any) {
    console.error("Error creating Purchase Order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/awards/[id]/po
 * Fetch existing PO linked to a specific award
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const awardId = resolvedParams.id;

    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("award_id", awardId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) {
      return NextResponse.json({
        success: false,
        message: "No Purchase Order found for this award",
      });
    }

    return NextResponse.json({
      success: true,
      purchase_order: data,
    });
  } catch (err: any) {
    console.error("Error fetching Purchase Order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
