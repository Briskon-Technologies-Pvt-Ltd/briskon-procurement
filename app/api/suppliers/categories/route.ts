import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * POST /api/suppliers/categories
 * Body: { supplier_id: string, category_ids: string[] }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier_id, category_ids } = body;

    if (!supplier_id || !Array.isArray(category_ids)) {
      return NextResponse.json(
        { error: "supplier_id and category_ids[] are required" },
        { status: 400 }
      );
    }

    // Remove duplicates
    const uniqueIds = [...new Set(category_ids)];

    // Step 1: Delete old mappings (if supplier already had categories)
    const { error: delError } = await supabase
      .from("supplier_category_map")
      .delete()
      .eq("supplier_id", supplier_id);

    if (delError) throw delError;

    // Step 2: Insert new mappings
    const insertData = uniqueIds.map((cat_id) => ({
      supplier_id,
      category_id: cat_id,
    }));

    const { data, error } = await supabase
      .from("supplier_category_map")
      .insert(insertData)
      .select();

    if (error) throw error;

    // Step 3: Log Audit Trail
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: null, // Will link with user profile later if available
        resource_type: "supplier",
        resource_id: supplier_id,
        action: "category_mapping_updated",
        payload: { categories: uniqueIds },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Supplier categories updated successfully",
      data,
    });
  } catch (error: any) {
    console.error("Error mapping supplier categories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to map supplier categories" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/suppliers/categories?supplier_id=uuid
 * Returns all categories mapped to a supplier
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supplier_id = searchParams.get("supplier_id");

    if (!supplier_id) {
      return NextResponse.json(
        { error: "supplier_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("supplier_category_map")
      .select("category_id, categories(name, parent_id)")
      .eq("supplier_id", supplier_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching supplier categories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suppliers/categories?supplier_id=uuid&category_id=uuid
 * Deletes a specific supplier–category link
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supplier_id = searchParams.get("supplier_id");
    const category_id = searchParams.get("category_id");

    if (!supplier_id || !category_id) {
      return NextResponse.json(
        { error: "supplier_id and category_id are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("supplier_category_map")
      .delete()
      .match({ supplier_id, category_id });

    if (error) throw error;

    await supabase.from("audit_events").insert([
      {
        actor_profile_id: null,
        resource_type: "supplier",
        resource_id: supplier_id,
        action: "category_mapping_deleted",
        payload: { category_id },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Mapping deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting supplier category mapping:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete mapping" },
      { status: 500 }
    );
  }
}
