import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/files/[id]/versions
 * Add a new version of an existing file
 * 
 * Body:
 * {
 *   "uploaded_by": "profile_uuid",
 *   "storage_path": "proposals/xyz/file_v2.pdf",
 *   "filename": "file_v2.pdf",
 *   "content_type": "application/pdf",
 *   "size": 120000
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const fileId = resolvedParams.id;
    const body = await req.json();

    const { uploaded_by, storage_path, filename, content_type, size } = body;

    if (!fileId || !uploaded_by || !storage_path || !filename) {
      return NextResponse.json(
        { error: "file_id, uploaded_by, storage_path, and filename are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Get the current latest version number
    const { data: versions, error: versionError } = await supabase
      .from("file_versions")
      .select("version_no")
      .eq("file_id", fileId)
      .order("version_no", { ascending: false })
      .limit(1);

    if (versionError) throw versionError;

    const newVersionNo = (versions?.[0]?.version_no || 0) + 1;

    // 2️⃣ Insert new version entry
    const { data: newVersion, error: insertError } = await supabase
      .from("file_versions")
      .insert([
        {
          file_id: fileId,
          version_no: newVersionNo,
          storage_path,
          uploaded_by,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // 3️⃣ Update the main files record with new info
    const { error: updateError } = await supabase
      .from("files")
      .update({
        storage_path,
        filename,
        content_type,
        size,
        uploaded_by,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    if (updateError) throw updateError;

    // 4️⃣ Audit log
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: uploaded_by,
        resource_type: "file",
        resource_id: fileId,
        action: "version_uploaded",
        payload: {
          version_no: newVersionNo,
          storage_path,
          filename,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `File version ${newVersionNo} uploaded successfully.`,
      version: newVersion,
    });
  } catch (err: any) {
    console.error("Error uploading file version:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/files/[id]/versions
 * Fetch all versions for a given file
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    const { data, error } = await supabase
      .from("file_versions")
      .select(`
        id,
        version_no,
        storage_path,
        uploaded_by,
        uploaded_at,
        profiles:uploaded_by(fname, lname)
      `)
      .eq("file_id", fileId)
      .order("version_no", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      file_id: fileId,
      versions: data,
    });
  } catch (err: any) {
    console.error("Error fetching file versions:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
