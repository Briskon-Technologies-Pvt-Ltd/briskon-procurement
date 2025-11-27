import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/proposals/[id]/documents
 * Body:
 * {
 *   "uploaded_by": "profile_uuid",
 *   "files": [
 *     {
 *       "storage_path": "proposals/xyz/file.pdf",
 *       "filename": "Technical_Specs.pdf",
 *       "content_type": "application/pdf",
 *       "size": 1048576
 *     },
 *     ...
 *   ]
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const proposalId = resolvedParams.id;
    const body = await req.json();

    const { uploaded_by, files } = body;
    if (!uploaded_by || !files?.length) {
      return NextResponse.json(
        { error: "uploaded_by and files[] are required" },
        { status: 400 }
      );
    }

    const uploadedDocs: any[] = [];

    // Process each file entry
    for (const file of files) {
      const fileId = uuidv4();

      // 1️⃣ Insert into files
      const { data: fileRecord, error: fileError } = await supabase
        .from("files")
        .insert([
          {
            id: fileId,
            owner_type: "proposal",
            owner_id: proposalId,
            storage_path: file.storage_path,
            filename: file.filename,
            content_type: file.content_type,
            size: file.size,
            uploaded_by,
          },
        ])
        .select()
        .single();

      if (fileError) throw fileError;

      // 2️⃣ Insert into file_versions (version 1)
      await supabase.from("file_versions").insert([
        {
          file_id: fileId,
          version_no: 1,
          storage_path: file.storage_path,
          uploaded_by,
        },
      ]);

      // 3️⃣ Link file to proposal_documents
      const { data: link, error: linkError } = await supabase
        .from("proposal_documents")
        .insert([
          {
            proposal_submission_id: proposalId,
            file_id: fileId,
          },
        ])
        .select()
        .single();

      if (linkError) throw linkError;

      uploadedDocs.push({
        ...fileRecord,
        document_link: link.id,
      });
    }

    // Optional: Log the upload in audit trail
    await supabase.from("audit_events").insert([
      {
        actor_profile_id: uploaded_by,
        resource_type: "proposal_document",
        resource_id: proposalId,
        action: "document_uploaded",
        payload: { count: files.length },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `${files.length} document(s) uploaded successfully.`,
      documents: uploadedDocs,
    });
  } catch (err: any) {
    console.error("Error uploading proposal docs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/proposals/[id]/documents
 * Fetch all documents linked to a given proposal submission
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const proposalId = resolvedParams.id;

    const { data, error } = await supabase
      .from("proposal_documents")
      .select(`
        id,
        uploaded_at,
        files (
          id,
          filename,
          storage_path,
          content_type,
          size,
          uploaded_by,
          uploaded_at
        )
      `)
      .eq("proposal_submission_id", proposalId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      proposal_id: proposalId,
      documents: data,
    });
  } catch (err: any) {
    console.error("Error fetching proposal documents:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
