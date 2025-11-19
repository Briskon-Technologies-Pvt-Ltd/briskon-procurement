import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Service Role Key required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ensure proper runtime (FormData support)
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Extract fields
    const file = formData.get("file") as File;
    const ownerType = formData.get("owner_type") as string;
    const ownerId = formData.get("owner_id") as string;
    const bucket = formData.get("bucket") as string;
    const uploadedBy = formData.get("uploaded_by") as string;

    // Validate required fields
    if (!file || !bucket || !ownerType || !ownerId || !uploadedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique filename and storage path
    const filename = `${Date.now()}_${file.name}`;
    const storagePath = `${ownerType}/${ownerId}/${filename}`;

    // ✅ Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // ✅ Check if file with same owner/type already exists
    const { data: existingFiles, error: checkError } = await supabase
      .from("files")
      .select("id, filename")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId);

    if (checkError) throw checkError;

    let fileId: string | undefined;

    // ✅ Insert into `files` table
    const { data: fileRecord, error: insertError } = await supabase
      .from("files")
      .insert({
        owner_type: ownerType,
        owner_id: ownerId,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        size: file.size,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    fileId = fileRecord.id;

    // ✅ Handle versioning if file already existed
    if (existingFiles && existingFiles.length > 0) {
        await supabase.from("file_versions").insert({
            file_id: existingFiles[0].id,
            version_no: (existingFiles.length ?? 0) + 1,
            storage_path: storagePath, 
            uploaded_by: uploadedBy,
          });
          
    }

    // ✅ Log audit event
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: uploadedBy,
        resource_type: ownerType,
        resource_id: ownerId,
        action: "file_uploaded",
        payload: {
          bucket,
          filename: file.name,
          path: storagePath,
        },
      },
    ]);

    // ✅ Send notification
    await supabase.from("notifications").insert([
      {
        recipient_profile_id: uploadedBy,
        related_entity: ownerType,
        entity_id: ownerId,
        message: `File '${file.name}' uploaded successfully.`,
        type: "file",
      },
    ]);

    // ✅ Response
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      file: fileRecord,
      bucket,
      storage_path: storagePath,
      audit_logged: true,
    });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
