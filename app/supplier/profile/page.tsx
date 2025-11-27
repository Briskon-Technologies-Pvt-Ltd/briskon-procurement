"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  DragEvent,
  ChangeEvent,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Building2,
  Globe2,
  ShieldCheck,
  Phone,
  Mail,
  UserCircle2,
  FolderOpen,
  FileText,
  AlertCircle,
  UploadCloud,
  X,
} from "lucide-react";

type SupplierCore = {
  id: string;
  company_name: string;
  country: string | null;
  registration_no: string | null;
  status: string;
  onboarded_org_name: string | null;
  metadata: any;
  created_at: string;
};

type SupplierContact = {
  id?: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string;
};

type SupplierDocument = {
  id: string;
  doc_type: string | null; // used as document name
  issued_by: string | null;
  valid_from: string | null;
  valid_to: string | null;
  file_url: string | null;
  storage_path: string | null;
  created_at: string;
};

type Category = { id: string; name: string };

type ProfileResponse = {
  supplier: SupplierCore;
  primary_contact: SupplierContact | null;
  contacts: SupplierContact[];
  categories: Category[];
  all_categories: Category[];
  documents: SupplierDocument[];
};

export default function SupplierProfilePage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [registrationNo, setRegistrationNo] = useState<string | null>(null);
  const [primaryContact, setPrimaryContact] = useState<SupplierContact | null>(
    null
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);

  const [newDocUploading, setNewDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  // Step 1: resolve supplierId from auth → profiles → supplier_contacts
  useEffect(() => {
    const loadSupplier = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profileRow?.id) return;

      const { data: contact } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profileRow.id)
        .maybeSingle();

      if (!contact?.supplier_id) return;

      setSupplierId(contact.supplier_id);
    };

    loadSupplier();
  }, []);

  const fetchProfile = useCallback(async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/supplier/profile?supplier_id=${sid}`);
      const json = await res.json();
      if (json.success) {
        const data: ProfileResponse = json.data;
        setProfile(data);

        // Initialize form state
        setCompanyName(data.supplier.company_name);
        setCountry(data.supplier.country ?? null);
        setRegistrationNo(data.supplier.registration_no ?? null);
        setPrimaryContact(
          data.primary_contact || {
            title: "",
            email: "",
            phone: "",
          }
        );
        setSelectedCategoryIds(data.categories.map((c) => c.id));
        setDocuments(data.documents);
      } else {
        setError(json.error || "Failed to load profile");
      }
    } catch (err) {
      console.error("Error loading supplier profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  // Step 2: Fetch profile data from API
  useEffect(() => {
    if (!supplierId) return;
    fetchProfile(supplierId);
  }, [supplierId, fetchProfile]);

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const statusPill = (status: string) => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "active") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
          <ShieldCheck className="w-3 h-3 mr-1" />
          {status}
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40">
          <AlertCircle className="w-3 h-3 mr-1" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/15 text-slate-200 border border-slate-500/40">
        {status}
      </span>
    );
  };

  const handleCancel = () => {
    if (profile) {
      setCompanyName(profile.supplier.company_name);
      setCountry(profile.supplier.country ?? null);
      setRegistrationNo(profile.supplier.registration_no ?? null);
      setPrimaryContact(
        profile.primary_contact || { title: "", email: "", phone: "" }
      );
      setSelectedCategoryIds(profile.categories.map((c) => c.id));
      setDocuments(profile.documents);
    }
    setEditMode(false);
    setDocUploadError(null);
  };

  const handleSave = async () => {
    if (!supplierId || !profile) return;
    setSaving(true);
    setError(null);
    try {
      // 1) Save core supplier + contacts + categories
      const payload = {
        supplier_id: supplierId,
        company_name: companyName,
        country,
        registration_no: registrationNo,
        metadata: profile.supplier.metadata ?? null,
        primary_contact: {
          id: primaryContact?.id ?? null,
          title: primaryContact?.title ?? null,
          email: primaryContact?.email ?? null,
          phone: primaryContact?.phone ?? null,
        },
        category_ids: selectedCategoryIds,
      };

      const res = await fetch("/api/supplier/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save profile");
        setSaving(false);
        return;
      }

      // 2) Save documents metadata (doc_type, issued_by, dates)
      const docPayload = {
        supplier_id: supplierId,
        documents: documents.map((d) => ({
          id: d.id,
          doc_type: d.doc_type,
          issued_by: d.issued_by,
          valid_from: d.valid_from,
          valid_to: d.valid_to,
        })),
      };

      const resDocs = await fetch(
        "/api/supplier/profile/documents/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(docPayload),
        }
      );

      const jsonDocs = await resDocs.json();
      if (!jsonDocs.success) {
        setError(jsonDocs.error || "Failed to save document details");
        setSaving(false);
        return;
      }

      // Reload profile from server
      await fetchProfile(supplierId);
      setEditMode(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDropFiles = async (files: FileList | null) => {
    if (!files || !supplierId) return;
    setNewDocUploading(true);
    setDocUploadError(null);

    try {
      const uploadedDocs: SupplierDocument[] = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const path = `${supplierId}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.${ext || "bin"}`;

        const bucket = "supplier-documents"; // adjust if your bucket differs

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(path, file);

        if (uploadErr) {
          console.error("Upload error:", uploadErr.message);
          setDocUploadError(uploadErr.message);
          continue;
        }

        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        const fileUrl = publicData?.publicUrl ?? null;

        const { data: inserted, error: insertErr } = await supabase
          .from("supplier_documents")
          .insert({
            supplier_id: supplierId,
            doc_type: nameWithoutExt || "Unspecified", // <- used as document name
            issued_by: null,
            valid_from: null,
            valid_to: null,
            file_url: fileUrl,
            storage_path: path,
          })
          .select(
            "id, doc_type, issued_by, valid_from, valid_to, file_url, storage_path, created_at"
          )
          .maybeSingle();

        if (insertErr) {
          console.error("Doc insert error:", insertErr.message);
          setDocUploadError(insertErr.message);
          continue;
        }

        if (inserted) {
          uploadedDocs.push(inserted as SupplierDocument);
        }
      }

      if (uploadedDocs.length > 0) {
        // prepend new docs
        setDocuments((prev) => [...uploadedDocs, ...prev]);
      }
    } catch (err: any) {
      console.error("File upload error:", err.message || err);
      setDocUploadError("Failed to upload document(s)");
    } finally {
      setNewDocUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: SupplierDocument) => {
    if (!supplierId) return;
    try {
      if (doc.storage_path) {
        const bucket = "supplier-documents";
        await supabase.storage.from(bucket).remove([doc.storage_path]);
      }

      await supabase.from("supplier_documents").delete().eq("id", doc.id);

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      console.error("Delete document error:", err);
      setDocUploadError("Failed to delete document");
    }
  };

  const onDropArea = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!editMode) return;
    const files = e.dataTransfer.files;
    void handleDropFiles(files);
  };

  const onDocInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editMode) return;
    const files = e.target.files;
    void handleDropFiles(files);
    e.target.value = "";
  };

  const addCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev : [...prev, categoryId]
    );
  };

  const removeCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
        Loading your profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-6 py-5 text-sm text-rose-100">
        {error || "Unable to load profile."}
      </div>
    );
  }

  const { supplier, contacts, all_categories } = profile;
  const pc = primaryContact;

  const availableCategories = all_categories.filter(
    (c) => !selectedCategoryIds.includes(c.id)
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl p-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 shadow-xl shadow-indigo-900/40 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Supplier profile
            </h1>
            <p className="mt-1 text-sm text-indigo-50/90 max-w-xl">
              View and maintain your company information, contact details,
              categories and compliance documents as seen by buyers.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2">
              {statusPill(supplier.status)}
            </div>
            <p className="text-[11px] text-indigo-100/80">
              Onboarded to:{" "}
              <span className="font-semibold">
                {supplier.onboarded_org_name || "Not linked to any buyer org"}
              </span>
            </p>
            <p className="text-[11px] text-indigo-100/70">
              Supplier since: {formatDate(supplier.created_at)}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {/* COMPANY + CONTACT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Company info */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-300" />
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Company information
                </h2>
                <p className="text-[11px] text-slate-400">
                  Core details stored in the supplier master.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-100">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                Legal name
              </p>
              {editMode ? (
                <input
                  className="w-full rounded-md bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              ) : (
                <p className="text-base font-medium">{supplier.company_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Country
                </p>
                {editMode ? (
                  <input
                    className="w-full rounded-md bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                    value={country ?? ""}
                    onChange={(e) =>
                      setCountry(e.target.value.trim() || null)
                    }
                    placeholder="Country"
                  />
                ) : (
                  <div className="inline-flex items-center gap-1 text-slate-100">
                    <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{supplier.country || "-"}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Registration / tax ID
                </p>
                {editMode ? (
                  <input
                    className="w-full rounded-md bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                    value={registrationNo ?? ""}
                    onChange={(e) =>
                      setRegistrationNo(e.target.value.trim() || null)
                    }
                    placeholder="e.g. GSTIN, VAT, PAN"
                  />
                ) : (
                  <div className="inline-flex items-center gap-1 text-slate-100">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{supplier.registration_no || "-"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Primary contact */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle2 className="w-5 h-5 text-indigo-300" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Primary contact
              </h2>
              <p className="text-[11px] text-slate-400">
                Main point of contact for sourcing teams.
              </p>
            </div>
          </div>

          {!pc && !editMode ? (
            <p className="text-xs text-slate-500">
              No contact record found. Ask your admin to add a supplier contact
              for your profile.
            </p>
          ) : (
            <div className="space-y-3 text-sm text-slate-100">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Title / role
                </p>
                {editMode ? (
                  <input
                    className="w-full rounded-md bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                    value={pc?.title ?? ""}
                    onChange={(e) =>
                      setPrimaryContact((prev) => ({
                        ...(prev || {}),
                        title: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p>{pc?.title || "-"}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Email
                </p>
                {editMode ? (
                  <input
                    className="w-full rounded-md bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                    value={pc?.email ?? ""}
                    onChange={(e) =>
                      setPrimaryContact((prev) => ({
                        ...(prev || {}),
                        email: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{pc?.email || "-"}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Phone
                </p>
                {editMode ? (
                  <input
                    className="w-full rounded-md bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                    value={pc?.phone ?? ""}
                    onChange={(e) =>
                      setPrimaryContact((prev) => ({
                        ...(prev || {}),
                        phone: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{pc?.phone || "-"}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {contacts.length > 1 && !editMode && (
            <div className="mt-3 border-t border-slate-800/80 pt-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                Other contacts
              </p>
              <ul className="space-y-1 text-[12px] text-slate-300">
                {contacts.slice(1).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>{c.title || "Contact"}</span>
                    <span className="text-slate-400">
                      {c.email || c.phone || "-"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* CATEGORIES + DOCUMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Categories */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-5 h-5 text-indigo-300" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Categories registered for
              </h2>
              <p className="text-[11px] text-slate-400">
                Sourcing categories where your company can participate.
              </p>
            </div>
          </div>

          {selectedCategoryIds.length === 0 && !editMode && (
            <p className="text-xs text-slate-500">
              No categories mapped yet. You may not receive targeted RFQs until
              a buyer or admin assigns categories to your profile.
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {selectedCategoryIds.map((id) => {
              const cat = all_categories.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-indigo-500/10 text-indigo-200 border border-indigo-400/40"
                >
                  {cat.name}
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => removeCategory(id)}
                      className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-indigo-500/30"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              );
            })}
            {selectedCategoryIds.length === 0 && editMode && (
              <span className="text-[12px] text-slate-500">
                No categories selected yet. Use the selector below to add.
              </span>
            )}
          </div>

          {editMode && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Add category
              </p>
              <div className="flex gap-2 items-center">
                <select
                  className="flex-1 rounded-md bg-slate-900/80 border border-slate-700 px-2 py-2 text-[12px] text-slate-100 outline-none focus:border-indigo-400"
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    addCategory(value);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    Select category…
                  </option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Documents */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-300" />
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Compliance & documents
                </h2>
                <p className="text-[11px] text-slate-400">
                  Certificates, registrations and other documents linked to your
                  supplier record.
                </p>
              </div>
            </div>
          </div>

          {editMode && (
            <div className="mb-3">
              <div
                className="rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-4 text-center text-xs text-slate-300 hover:border-indigo-400 hover:bg-slate-900/80 transition-colors cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={onDropArea}
                onClick={() => {
                  const input = document.getElementById(
                    "doc-file-input"
                  ) as HTMLInputElement | null;
                  input?.click();
                }}
              >
                <input
                  id="doc-file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onDocInputChange}
                />
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-300" />
                  <div>
                    Drag & drop files here or{" "}
                    <span className="underline">click to browse</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supported: PDF, DOC, DOCX, PNG, JPG
                  </div>
                </div>
              </div>
              {newDocUploading && (
                <p className="text-[11px] text-indigo-300 mb-1">
                  Uploading document(s)…
                </p>
              )}
              {docUploadError && (
                <p className="text-[11px] text-rose-300 mb-1">
                  {docUploadError}
                </p>
              )}
            </div>
          )}

          {documents.length === 0 ? (
            <p className="text-xs text-slate-500">
              No documents uploaded yet.
            </p>
          ) : (
            <div className="overflow-x-auto text-xs text-slate-100">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead className="text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="text-left pr-3">Document name</th>
                    <th className="text-left pr-3">Issued by</th>
                    <th className="text-left pr-3">Valid from</th>
                    <th className="text-left pr-3">Valid to</th>
                    <th className="text-right pr-1">File</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="bg-slate-900/70 border border-slate-800/80 rounded-xl"
                    >
                      {/* Document name (doc_type) */}
                      <td className="py-2 px-3 rounded-l-xl">
                        {editMode ? (
                          <input
                            className="w-full rounded-md bg-slate-800/80 border border-slate-700 px-2 py-1 text-xs text-slate-100"
                            value={doc.doc_type ?? ""}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.id === doc.id
                                    ? { ...d, doc_type: e.target.value }
                                    : d
                                )
                              )
                            }
                            placeholder="e.g. GST Certificate"
                          />
                        ) : (
                          <span>{doc.doc_type || "Unspecified"}</span>
                        )}
                      </td>

                      {/* Issued by */}
                      <td className="py-2 px-3">
                        {editMode ? (
                          <input
                            className="w-full rounded-md bg-slate-800/80 border border-slate-700 px-2 py-1 text-xs text-slate-100"
                            value={doc.issued_by ?? ""}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.id === doc.id
                                    ? { ...d, issued_by: e.target.value }
                                    : d
                                )
                              )
                            }
                            placeholder="e.g. Govt of India"
                          />
                        ) : (
                          <span>{doc.issued_by || "-"}</span>
                        )}
                      </td>

                      {/* Valid from */}
                      <td className="py-2 px-3">
                        {editMode ? (
                          <input
                            type="date"
                            className="bg-slate-800/80 border border-slate-700 px-2 py-1 rounded-md text-xs text-slate-100"
                            value={doc.valid_from ?? ""}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.id === doc.id
                                    ? { ...d, valid_from: e.target.value }
                                    : d
                                )
                              )
                            }
                          />
                        ) : (
                          <span>{formatDate(doc.valid_from)}</span>
                        )}
                      </td>

                      {/* Valid to */}
                      <td className="py-2 px-3">
                        {editMode ? (
                          <input
                            type="date"
                            className="bg-slate-800/80 border border-slate-700 px-2 py-1 rounded-md text-xs text-slate-100"
                            value={doc.valid_to ?? ""}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.id === doc.id
                                    ? { ...d, valid_to: e.target.value }
                                    : d
                                )
                              )
                            }
                          />
                        ) : (
                          <span>{formatDate(doc.valid_to)}</span>
                        )}
                      </td>

                      {/* View / Delete */}

                      <td className="py-2 px-3 rounded-r-xl text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.storage_path ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!doc.storage_path) return;
                                const cleanedPath = doc.storage_path.replace(/^\//, "");
                                const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                                const fullUrl = `${baseUrl}/storage/v1/object/public/supplier-documents/${cleanedPath}`;
                                console.log("Opening file:", fullUrl);
                                window.open(fullUrl, "_blank", "noopener,noreferrer");
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold px-2.5 py-1 text-slate-50"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-slate-500">No file</span>
                          )}

                          {editMode && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc)}
                              className="inline-flex items-center justify-center rounded-md border border-rose-500/40 text-rose-300 hover:bg-rose-900/40 px-1.5 py-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>


                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="flex justify-end gap-3 pt-2 pb-6">
        {!editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="inline-flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold px-4 py-2 text-slate-50 shadow-sm shadow-indigo-500/40"
          >
            Edit profile
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold px-4 py-2 text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold px-4 py-2 text-slate-50 shadow-sm shadow-indigo-500/40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )
        }
      </div >
    </div >
  );
}
