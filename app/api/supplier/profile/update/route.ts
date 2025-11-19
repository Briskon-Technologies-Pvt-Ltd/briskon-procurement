import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/supplier/profile/update
 * Body:
 * {
 *   supplier_id: string;
 *   company_name?: string;
 *   country?: string | null;
 *   registration_no?: string | null;
 *   metadata?: any;
 *   primary_contact?: {
 *     id?: string | null;
 *     title?: string | null;
 *     email?: string | null;
 *     phone?: string | null;
 *   };
 *   category_ids?: string[];
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      supplier_id,
      company_name,
      country,
      registration_no,
      metadata,
      primary_contact,
      category_ids,
    } = body;

    if (!supplier_id) {
      return NextResponse.json(
        { success: false, error: "supplier_id required" },
        { status: 400 }
      );
    }

    // 1) Update supplier master
    const supplierUpdate: any = {};
    if (typeof company_name === "string") supplierUpdate.company_name = company_name;
    if (typeof country === "string" || country === null)
      supplierUpdate.country = country;
    if (typeof registration_no === "string" || registration_no === null)
      supplierUpdate.registration_no = registration_no;
    if (metadata !== undefined) supplierUpdate.metadata = metadata;

    if (Object.keys(supplierUpdate).length > 0) {
      const { error: supErr } = await supabase
        .from("suppliers")
        .update(supplierUpdate)
        .eq("id", supplier_id);

      if (supErr) throw supErr;
    }

    // 2) Upsert primary contact (single record)
    if (primary_contact) {
      const pc = primary_contact as {
        id?: string | null;
        title?: string | null;
        email?: string | null;
        phone?: string | null;
      };

      if (pc.id) {
        // update existing row
        const { error: pcErr } = await supabase
          .from("supplier_contacts")
          .update({
            title: pc.title ?? null,
            email: pc.email ?? null,
            phone: pc.phone ?? null,
          })
          .eq("id", pc.id)
          .eq("supplier_id", supplier_id);

        if (pcErr) throw pcErr;
      } else if (pc.email || pc.phone || pc.title) {
        // create new row if there is any info
        const { error: pcInsertErr } = await supabase
          .from("supplier_contacts")
          .insert({
            supplier_id,
            title: pc.title ?? null,
            email: pc.email ?? null,
            phone: pc.phone ?? null,
          });

        if (pcInsertErr) throw pcInsertErr;
      }
    }

    // 3) Update categories: simple strategy – delete all & reinsert
    if (Array.isArray(category_ids)) {
      const { error: delErr } = await supabase
        .from("supplier_category_map")
        .delete()
        .eq("supplier_id", supplier_id);

      if (delErr) throw delErr;

      if (category_ids.length > 0) {
        const rows = category_ids.map((category_id: string) => ({
          supplier_id,
          category_id,
        }));
        const { error: insErr } = await supabase
          .from("supplier_category_map")
          .insert(rows);

        if (insErr) throw insErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(
      "POST /api/supplier/profile/update error:",
      err?.message || err
    );
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
