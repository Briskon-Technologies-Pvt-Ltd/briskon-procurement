"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  FilePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

/* -------------------------
  Supabase client (anon) for front-end uploads
--------------------------*/
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------------------------
  Types
--------------------------*/
type Auction = any;
type FileRecord = {
  id: string;
  storage_path: string | null;
  filename: string | null;
  content_type?: string | null;
  size?: number | null;
  public_url?: string | null;
};

export default function AuctionEditPage() {
  const { id } = useParams();
  const router = useRouter();

  // loading & data
  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [auctionType, setAuctionType] = useState<string>("standard_reverse");
  const [title, setTitle] = useState<string>("");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  const [startingPrice, setStartingPrice] = useState<string>("");
  const [minDecrement, setMinDecrement] = useState<string>("");
  const [reservePrice, setReservePrice] = useState<string>("");
  const [supplierChat, setSupplierChat] = useState<boolean>(false);
  const [supplierAttachmentsAllowed, setSupplierAttachmentsAllowed] = useState<boolean>(false);
  const [autoExtendEnabled, setAutoExtendEnabled] = useState<boolean>(false);
  const [autoExtendMinutes, setAutoExtendMinutes] = useState<number>(3);
  const [autoExtendWindowSeconds, setAutoExtendWindowSeconds] = useState<number>(60);

  // items management
  const [items, setItems] = useState<any[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);

  // suppliers
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

  // files
  const [existingFiles, setExistingFiles] = useState<FileRecord[]>([]);
  const [filesMarkedForDelete, setFilesMarkedForDelete] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // form state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // NEW: determine editability based on publication status only
  const canEdit = useMemo(() => {
    if (!auction) return true;
    return auction.status !== "published";
  }, [auction]);

  // load auction
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/auctions?id=${id}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load auction");
        }
        const a: Auction = json.auction;

        const cfg = a.config || {};
        setAuction(a);
        setInitialSnapshot({
          auction: a,
          items: json.auction?.auction_items || [],
          suppliers: json.auction?.suppliers || [],
          files: json.auction?.files || [],
        });

        setAuctionType(a.auction_type || "standard_reverse");
        setTitle(cfg.title || cfg.name || (a.config?.title ?? ""));
        setStartAt(a.start_at ? new Date(a.start_at).toISOString().slice(0, 16) : "");
        setEndAt(a.end_at ? new Date(a.end_at).toISOString().slice(0, 16) : "");
        setStartingPrice(String(cfg.starting_price ?? ""));
        setMinDecrement(String(cfg.min_decrement ?? ""));
        setReservePrice(String(cfg.reserve_price ?? ""));
        setSupplierChat(Boolean(cfg.supplier_chat));
        setSupplierAttachmentsAllowed(Boolean(cfg.supplier_attachments_allowed));
        setAutoExtendEnabled(Boolean(cfg.auto_extend_enabled));
        setAutoExtendMinutes(Number(cfg.auto_extend_minutes || 3));
        setAutoExtendWindowSeconds(Number(cfg.auto_extend_window_seconds || 60));

        const loadedItems = json.auction?.auction_items || [];
        setItems(loadedItems.map((it: any) => ({ ...it })));

        const loadedSuppliers = json.auction?.suppliers || [];
        setSuppliers(loadedSuppliers);
        setSelectedSupplierIds(loadedSuppliers.map((s: any) => s.id));

        const loadedFiles: FileRecord[] = (json.auction?.files || []).map((f: any) => ({
          id: f.id,
          storage_path: f.storage_path,
          filename: f.filename,
          content_type: f.content_type,
          size: f.size,
          public_url: f.public_url || f.file_url || null,
        }));
        setExistingFiles(loadedFiles);
      } catch (err: any) {
        console.error("Auction load error:", err);
        setError(err.message || "Failed to load auction");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // items helpers
  const addItem = () =>
    setItems((p) => [...p, { id: null, description: "", qty: 1, uom: "", tempId: uuidv4() }]);

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed?.id) setItemsToDelete((s) => [...s, removed.id]);
      return copy;
    });
  };

  // supplier toggle
  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // files handlers
  const markFileForDelete = (fileId: string) => {
    setFilesMarkedForDelete((p) => (p.includes(fileId) ? p.filter((x) => x !== fileId) : [...p, fileId]));
  };
  const handleNewFiles = (list: FileList | null) => {
    if (!list) return;
    setNewFiles((p) => [...p, ...Array.from(list)]);
  };

  // Validation
  function validate() {
    setFormError(null);
    if (!title.trim()) return "Title is required";
    if (!startAt) return "Start date/time required";
    if (!endAt) return "End date/time required";
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return "End must be after start";
    if (auction?.visibility_mode === "invited" && selectedSupplierIds.length === 0)
      return "Please select at least one invited supplier (visibility: invited).";
    return null;
  }

  // Build diffs (same as prior code)...
  function buildFieldsDiff() {
    if (!initialSnapshot) return {};
    const fields: any = {};

    const auctionUpdates: any = {};
    if ((auction?.auction_type || "") !== auctionType) auctionUpdates.auction_type = auctionType;

    const initStart = initialSnapshot.auction?.start_at ? new Date(initialSnapshot.auction.start_at).toISOString().slice(0, 16) : "";
    const initEnd = initialSnapshot.auction?.end_at ? new Date(initialSnapshot.auction.end_at).toISOString().slice(0, 16) : "";
    if (initStart !== (startAt || "")) auctionUpdates.start_at = startAt ? new Date(startAt).toISOString() : null;
    if (initEnd !== (endAt || "")) auctionUpdates.end_at = endAt ? new Date(endAt).toISOString() : null;

    const cfgUpdates: any = {};
    const initCfg = initialSnapshot.auction?.config || {};
    if ((initCfg.title || "") !== title) cfgUpdates.title = title;
    if ((String(initCfg.starting_price || "") !== String(startingPrice || ""))) cfgUpdates.starting_price = startingPrice || null;
    if ((String(initCfg.min_decrement || "") !== String(minDecrement || ""))) cfgUpdates.min_decrement = minDecrement || null;
    if ((String(initCfg.reserve_price || "") !== String(reservePrice || ""))) cfgUpdates.reserve_price = reservePrice || null;
    if ((Boolean(initCfg.supplier_chat) !== Boolean(supplierChat))) cfgUpdates.supplier_chat = supplierChat;
    if ((Boolean(initCfg.supplier_attachments_allowed) !== Boolean(supplierAttachmentsAllowed))) cfgUpdates.supplier_attachments_allowed = supplierAttachmentsAllowed;
    if ((Boolean(initCfg.auto_extend_enabled) !== Boolean(autoExtendEnabled))) cfgUpdates.auto_extend_enabled = autoExtendEnabled;
    if ((Number(initCfg.auto_extend_minutes || 0) !== Number(autoExtendMinutes || 0))) cfgUpdates.auto_extend_minutes = Number(autoExtendMinutes || 0);
    if ((Number(initCfg.auto_extend_window_seconds || 0) !== Number(autoExtendWindowSeconds || 0))) cfgUpdates.auto_extend_window_seconds = Number(autoExtendWindowSeconds || 0);

    if (Object.keys(cfgUpdates).length) auctionUpdates.config = { ...(initCfg || {}), ...cfgUpdates };

    if (Object.keys(auctionUpdates).length) fields.auction_updates = auctionUpdates;

    const originalItems = (initialSnapshot.items || []).map((i: any) => ({ ...i }));
    const originalById: Record<string, any> = {};
    originalItems.forEach((it: any) => { if (it.id) originalById[it.id] = it; });

    const itemsToAdd: any[] = [];
    const itemsToUpdate: any[] = [];

    items.forEach((it) => {
      if (!it.id) {
        itemsToAdd.push({
          id: uuidv4(),
          description: it.description || "",
          qty: Number(it.qty || 0),
          uom: it.uom || "",
        });
      } else {
        const orig = originalById[it.id];
        if (!orig) return;
        if (
          (orig.description || "") !== (it.description || "") ||
          Number(orig.qty || 0) !== Number(it.qty || 0) ||
          (orig.uom || "") !== (it.uom || "")
        ) {
          itemsToUpdate.push({
            id: it.id,
            description: it.description || "",
            qty: Number(it.qty || 0),
            uom: it.uom || "",
          });
        }
      }
    });

    const itemsToDeleteFinal = [...itemsToDelete];
    if (itemsToAdd.length || itemsToUpdate.length || itemsToDeleteFinal.length) {
      fields.items = { add: itemsToAdd, update: itemsToUpdate, delete: itemsToDeleteFinal };
    }

    const originalSupplierIds = (initialSnapshot.suppliers || []).map((s: any) => s.id);
    const toAddSuppliers = selectedSupplierIds.filter((id: string) => !originalSupplierIds.includes(id));
    const toRemoveSuppliers = originalSupplierIds.filter((id: string) => !selectedSupplierIds.includes(id));
    if (toAddSuppliers.length || toRemoveSuppliers.length) {
      fields.visibility = { add: toAddSuppliers, remove: toRemoveSuppliers };
    }

    if (filesMarkedForDelete.length) fields.files_to_delete = filesMarkedForDelete;

    return fields;
  }

  // upload new files (same as before)
  async function uploadNewFiles(): Promise<FileRecord[]> {
    if (!newFiles || newFiles.length === 0) return [];
    setUploadingFiles(true);
    const uploaded: FileRecord[] = [];

    for (const f of newFiles) {
      try {
        const ext = (f.name || "").split(".").pop() || "bin";
        const path = `auction_docs/${Date.now()}_${uuidv4()}.${ext}`;

        const ab = await f.arrayBuffer();
        const up = await clientSupabase.storage.from("auction-documents").upload(path, Buffer.from(ab), { upsert: false });
        if (up.error) {
          console.warn("upload err:", up.error.message);
          continue;
        }
        const { data: pub } = clientSupabase.storage.from("auction-documents").getPublicUrl(path);
        const meta: FileRecord = {
          id: uuidv4(),
          storage_path: path,
          filename: f.name,
          content_type: (f as any).type || null,
          size: (f as any).size || null,
          public_url: pub?.publicUrl || null,
        };
        uploaded.push(meta);
      } catch (e: any) {
        console.warn("upload fail:", e?.message || e);
      }
    }

    setUploadingFiles(false);
    return uploaded;
  }

  // submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!canEdit) {
      setFormError("This auction is published — editing is locked.");
      return;
    }

    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const uploadedFileMetas = await uploadNewFiles();

      const fields = buildFieldsDiff();
      if (uploadedFileMetas.length) {
        fields.files_to_add = uploadedFileMetas.map((f) => ({
          storage_path: f.storage_path,
          filename: f.filename,
          content_type: f.content_type,
          size: f.size,
          public_url: f.public_url,
        }));
      }

      const res = await fetch("/api/auctions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "update", fields }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");

      alert("Auction updated successfully");
      router.push(`/admin/auctions/${id}`);
    } catch (err: any) {
      console.error("Update error:", err);
      setFormError(err.message || "Failed to update auction");
    } finally {
      setSubmitting(false);
    }
  };

  const removeNewFileAt = (idx: number) => setNewFiles((p) => p.filter((_, i) => i !== idx));

  if (loading) return <div className="p-8 text-center text-gray-600"><Loader2 className="mx-auto animate-spin" /> Loading auction...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!auction) return <div className="p-6 text-gray-600">Auction not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit auction</h1>
          <p className="text-sm text-gray-500 mt-1">{initialSnapshot?.auction?.config?.title || auction.id}</p>
        </div>

        <div className="text-sm text-right">
          <div className="text-xs text-gray-500">Status</div>
          <div className="mt-1 px-3 py-1 rounded-full text-xs font-medium">{auction.status}</div>
          <div className="text-xs text-gray-400 mt-2">Created {new Date(auction.created_at).toLocaleString()}</div>
        </div>
      </header>

      {formError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{formError}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        {/* Auction fields (disabled when published via canEdit) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Auction type</label>
            <select value={auctionType} onChange={(e) => setAuctionType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" disabled={!canEdit}>
              <option value="standard_reverse">Standard Reverse (price decreasing)</option>
              <option value="ranked_reverse">Ranked Reverse</option>
              <option value="sealed_bid">Sealed Bid</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Auction title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Auction title" required disabled={!canEdit} />
          </div>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Start date & time</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" disabled={!canEdit} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">End date & time</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" disabled={!canEdit} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Duration</label>
            <div className="w-full border rounded px-3 py-2 text-sm text-gray-700">
              {startAt && endAt ? (() => {
                const s = new Date(startAt).getTime(), e = new Date(endAt).getTime();
                if (isNaN(s) || isNaN(e) || e <= s) return "—";
                const mins = Math.round((e - s) / 60000);
                if (mins < 60) return `${mins} min`;
                if (mins < 1440) return `${(mins / 60).toFixed(1)} hrs`;
                return `${(mins / 1440).toFixed(1)} days`;
              })() : "—"}
            </div>
          </div>
        </div>

        {/* Items */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Auction items</h2>
            <button type="button" onClick={addItem} disabled={!canEdit} className="text-sm text-blue-600"><FilePlus /> Add item</button>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-center">UOM</th>
                  <th className="px-3 py-2 text-center">Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((itm, idx) => (
                  <tr key={itm.id ?? itm.tempId ?? idx} className="border-t">
                    <td className="px-3 py-2"><input disabled={!canEdit} type="text" value={itm.description || ""} onChange={(e) => updateItem(idx, "description", e.target.value)} className="w-full border rounded p-1" /></td>
                    <td className="px-3 py-2 text-center"><input disabled={!canEdit} type="number" value={itm.qty ?? 1} onChange={(e) => updateItem(idx, "qty", e.target.value)} className="w-20 border rounded text-center p-1" /></td>
                    <td className="px-3 py-2 text-center"><input disabled={!canEdit} type="text" value={itm.uom || ""} onChange={(e) => updateItem(idx, "uom", e.target.value)} className="w-20 border rounded text-center p-1" /></td>
                    <td className="px-3 py-2 text-center"><button disabled={!canEdit} type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800"><Trash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Suppliers */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Suppliers</h2>
            <div className="text-sm text-gray-500">Toggle invited suppliers</div>
          </div>

          {auction.visibility_mode === "public" ? (
            <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 p-2 rounded">
              This auction is public — visible to all approved suppliers.
            </div>
          ) : null}

          <div className="mt-2 max-h-48 overflow-auto border rounded p-2 bg-gray-50">
            {suppliers && suppliers.length ? suppliers.map((s) => (
              <label key={s.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-white">
                <div className="text-sm">
                  <div className="font-medium">{s.company_name}</div>
                  <div className="text-xs text-gray-500">{s.contacts?.[0]?.email || "-"}{s.contacts?.[0]?.phone ? ` • ${s.contacts?.[0]?.phone}` : ""}</div>
                </div>
                <input disabled={!canEdit} type="checkbox" checked={selectedSupplierIds.includes(s.id)} onChange={() => toggleSupplier(s.id)} />
              </label>
            )) : (
              <div className="text-sm text-gray-500">No pre-invited suppliers for this auction.</div>
            )}
          </div>
        </section>

        {/* Files */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Files</h2>
            <div className="text-sm text-gray-500">Upload or remove documents</div>
          </div>

          <div className="space-y-2 mb-3">
            {existingFiles.length ? existingFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                <div>
                  <div className="font-medium">{f.filename || f.storage_path?.split("/").pop()}</div>
                  <div className="text-xs text-gray-500">{f.public_url || f.storage_path}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={f.public_url || "#"} target="_blank" rel="noreferrer" className="text-blue-600">Open</a>
                  <button type="button" onClick={() => markFileForDelete(f.id)} className={`text-sm ${filesMarkedForDelete.includes(f.id) ? "text-amber-600" : "text-red-600"}`} disabled={!canEdit}>
                    {filesMarkedForDelete.includes(f.id) ? "Undo" : "Delete"}
                  </button>
                </div>
              </div>
            )) : <div className="text-sm text-gray-500">No attachments uploaded.</div>}
          </div>

          <div>
            <input disabled={!canEdit} type="file" multiple onChange={(e) => handleNewFiles(e.target.files)} />
            {newFiles.length > 0 && (
              <ul className="mt-2 text-sm">
                {newFiles.map((nf, idx) => (
                  <li key={idx} className="flex items-center justify-between py-1">
                    <span>{nf.name} <span className="text-xs text-gray-400">({Math.round(nf.size / 1024)} KB)</span></span>
                    <button disabled={!canEdit} type="button" onClick={() => removeNewFileAt(idx)} className="text-red-600 text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            <div><strong>From RFQ:</strong> {auction.rfq_id ?? "—"}</div>
            <div className="mt-1">Edits are locked once the auction is published.</div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.push(`/admin/auctions/${id}`)} className="px-4 py-2 border rounded text-sm">Back</button>

            <button type="submit" disabled={submitting || uploadingFiles || !canEdit} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm flex items-center gap-2">
              {submitting || uploadingFiles ? <Loader2 className="animate-spin w-4 h-4" /> : "Save changes"} <ArrowRight />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
