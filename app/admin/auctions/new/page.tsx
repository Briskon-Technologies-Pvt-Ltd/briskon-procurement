"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  FilePlus,
  Loader2,
} from "lucide-react";

/* ---------------------------
  Types
----------------------------*/
type RFQ = {
  id: string;
  title: string;
  currency?: string;
  organization_id?: string;   // <--- added
  created_by?: string;        // <--- added
  visibility?: "public" | "invited";
  rfq_items?: Array<{
    id: string;
    description: string;
    qty?: number;
    uom?: string;
    estimated_value?: number;
  }>;
  invited_suppliers?: Array<{
    id: string;
    company_name: string;
    contacts?: Array<{ email?: string; phone?: string }>;
  }>;
  rfq_documents?: Array<{ file_name?: string; file_url?: string; storage_path?: string }>;
};

type AuctionCreateResponse = {
  success: boolean;
  auctionId?: string;
  error?: string;
};

/* ---------------------------
  Component
----------------------------*/
export default function AuctionCreateFromRFQPage() {
  const router = useRouter();
  const search = useSearchParams();
  const fromRfq = search.get("from_rfq");

  const [loadingRfq, setLoadingRfq] = useState(true);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // form fields
  const [auctionType, setAuctionType] = useState<
    "standard_reverse" | "ranked_reverse" | "sealed_bid"
  >("standard_reverse");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  const [startingPrice, setStartingPrice] = useState<string>("");
  const [minDecrement, setMinDecrement] = useState<string>("");
  const [reservePrice, setReservePrice] = useState<string>("");

  const [supplierChat, setSupplierChat] = useState(false);
  const [supplierAttachmentsAllowed, setSupplierAttachmentsAllowed] = useState(false);

  const [autoExtendEnabled, setAutoExtendEnabled] = useState(false);
  const [autoExtendMinutes, setAutoExtendMinutes] = useState(3);
  const [autoExtendWindowSeconds, setAutoExtendWindowSeconds] = useState(60);

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [additionalDocs, setAdditionalDocs] = useState<File[]>([]);

  const [supplierRequiredDocs, setSupplierRequiredDocs] = useState<string[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* --------------------------------------------------------
    Load RFQ
  -------------------------------------------------------- */
  useEffect(() => {
    if (!fromRfq) {
      setLoadError("Missing RFQ reference.");
      setLoadingRfq(false);
      return;
    }

    (async () => {
      try {
        setLoadingRfq(true);
        const res = await fetch(`/api/rfqs?id=${fromRfq}`);
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        const rfqData: RFQ = json.rfq;
        setRfq(rfqData);

        setTitle(`Auction: ${rfqData.title || ""}`);

        setSelectedSupplierIds(
          (rfqData.invited_suppliers || []).map((s) => s.id)
        );

        setStartingPrice(
          rfqData.rfq_items?.[0]?.estimated_value?.toString() || ""
        );
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setLoadingRfq(false);
      }
    })();
  }, [fromRfq]);

  /* --------------------------------------------------------
    Derived duration
  -------------------------------------------------------- */
  const duration = useMemo(() => {
    if (!startAt || !endAt) return "";
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return "";
    const diff = e - s;
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} hrs`;
    return `${(mins / 1440).toFixed(1)} days`;
  }, [startAt, endAt]);

  /* --------------------------------------------------------
    Validation
  -------------------------------------------------------- */
  function validate() {
    if (!title.trim()) return "Auction title is required.";
    if (!startAt || !endAt) return "Start and end time required.";
    if (new Date(endAt).getTime() <= new Date(startAt).getTime())
      return "End must be after start.";

    if (!startingPrice) return "Starting price required.";

    if (auctionType === "standard_reverse" && (!minDecrement || Number(minDecrement) <= 0))
      return "Minimum decrement required.";

    if (auctionType === "sealed_bid" && supplierRequiredDocs.length === 0)
      return "At least one supplier-required document must be added.";

    if (rfq?.visibility === "invited" && selectedSupplierIds.length === 0)
      return "This RFQ was invited-only — select at least one supplier.";

    return null;
  }

  /* --------------------------------------------------------
    Submit handler
  -------------------------------------------------------- */
  const handleSubmit = async (e?: any) => {
    e?.preventDefault();

    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();

      // Required by API
      fd.append("from_rfq", fromRfq || "");
      fd.append("organization_id", rfq?.organization_id || "");
      fd.append("created_by", rfq?.created_by || "");
      
      // Unified auction fields
      fd.append("auction_type", auctionType);
      fd.append("start_at", new Date(startAt).toISOString());
      fd.append("end_at", new Date(endAt).toISOString());
      fd.append("currency", rfq?.currency || "USD");

      // invited suppliers
      fd.append("invited_supplier_ids", JSON.stringify(selectedSupplierIds));

      // CONFIG OBJECT (as expected by unified API)
      const config: any = {
        title,
        starting_price: startingPrice,
        reserve_price: reservePrice || null,
        supplier_chat: supplierChat,
        supplier_attachments_allowed: supplierAttachmentsAllowed,
        supplier_required_docs: supplierRequiredDocs || [],
      };

      if (auctionType === "standard_reverse") {
        config.min_decrement = minDecrement;
        config.auto_extend_enabled = autoExtendEnabled;
        config.auto_extend_minutes = autoExtendMinutes;
        config.auto_extend_window_seconds = autoExtendWindowSeconds;
      }

      fd.append("config", JSON.stringify(config));

      // files → unified API expects ONLY "files"
      mediaFiles.forEach((file) => fd.append("files", file));
      additionalDocs.forEach((file) => fd.append("files", file));

      /* POST */
      const res = await fetch("/api/auctions", { method: "POST", body: fd });
      const json: AuctionCreateResponse = await res.json();

      if (!json.success) throw new Error(json.error);

      alert("Auction created successfully");
      router.push(`/admin/auctions/${json.auctionId}`);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------------
    UI
  -------------------------------------------------------- */
  if (loadingRfq)
    return (
      <div className="p-8 text-center text-gray-600">
        <Loader2 className="mx-auto animate-spin" />
        Loading RFQ...
      </div>
    );

  if (loadError)
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-white shadow p-6 rounded">
          <div className="text-red-600">{loadError}</div>
          <button
            onClick={() => router.push("/admin/rfqs")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Back
          </button>
        </div>
      </div>
    );

  if (!rfq) return <div className="p-6">RFQ not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Create auction from RFQ</h1>
      <p className="text-gray-500">{rfq.title}</p>

      {formError && (
        <div className="bg-red-50 p-3 border border-red-200 text-red-700 rounded">
          {formError}
        </div>
      )}

      <form className="bg-white p-6 shadow rounded space-y-6">
        {/* Auction type */}
        <div>
          <label className="block text-sm font-medium mb-1">Auction type</label>
          <select
            className="border px-3 py-2 rounded w-full"
            value={auctionType}
            onChange={(e) => setAuctionType(e.target.value as any)}
          >
            <option value="standard_reverse">Standard Reverse</option>
            <option value="ranked_reverse">Ranked Reverse</option>
            <option value="sealed_bid">Sealed Bid</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Auction title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Start</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">End</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Duration</label>
            <div className="border px-3 py-2 rounded bg-gray-50">{duration || "—"}</div>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Starting price</label>
            <input
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Minimum decrement</label>
            <input
              value={minDecrement}
              disabled={auctionType !== "standard_reverse"}
              onChange={(e) => setMinDecrement(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Reserve price</label>
            <input
              value={reservePrice}
              onChange={(e) => setReservePrice(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
        </div>

        {/* Suppliers */}
        <div>
          <label className="block text-sm mb-1">Suppliers</label>
          <div className="border p-3 rounded max-h-48 overflow-auto">
            {rfq.invited_suppliers?.length ? (
              rfq.invited_suppliers.map((s) => (
                <label key={s.id} className="flex justify-between py-1">
                  <span>{s.company_name}</span>
                  <input
                    type="checkbox"
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
              ))
            ) : (
              <div className="text-gray-500">No suppliers</div>
            )}
          </div>
        </div>

        {/* Supplier chat + attachments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={supplierChat}
              onChange={(e) => setSupplierChat(e.target.checked)}
            />
            Enable supplier chat
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={supplierAttachmentsAllowed}
              onChange={(e) => setSupplierAttachmentsAllowed(e.target.checked)}
            />
            Allow supplier attachments
          </label>
        </div>

        {/* Auto extend (standard) */}
        {auctionType === "standard_reverse" && (
          <div className="border rounded p-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoExtendEnabled}
                onChange={(e) => setAutoExtendEnabled(e.target.checked)}
              />
              Auto extend
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Minutes</label>
                <input
                  disabled={!autoExtendEnabled}
                  type="number"
                  value={autoExtendMinutes}
                  onChange={(e) => setAutoExtendMinutes(Number(e.target.value))}
                  className="border px-2 py-1 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Window (seconds)</label>
                <input
                  disabled={!autoExtendEnabled}
                  type="number"
                  value={autoExtendWindowSeconds}
                  onChange={(e) =>
                    setAutoExtendWindowSeconds(Number(e.target.value))
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sealed bid docs */}
        {auctionType === "sealed_bid" && (
          <div>
            <label className="block text-sm mb-2">Required supplier documents</label>
            <div className="space-y-2">
              {supplierRequiredDocs.map((doc, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={doc}
                    onChange={(e) =>
                      setSupplierRequiredDocs((prev) =>
                        prev.map((x, idx) => (idx === i ? e.target.value : x))
                      )
                    }
                    className="border px-3 py-2 rounded w-full"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSupplierRequiredDocs((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setSupplierRequiredDocs((prev) => [...prev, ""])
              }
              className="mt-2 text-blue-600 text-sm flex items-center gap-1"
            >
              <FilePlus size={14} /> Add document
            </button>
          </div>
        )}

        {/* Files */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Media</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) =>
                setMediaFiles(Array.from(e.target.files || []))
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Additional documents</label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
              onChange={(e) =>
                setAdditionalDocs(Array.from(e.target.files || []))
              }
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/admin/rfqs/${rfq.id}`)}
            className="px-4 py-2 border rounded"
          >
            Back to RFQ
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 text-white rounded flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create auction & convert RFQ
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
