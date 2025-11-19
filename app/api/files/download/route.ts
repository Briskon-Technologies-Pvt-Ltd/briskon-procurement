import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase Admin Client (Service Role Key required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { file_id, bucket, expires_in = 3600 } = body; // expires_in is optional, default 1 hour

    if (!file_id || !bucket) {
      return NextResponse.json(
        { error: "Missing required fields: file_id or bucket" },
        { status: 400 }
      );
    }

    // Step 1️⃣: Fetch file record from `files` table
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .select("id, storage_path, filename, owner_type, owner_id, uploaded_by")
      .eq("id", file_id)
      .single();

    if (fileError || !fileRecord) {
      throw new Error("File not found in metadata table");
    }

    // Step 2️⃣: Generate signed URL from Supabase Storage
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucket)
        .createSignedUrl(fileRecord.storage_path, expires_in);

    if (signedUrlError) throw signedUrlError;

    // Step 3️⃣: Log Audit Trail
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: fileRecord.uploaded_by,
        resource_type: fileRecord.owner_type,
        resource_id: fileRecord.owner_id,
        action: "file_downloaded",
        payload: { file_id, filename: fileRecord.filename, bucket },
      },
    ]);

    // Step 4️⃣: Optional notification (to file owner)
    await supabase.from("notifications").insert([
      {
        recipient_profile_id: fileRecord.uploaded_by,
        related_entity: fileRecord.owner_type,
        entity_id: fileRecord.owner_id,
        message: `File '${fileRecord.filename}' was accessed.`,
        type: "file",
      },
    ]);

    // Step 5️⃣: Respond with signed URL
    return NextResponse.json({
      success: true,
      message: "Signed URL generated successfully",
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        owner_type: fileRecord.owner_type,
      },
      signed_url: signedUrlData.signedUrl,
      expires_in,
    });
  } catch (err: any) {
    console.error("Download error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
