import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/supplier/profile/documents/update
 * Body:
 * {
 *   supplier_id: string;
 *   documents: {
 *     id: string;
 *     doc_type: string | null;
 *     issued_by: string | null;
 *     valid_from: string | null;
 *     valid_to: string | null;
 *   }[];
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier_id, documents } = body;

    if (!supplier_id) {
      return NextResponse.json(
        { success: false, error: "supplier_id required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(documents)) {
      return NextResponse.json(
        { success: false, error: "documents must be an array" },
        { status: 400 }
      );
    }

    // Simple sequential updates – avoids TS problems with query builder types
    for (const doc of documents) {
      if (!doc?.id) continue;

      const { error } = await supabase
        .from("supplier_documents")
        .update({
          doc_type: doc.doc_type ?? null,
          issued_by: doc.issued_by ?? null,
          valid_from: doc.valid_from ?? null,
          valid_to: doc.valid_to ?? null,
        })
        .eq("id", doc.id)
        .eq("supplier_id", supplier_id); // safety

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(
      "POST /api/supplier/profile/documents/update error:",
      err?.message || err
    );
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
