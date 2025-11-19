"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Edit,
  Save,
  X,
  Upload,
  Trash,
  CheckCircle,
  Clock,
  ArrowLeft,
  Rocket,
} from "lucide-react";

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type Supplier = {
  id: string;
  company_name: string;
  contacts?: Array<{ email?: string; phone?: string }>;
};

type AuctionFile = {
  filename: string;
  storage_path: string;
  public_url: string;
};

type AuctionItem = {
  id: string;
  rfq_item_id?: string | null;
  description: string;
  qty?: number | null;
  uom?: string;
};

type AuctionConfig = {
  title?: string;
  starting_price?: string;
  min_decrement?: string;
  reserve_price?: string;
  supplier_chat?: boolean;
  supplier_attachments_allowed?: boolean;
  supplier_required_docs?: string[];

  // auto extend (for standard)
  auto_extend_enabled?: boolean;
  auto_extend_minutes?: number;
  auto_extend_window_seconds?: number;
};

type Auction = {
  id: string;
  rfq_id?: string | null;
  rfq_title?: string | null;
  rfq_visibility?: "public" | "invited" | null;

  auction_type: "standard_reverse" | "ranked_reverse" | "sealed_bid";
  start_at: string | null;
  end_at: string | null;
  currency: string;

  status: string;
  config: AuctionConfig;

  auction_items: AuctionItem[];
  suppliers: Supplier[];
  files: AuctionFile[];
  created_at: string;
};

/* ---------------------------------------------------------
   Component
--------------------------------------------------------- */

export default function AuctionDetailsPage() {
  const { id } = useParams();
  const auctionId = id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI mode: view or edit
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [auctionType, setAuctionType] =
    useState<Auction["auction_type"]>("standard_reverse");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // Config
  const [cfg, setCfg] = useState<AuctionConfig>({});
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<AuctionFile[]>([]);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  /* ---------------------------------------------------------
     Load Auction
  --------------------------------------------------------- */

  useEffect(() => {
    if (!auctionId) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/auctions?id=${auctionId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Load failed");

        const a: Auction = json.auction;

        setAuction(a);
        setAuctionType(a.auction_type);
        setStartAt(a.start_at ? a.start_at.slice(0, 16) : "");
        setEndAt(a.end_at ? a.end_at.slice(0, 16) : "");
        setCfg(a.config || {});
        setItems(a.auction_items || []);
        setSuppliers(a.suppliers || []);
        setSelectedSupplierIds(a.suppliers.map((s) => s.id));
        setExistingFiles(a.files || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [auctionId]);

  /* ---------------------------------------------------------
     Save Changes (PATCH)
  --------------------------------------------------------- */
     
  function cleanNum(val: any) {
    if (val === undefined || val === null) return null;
    if (typeof val === "number") return val;
  
    if (typeof val === "string") {
      const v = val.trim();
      // Invalid numeric forms → convert to null
      if (v === "" || v === "-" || v === "+") return null;
      const num = Number(v);
      return isNaN(num) ? null : num;
    }
  
    return null;
  }
  
  const handleSave = async () => {
    try {

      setSaving(true);
      
      const sanitizedCfg = {
        ...cfg,
        starting_price: cleanNum(cfg.starting_price),
        reserve_price: cleanNum(cfg.reserve_price),
        min_decrement: cleanNum(cfg.min_decrement),
        auto_extend_minutes: cleanNum(cfg.auto_extend_minutes),
        auto_extend_window_seconds: cleanNum(cfg.auto_extend_window_seconds),
      };
      
      const fields: any = {
        auction_updates: {
          auction_type: auctionType,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          config: sanitizedCfg,
        },
        items: {
          add: [],
          update: [],
          delete: [],
        },
        visibility: {
          add: [],
          remove: [],
        },
        files_to_add: [],
        files_to_delete: [],
      };


      // Identify supplier changes
      const currentSupplierIds = auction?.suppliers.map((s) => s.id) || [];
      const added = selectedSupplierIds.filter((id) => !currentSupplierIds.includes(id));
      const removed = currentSupplierIds.filter((id) => !selectedSupplierIds.includes(id));

      fields.visibility.add = added;
      fields.visibility.remove = removed;

      // Files to delete
      const existingPaths = existingFiles.map((f) => f.storage_path);
      const originalPaths = auction?.files.map((f) => f.storage_path) || [];
      const removedFiles = originalPaths.filter((p) => !existingPaths.includes(p));
      fields.files_to_delete = removedFiles.map((p) => {
        const f = auction?.files.find((x) => x.storage_path === p);
        return f?.id || f?.storage_path || null;
      }).filter(Boolean);

      // New files to upload in FormData
      const fd = new FormData();
      fd.append("id", auctionId);
      fd.append("action", "update");
      fd.append("fields", JSON.stringify(fields));
      newFiles.forEach((file) => fd.append("new_files", file));
      const res = await fetch(`/api/auctions`, {
        method: "PATCH",
        body: fd,
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      alert("Changes saved");
      router.refresh();
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }

  };

  /* ---------------------------------------------------------
     Publish Auction
     (per your rule P3 → no strict validation)
  --------------------------------------------------------- */
  const handlePublish = async () => {
    try {
      setPublishing(true);
  
      const fd = new FormData();
      fd.append("id", auctionId);
      fd.append("action", "publish");
      fd.append("fields", JSON.stringify({}));
  
      const res = await fetch(`/api/auctions`, {
        method: "PATCH",
        body: fd,
      });
  
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
  
      alert("Auction published");
      router.refresh();
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };
  
  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  if (loading)
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        <p className="text-gray-500 mt-2">Loading auction...</p>
      </div>
    );

  if (error || !auction)
    return (
      <div className="p-8 max-w-xl mx-auto">
        <p className="text-red-600">{error || "Auction not found."}</p>
        <button
          onClick={() => router.push("/admin/auctions")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Back
        </button>
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Sticky Header */}
      <div className="sticky top-0 bg-white z-20 border-b py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeft
            className="w-5 h-5 cursor-pointer"
            onClick={() => router.push("/admin/auctions")}
          />
          <h1 className="text-xl font-semibold">{cfg.title || "Auction Details"}</h1>

          <span
            className={`px-2 py-1 text-xs rounded-full ml-4 ${
              auction.status === "draft"
                ? "bg-gray-200 text-gray-600"
                : auction.status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {auction.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {auction.status === "draft" && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2"
            >
              {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
              Publish <Rocket size={16} />
            </button>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
            >
              <Edit size={16} /> Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save <Save size={16} />
              </button>

              <button
                onClick={() => {
                  router.refresh();
                  setIsEditing(false);
                }}
                className="px-4 py-2 bg-gray-200 rounded flex items-center gap-2"
              >
                Cancel <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------
         FORM SECTIONS
      --------------------------------------------------------- */}

      {/* Basic Info */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">Basic Info</h2>

        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            disabled={!isEditing}
            value={cfg.title || ""}
            onChange={(e) => setCfg({ ...cfg, title: e.target.value })}
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Auction Type</label>
          <select
            disabled={!isEditing}
            value={auctionType}
            onChange={(e) => setAuctionType(e.target.value as any)}
            className="border px-3 py-2 rounded w-full"
          >
            <option value="standard_reverse">Standard Reverse</option>
            <option value="ranked_reverse">Ranked Reverse</option>
            <option value="sealed_bid">Sealed Bid</option>
          </select>
        </div>
      </section>

      {/* Schedule */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">Schedule</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Start</label>
            <input
              type="datetime-local"
              disabled={!isEditing}
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">End</label>
            <input
              type="datetime-local"
              disabled={!isEditing}
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
        </div>
      </section>

      {/* Config */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <label className="block text-sm mb-1">Starting Price</label>
            <input
              disabled={!isEditing}
              value={cfg.starting_price || ""}
              onChange={(e) => setCfg({ ...cfg, starting_price: e.target.value })}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Minimum Decrement</label>
            <input
              disabled={!isEditing}
              value={cfg.min_decrement || ""}
              onChange={(e) => setCfg({ ...cfg, min_decrement: e.target.value })}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Reserve Price</label>
            <input
              disabled={!isEditing}
              value={cfg.reserve_price || ""}
              onChange={(e) => setCfg({ ...cfg, reserve_price: e.target.value })}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
        </div>

        {/* Auto Extend */}
        <div className="mt-4 border-t pt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={!isEditing}
              checked={cfg.auto_extend_enabled || false}
              onChange={(e) => setCfg({ ...cfg, auto_extend_enabled: e.target.checked })}
            />
            Auto Extend (Standard only)
          </label>

          {cfg.auto_extend_enabled && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm mb-1">Minutes</label>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={cfg.auto_extend_minutes || 0}
                  onChange={(e) =>
                    setCfg({ ...cfg, auto_extend_minutes: Number(e.target.value) })
                  }
                  className="border px-3 py-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Window (seconds)</label>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={cfg.auto_extend_window_seconds || 0}
                  onChange={(e) =>
                    setCfg({ ...cfg, auto_extend_window_seconds: Number(e.target.value) })
                  }
                  className="border px-3 py-2 rounded w-full"
                />
              </div>
            </div>
          )}
        </div>

      </section>

      {/* Suppliers */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">Suppliers</h2>

        {/* Public auction */}
        {auction.rfq_visibility === "public" && (
          <div className="text-gray-600 text-sm italic">
            This is a <strong>public auction</strong>. Any supplier can participate.
          </div>
        )}

        {/* Invited auction with NO suppliers */}
        {auction.rfq_visibility === "invited" && suppliers.length === 0 && (
          <p className="text-gray-500">No suppliers invited.</p>
        )}

        {/* Invited auction with supplier list */}
        {auction.rfq_visibility === "invited" && suppliers.length > 0 && (
          <div className="space-y-2">
            {suppliers.map((s) => (
              <label key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.company_name}</p>
                  <p className="text-xs text-gray-500">
                    {s.contacts?.[0]?.email || "No email"}
                  </p>
                </div>

                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={selectedSupplierIds.includes(s.id)}
                  onChange={() =>
                    setSelectedSupplierIds((prev) =>
                      prev.includes(s.id)
                        ? prev.filter((x) => x !== s.id)
                        : [...prev, s.id]
                    )
                  }
                />
              </label>
            ))}
          </div>
        )}
      </section>


      {/* Files */}
      <section className="bg-white p-6 rounded shadow space-y-4">
  <h2 className="text-lg font-semibold">Files</h2>

  {/* LIST OF EXISTING FILES */}
  {existingFiles.length === 0 ? (
    <div className="text-gray-500">No files uploaded.</div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
      {existingFiles.map((f) => {
        const isImage = /\.(png|jpg|jpeg|webp)$/i.test(f.filename || "");
        const isPDF = /\.pdf$/i.test(f.filename || "");
        const isExcel = /\.(xls|xlsx)$/i.test(f.filename || "");
        const isWord = /\.(doc|docx)$/i.test(f.filename || "");
        const isZip = /\.zip$/i.test(f.filename || "");

        const shortName =
          f.filename?.replace(/^.*?_/, "") || "File";

        return (
          <div
            key={f.storage_path}
            className="border rounded-lg overflow-hidden bg-gray-50 shadow-sm"
          >
            {/* Thumbnail / Icon */}
            <a
              href={f.public_url || "#"}
              target="_blank"
              className="block"
            >
              <div className="h-40 flex items-center justify-center bg-white border-b">
                {isImage ? (
                  <img
                    src={f.public_url}
                    className="h-full w-full object-cover"
                    alt="file"
                  />
                ) : isPDF ? (
                  <div className="text-red-600 text-xl font-bold">PDF</div>
                ) : isExcel ? (
                  <div className="text-green-600 text-xl font-bold">XLS</div>
                ) : isWord ? (
                  <div className="text-blue-600 text-xl font-bold">DOC</div>
                ) : isZip ? (
                  <div className="text-yellow-600 text-xl font-bold">ZIP</div>
                ) : (
                  <div className="text-gray-500 text-sm">FILE</div>
                )}
              </div>
            </a>

            {/* Filename + Delete (if editing) */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm text-blue-700 truncate">
                {shortName}
              </span>

              {isEditing && (
                <button
                  onClick={() =>
                    setExistingFiles((prev) =>
                      prev.filter((x) => x.storage_path !== f.storage_path)
                    )
                  }
                  className="text-red-600 ml-3"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}

  {/* ADD NEW FILES */}
  {isEditing && (
    <div className="pt-4">
      <label className="block text-sm mb-1 font-medium">
        Add Files
      </label>
      <input
        type="file"
        multiple
        onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
        className="block w-full border rounded p-2 bg-white"
      />
    </div>
  )}
</section>

    </div>
  );
}
