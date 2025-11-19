"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  FileText,
  Send,
  Edit3,
  Clock,
  Paperclip,
  History,
} from "lucide-react";

type RFQ = any;

type Proposal = {
  id: string;
  rfq_id: string;
  supplier_id: string;
  submission_text: string | null;
  status: string;
  submitted_at: string;
};

type Attachment = {
  id: string;
  file_id: string;
  filename: string;
  public_url: string | null;
  uploaded_at: string;
};

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rfqId = params?.id;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loadingRfq, setLoadingRfq] = useState(true);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
  const [proposalHistory, setProposalHistory] = useState<Proposal[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [proposalText, setProposalText] = useState("");
  const [newFiles, setNewFiles] = useState<FileList | null>(null);

  const [loadingProposal, setLoadingProposal] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [editMode, setEditMode] = useState(false);

  /* --------------------------------------------------------
     1) Resolve supplier & profile from auth
  -------------------------------------------------------- */
  useEffect(() => {
    const loadUserContext = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile?.id) return;
      setProfileId(profile.id);

      const { data: contact } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!contact?.supplier_id) return;
      setSupplierId(contact.supplier_id);
    };

    loadUserContext();
  }, [router]);

  /* --------------------------------------------------------
     2) Load RFQ details via existing /api/rfqs?id=...
  -------------------------------------------------------- */
  useEffect(() => {
    if (!rfqId) return;

    const loadRfq = async () => {
      setLoadingRfq(true);
      try {
        const res = await fetch(`/api/rfqs?id=${rfqId}`);
        const json = await res.json();
        if (json.success) {
          setRfq(json.rfq);
        }
      } catch (err) {
        console.error("Error loading RFQ:", err);
      }
      setLoadingRfq(false);
    };

    loadRfq();
  }, [rfqId]);

  /* --------------------------------------------------------
     3) Load proposals + attachments for this supplier & RFQ
  -------------------------------------------------------- */
  useEffect(() => {
    if (!rfqId || !supplierId) return;

    const loadProposalStuff = async () => {
      setLoadingProposal(true);

      // 3a) Load proposals
      const { data: proposals, error: pErr } = await supabase
        .from("proposal_submissions")
        .select(
          "id, rfq_id, supplier_id, submission_text, status, submitted_at"
        )
        .eq("rfq_id", rfqId)
        .eq("supplier_id", supplierId)
        .order("submitted_at", { ascending: false });

      if (pErr) {
        console.error("Error loading proposals:", pErr.message);
        setLoadingProposal(false);
        return;
      }

      if (!proposals || proposals.length === 0) {
        setCurrentProposal(null);
        setProposalHistory([]);
        setAttachments([]);
        setProposalText("");
        setLoadingProposal(false);
        return;
      }

      const latest = proposals[0] as Proposal;
      const history = proposals.slice(1) as Proposal[];

      setCurrentProposal(latest);
      setProposalHistory(history);
      setProposalText(latest.submission_text || "");

      // 3b) Load attachments for ALL proposals (so history can be extended later)
      const proposalIds = proposals.map((p: any) => p.id);

      const { data: docs, error: dErr } = await supabase
        .from("proposal_documents")
        .select("id, proposal_submission_id, file_id, uploaded_at")
        .in("proposal_submission_id", proposalIds);

      if (dErr) {
        console.error("Error loading proposal_documents:", dErr.message);
        setAttachments([]);
        setLoadingProposal(false);
        return;
      }

      const fileIds = (docs || [])
        .map((d: any) => d.file_id)
        .filter(Boolean);

      let filesById: Record<string, any> = {};

      if (fileIds.length) {
        const { data: fileRows, error: fErr } = await supabase
          .from("files")
          .select("id, filename, storage_path, uploaded_at")
          .in("id", fileIds);

        if (fErr) {
          console.error("Error loading files:", fErr.message);
        } else {
          (fileRows || []).forEach((f: any) => {
            filesById[f.id] = f;
          });
        }
      }

      // Build attachments list for CURRENT proposal only
      const currentAttachments: Attachment[] = (docs || [])
        .filter((d: any) => d.proposal_submission_id === latest.id)
        .map((d: any) => {
          const f = filesById[d.file_id];
          if (!f) return null;

          const { data: pub } = supabase.storage
            .from("proposal-docs")
            .getPublicUrl(f.storage_path);

          return {
            id: d.id,
            file_id: d.file_id,
            filename: f.filename,
            public_url: pub?.publicUrl || null,
            uploaded_at: d.uploaded_at,
          } as Attachment;
        })
        .filter(Boolean) as Attachment[];

      setAttachments(currentAttachments);
      setLoadingProposal(false);
    };

    loadProposalStuff();
  }, [rfqId, supplierId]);

  /* --------------------------------------------------------
     Handlers
  -------------------------------------------------------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewFiles(e.target.files);
  };

  const handleSubmitProposal = async () => {
    if (!rfqId || !supplierId || !profileId) return;
    if (!proposalText.trim()) {
      alert("Please enter proposal text.");
      return;
    }

    try {
      setSubmitting(true);

      // 1) Create new proposal version
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_id: rfqId,
          supplier_id: supplierId,
          submitted_by_profile_id: profileId,
          submission_text: proposalText,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.error("Proposal submit error:", json.error);
        alert("Failed to submit proposal.");
        setSubmitting(false);
        return;
      }

      const proposalId = json.proposalId as string;

      // 2) Upload attachments (if any)
      if (newFiles && newFiles.length > 0) {
        const form = new FormData();
        form.append("proposal_id", proposalId);
        form.append("uploaded_by_profile_id", profileId);

        Array.from(newFiles).forEach((file) => {
          form.append("files", file);
        });

        setUploadingFiles(true);
        const uploadRes = await fetch("/api/proposals/upload", {
          method: "POST",
          body: form,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          console.error("Attachment upload error:", uploadJson.error);
          alert("Proposal saved, but file upload failed.");
        }
        setUploadingFiles(false);
      }

      // Refresh proposals + attachments
      setNewFiles(null);
      setEditMode(false);

      // Re-run proposals load
      const { data: proposals, error: pErr } = await supabase
        .from("proposal_submissions")
        .select(
          "id, rfq_id, supplier_id, submission_text, status, submitted_at"
        )
        .eq("rfq_id", rfqId)
        .eq("supplier_id", supplierId)
        .order("submitted_at", { ascending: false });

      if (!pErr && proposals && proposals.length > 0) {
        const latest = proposals[0] as Proposal;
        setCurrentProposal(latest);
        setProposalHistory(proposals.slice(1) as Proposal[]);
        setProposalText(latest.submission_text || "");
      }

      alert("Proposal submitted successfully.");
    } catch (err) {
      console.error("Submit proposal failed:", err);
      alert("Failed to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadAttachmentsOnly = async () => {
    if (!currentProposal || !profileId || !newFiles || newFiles.length === 0)
      return;

    try {
      setUploadingFiles(true);

      const form = new FormData();
      form.append("proposal_id", currentProposal.id);
      form.append("uploaded_by_profile_id", profileId);

      Array.from(newFiles).forEach((file) => {
        form.append("files", file);
      });

      const uploadRes = await fetch("/api/proposals/upload", {
        method: "POST",
        body: form,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) {
        console.error("Attachment upload error:", uploadJson.error);
        alert("File upload failed.");
      } else {
        // Reload attachments for current proposal
        const { data: docs } = await supabase
          .from("proposal_documents")
          .select("id, proposal_submission_id, file_id, uploaded_at")
          .eq("proposal_submission_id", currentProposal.id);

        const fileIds = (docs || []).map((d: any) => d.file_id).filter(Boolean);
        let filesById: Record<string, any> = {};
        if (fileIds.length) {
          const { data: fileRows } = await supabase
            .from("files")
            .select("id, filename, storage_path, uploaded_at")
            .in("id", fileIds);

          (fileRows || []).forEach((f: any) => {
            filesById[f.id] = f;
          });
        }

        const newAttachments: Attachment[] = (docs || []).map((d: any) => {
          const f = filesById[d.file_id];
          if (!f) return null;

          const { data: pub } = supabase.storage
            .from("proposal-docs")
            .getPublicUrl(f.storage_path);

          return {
            id: d.id,
            file_id: d.file_id,
            filename: f.filename,
            public_url: pub?.publicUrl || null,
            uploaded_at: d.uploaded_at,
          } as Attachment;
        }).filter(Boolean) as Attachment[];

        setAttachments(newAttachments);
        setNewFiles(null);
        alert("Attachments uploaded successfully.");
      }
    } catch (err) {
      console.error("Upload attachments failed:", err);
      alert("File upload failed.");
    } finally {
      setUploadingFiles(false);
    }
  };

  /* --------------------------------------------------------
     Render
  -------------------------------------------------------- */

  if (loadingRfq) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-300">
        <Loader2 className="animate-spin mr-2" /> Loading opportunity...
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="py-20 text-center text-red-400">
        RFQ not found or not accessible.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RFQ Header */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {rfq.title}
        </h1>
        <p className="text-gray-400 text-sm mb-3">{rfq.summary}</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            Created:{" "}
            {rfq.created_at
              ? new Date(rfq.created_at).toLocaleString()
              : "-"}
          </span>
          <span className="px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs">
            Visibility: {rfq.visibility}
          </span>
          <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs">
            Status: {rfq.status}
          </span>
        </div>
      </div>

      {/* RFQ Items */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-indigo-400" />
          <h2 className="font-semibold">Items</h2>
        </div>
        {rfq.rfq_items && rfq.rfq_items.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {rfq.rfq_items.map((it: any) => (
              <div
                key={it.id}
                className="py-3 flex justify-between items-center text-sm"
              >
                <div>
                  <div className="font-medium text-gray-100">
                    {it.description}
                  </div>
                </div>
                <div className="text-right text-gray-300">
                  <div>
                    {it.qty} {it.uom}
                  </div>
                  {it.estimated_value && (
                    <div className="text-xs text-gray-500">
                      Est: {it.estimated_value}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No items defined.</p>
        )}
      </div>

      {/* RFQ Documents */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip size={18} className="text-indigo-400" />
          <h2 className="font-semibold">RFQ Documents</h2>
        </div>
        {rfq.rfq_documents && rfq.rfq_documents.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto">
            {rfq.rfq_documents.map((doc: any, idx: number) => (
              <a
                key={idx}
                href={doc.file_url}
                target="_blank"
                className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg text-xs hover:bg-gray-700 border border-gray-700"
              >
                <FileText size={14} /> {doc.file_name}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No documents attached.</p>
        )}
      </div>

      {/* Proposal Section */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-indigo-400" />
            <h2 className="font-semibold">My Proposal</h2>
          </div>
          {currentProposal && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Last submitted:{" "}
                {new Date(
                  currentProposal.submitted_at
                ).toLocaleString()}
              </span>
              <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">
                {currentProposal.status}
              </span>
            </div>
          )}
        </div>

        {/* Proposal Text Area */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Proposal text
          </label>
          <textarea
            rows={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm outline-none focus:border-indigo-500"
            value={proposalText}
            onChange={(e) => setProposalText(e.target.value)}
            readOnly={!!currentProposal && !editMode}
            placeholder="Describe your solution, commercial terms, delivery, etc."
          />
          {currentProposal && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-gray-600 hover:border-indigo-500 text-gray-200"
            >
              <Edit3 size={14} /> Edit proposal
            </button>
          )}
          {currentProposal && editMode && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSubmitProposal}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Save & resubmit
              </button>
              <button
                onClick={() => {
                  if (currentProposal) {
                    setProposalText(currentProposal.submission_text || "");
                  }
                  setEditMode(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-700 text-xs text-gray-300 hover:border-gray-500"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* If no proposal yet → submit button */}
        {!currentProposal && (
          <button
            onClick={handleSubmitProposal}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Submit proposal
          </button>
        )}

        {/* Attachments for current proposal */}
        {currentProposal && (
          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={16} className="text-indigo-400" />
              <h3 className="font-medium text-sm">Attachments</h3>
            </div>

            {attachments.length === 0 && (
              <p className="text-xs text-gray-500">
                No attachments uploaded for this proposal yet.
              </p>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.public_url || "#"}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-xs hover:bg-gray-700"
                  >
                    <FileText size={14} />
                    <span className="truncate max-w-[180px]">
                      {att.filename}
                    </span>
                  </a>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="block text-xs text-gray-300"
              />
              <button
                onClick={
                  currentProposal ? handleUploadAttachmentsOnly : handleSubmitProposal
                }
                disabled={uploadingFiles || submitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-gray-800 border border-gray-700 hover:border-indigo-500 text-xs"
              >
                {uploadingFiles ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Paperclip size={14} />
                )}
                {currentProposal
                  ? "Upload attachments"
                  : "Submit proposal + attachments"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Proposal History */}
      {proposalHistory.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <History size={18} className="text-indigo-400" />
            <h2 className="font-semibold">Proposal history</h2>
          </div>
          <div className="space-y-3 text-sm">
            {proposalHistory.map((p) => (
              <div
                key={p.id}
                className="border border-gray-800 rounded-lg p-3 bg-gray-900/60"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">
                    Submitted: {new Date(p.submitted_at).toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-200 text-[11px]">
                    {p.status}
                  </span>
                </div>
                <div className="text-gray-300 text-xs line-clamp-3">
                  {p.submission_text || "(no text)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
