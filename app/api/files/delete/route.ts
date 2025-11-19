// app/api/files/delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

interface FileRecord {
  id: string;
  storage_path: string;
  filename: string;
  owner_type?: string | null;
  owner_id?: string | null;
  uploaded_by?: string | null;
  metadata?: Record<string, any> | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { file_id, bucket, deleted_by, mode = "soft" } = body;

    if (!file_id || !bucket || !deleted_by) {
      return NextResponse.json(
        { error: "Missing required fields: file_id, bucket, deleted_by" },
        { status: 400 }
      );
    }

    // Step 1 - fetch file record (include metadata explicitly)
    const { data: fileRecordRaw, error: fileError } = await supabase
      .from("files")
      .select(
        "id, storage_path, filename, owner_type, owner_id, uploaded_by, metadata"
      )
      .eq("id", file_id)
      .single();

    if (fileError || !fileRecordRaw) {
      console.error("File lookup error:", fileError);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // cast to typed shape so TS knows 'metadata' exists (may be null)
    const fileRecord = fileRecordRaw as FileRecord;

    // Step 2 - perform delete
    if (mode === "hard") {
      // delete from Supabase storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([fileRecord.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        throw storageError;
      }

      // delete DB record
      const { error: dbDeleteError } = await supabase
        .from("files")
        .delete()
        .eq("id", file_id);

      if (dbDeleteError) {
        console.error("DB delete error:", dbDeleteError);
        throw dbDeleteError;
      }
    } else {
      // soft delete: tag metadata (preserve record)
      const newMetadata = {
        ...(fileRecord.metadata ?? {}),
        deleted_at: new Date().toISOString(),
        deleted_by,
        is_deleted: true,
      };

      const { error: softDeleteError } = await supabase
        .from("files")
        .update({ metadata: newMetadata })
        .eq("id", file_id);

      if (softDeleteError) {
        console.error("Soft delete error:", softDeleteError);
        throw softDeleteError;
      }
    }

    // Step 3 - audit event
    const auditPayload = {
      actor_profile_id: deleted_by,
      resource_type: fileRecord.owner_type ?? "file",
      resource_id: fileRecord.owner_id ?? null,
      action: mode === "hard" ? "file_deleted_permanent" : "file_deleted_soft",
      payload: {
        file_id,
        filename: fileRecord.filename,
        bucket,
      },
    };

    const { error: auditError } = await supabase
      .from("audit_events")
      .insert([auditPayload]);

    if (auditError) {
      console.warn("Audit insert warning:", auditError);
      // don't fail the whole request for an audit insert problem; just log
    }

    // Step 4 - notification to uploader (best-effort)
    if (fileRecord.uploaded_by) {
      const { error: noteError } = await supabase.from("notifications").insert([
        {
          recipient_profile_id: fileRecord.uploaded_by,
          related_entity: fileRecord.owner_type ?? "file",
          entity_id: fileRecord.owner_id ?? null,
          message: `File '${fileRecord.filename}' was ${
            mode === "hard" ? "permanently deleted" : "marked as deleted"
          }.`,
          type: "file",
        },
      ]);

      if (noteError) console.warn("Notification insert warning:", noteError);
    }

    return NextResponse.json({
      success: true,
      message:
        mode === "hard"
          ? "File permanently deleted"
          : "File marked as deleted (soft delete)",
    });
  } catch (err: any) {
    console.error("Delete endpoint error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
