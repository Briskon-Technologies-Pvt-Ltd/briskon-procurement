"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Paperclip,
  ClipboardList,
  Clock,
  Upload,
  History as HistoryIcon,
  DollarSign,
} from "lucide-react";

type RfqItem = {
  id: string;
  description: string;
  qty: number | null;
  uom: string | null;
  estimated_value: number | null;
};

type Rfq = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  visibility: string;
  currency: string;
  created_at: string;
  end_at: string | null;
  rfq_items?: RfqItem[];
  rfq_documents?: {
    file_name: string;
    file_url: string;
    storage_path: string;
    uploaded_at: string;
  }[];
};

type ProposalLineItem = {
  rfq_item_id: string;
  unit_price: number | null;
  total: number | null;
};

type ProposalVersion = {
  id: string;
  rfq_id: string;
  supplier_id: string;
  submitted_by_profile_id: string;
  submission_text: string | null;
  total_price: number | null;
  change_notes: string | null;
  attachments: any[] | null;
  status: string;
  submitted_at: string;
  line_items?: ProposalLineItem[];
};

export default function SupplierOpportunityDetailsPage() {
  const params = useParams<{ id: string }>();
  const rfqId = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rfq, setRfq] = useState<Rfq | null>(null);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [currentProposal, setCurrentProposal] =
    useState<ProposalVersion | null>(null);
  const [history, setHistory] = useState<ProposalVersion[]>([]);

  const [noteInput, setNoteInput] = useState<string>("");
  const [changeNotesInput, setChangeNotesInput] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [countdown, setCountdown] = useState<string>("");

  // itemPrices[itemId] = string (unit price input)
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  /* ----------------------------------------------------------
     Currency formatting based on RFQ currency (option 3)
  ---------------------------------------------------------- */
  const formatMoney = (amount: number | null | undefined): string => {
    if (amount == null || isNaN(amount)) return "—";
    if (!rfq?.currency) return amount.toFixed(2);

    const cur = rfq.currency.trim();
    try {
      if (cur === "INR" || cur === "₹") {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(amount);
      }

      const currencyCode =
        cur.length === 3 ? cur.toUpperCase() : "USD";

      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
      }).format(amount);
    } catch {
      return amount.toFixed(2);
    }
  };

  /* ----------------------------------------------------------
     STEP 1: Resolve profile_id + supplier_id from session
  ---------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      // profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile?.id) {
        console.warn("No profile found for logged-in user");
        return;
      }

      setProfileId(profile.id);

      // supplier via supplier_contacts
      const { data: contact } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!contact?.supplier_id) {
        console.warn("No supplier mapped to this profile");
        return;
      }

      setSupplierId(contact.supplier_id);
    };

    init();
  }, [router]);

  /* ----------------------------------------------------------
     STEP 2: Load RFQ details & proposal data
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!rfqId || !supplierId) return;

    const load = async () => {
      setLoading(true);
      try {
        // RFQ details
        const rfqRes = await fetch(`/api/rfqs?id=${rfqId}`);
        const rfqJson = await rfqRes.json();
        if (rfqJson?.success) {
          setRfq(rfqJson.rfq as Rfq);
        }

        // Proposal data
        const proposalRes = await fetch(
          `/api/proposals?rfq_id=${rfqId}&supplier_id=${supplierId}`
        );
        const proposalJson = await proposalRes.json();
        if (proposalJson?.success) {
          setCurrentProposal(proposalJson.current);
          setHistory(proposalJson.history || []);
          if (proposalJson.current) {
            setNoteInput(
              proposalJson.current.submission_text || ""
            );
            // Pre-fill item prices from current line_items
            const map: Record<string, string> = {};
            (proposalJson.current.line_items || []).forEach(
              (li: ProposalLineItem) => {
                if (li.rfq_item_id && li.unit_price != null) {
                  map[li.rfq_item_id] = li.unit_price.toString();
                }
              }
            );
            setItemPrices(map);
          }
        }
      } catch (e) {
        console.error("Error loading RFQ or proposal:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [rfqId, supplierId]);

  /* ----------------------------------------------------------
     Countdown to RFQ end_at
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!rfq?.end_at) {
      setCountdown("");
      return;
    }

    const target = new Date(rfq.end_at).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown("Closed");
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setCountdown(
        `${d}d ${h.toString().padStart(2, "0")}h ${m
          .toString()
          .padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
      );
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [rfq?.end_at]);

  const isClosed = useMemo(() => {
    if (!rfq) return true;
    if (rfq.status !== "published") return true;
    if (!rfq.end_at) return false;
    return Date.now() > new Date(rfq.end_at).getTime();
  }, [rfq]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
  };

  const handleItemPriceChange = (itemId: string, value: string) => {
    setItemPrices((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  /* ----------------------------------------------------------
     Grand total = Σ (qty × unit_price)
  ---------------------------------------------------------- */
  const grandTotal = useMemo(() => {
    if (!rfq?.rfq_items || !rfq.rfq_items.length) return 0;
    return rfq.rfq_items.reduce((sum, item) => {
      const priceStr = itemPrices[item.id];
      const price = priceStr ? Number(priceStr) : 0;
      const qty = item.qty ? Number(item.qty) : 0;
      if (!price || !qty) return sum;
      return sum + price * qty;
    }, 0);
  }, [rfq?.rfq_items, itemPrices]);

  /* ----------------------------------------------------------
     Submit / update proposal (creates new version)
  ---------------------------------------------------------- */
  const handleSubmit = async () => {
    if (!supplierId || !profileId || !rfqId || !rfq) return;
    if (isClosed) {
      alert("Proposal submission window is closed for this RFQ.");
      return;
    }

    // Validate: all RFQ items must have unit price
    if (rfq.rfq_items && rfq.rfq_items.length > 0) {
      const missing = rfq.rfq_items.some((it) => {
        const v = itemPrices[it.id];
        return !v || isNaN(Number(v));
      });
      if (missing) {
        alert("Please enter unit price for all RFQ line items.");
        return;
      }
    }

    if (!grandTotal || isNaN(grandTotal)) {
      alert("Total price could not be computed.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("rfq_id", rfqId);
      form.append("supplier_id", supplierId);
      form.append("submitted_by_profile_id", profileId);
      form.append("total_price", grandTotal.toString());
      form.append("note", noteInput || "");
      form.append("change_notes", changeNotesInput || "");

      // Line items payload
      const lineItemsPayload =
        rfq.rfq_items?.map((it) => ({
          rfq_item_id: it.id,
          unit_price: Number(itemPrices[it.id] || 0),
        })) || [];

      form.append("line_items", JSON.stringify(lineItemsPayload));

      files.forEach((f) => form.append("files", f));

      const res = await fetch("/api/proposals", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (!json.success) {
        console.error("Proposal submit error:", json.error);
        alert(json.error || "Failed to submit proposal.");
        return;
      }

      // reload proposal data
      const proposalRes = await fetch(
        `/api/proposals?rfq_id=${rfqId}&supplier_id=${supplierId}`
      );
      const proposalJson = await proposalRes.json();
      if (proposalJson?.success) {
        setCurrentProposal(proposalJson.current);
        setHistory(proposalJson.history || []);

        if (proposalJson.current) {
          setNoteInput(
            proposalJson.current.submission_text || ""
          );
          const map: Record<string, string> = {};
          (proposalJson.current.line_items || []).forEach(
            (li: ProposalLineItem) => {
              if (li.rfq_item_id && li.unit_price != null) {
                map[li.rfq_item_id] = li.unit_price.toString();
              }
            }
          );
          setItemPrices(map);
          setChangeNotesInput("");
          setFiles([]);
        }
      }
    } catch (e) {
      console.error("Proposal submit exception:", e);
      alert("Unexpected error submitting proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !rfq) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" /> Loading opportunity...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        onClick={() => router.push("/supplier/opportunities")}
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white mb-2"
      >
        <ArrowLeft size={16} />
        Back to opportunities
      </button>

      {/* RFQ Overview Card */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="text-indigo-400" size={20} />
            <h1 className="text-xl md:text-2xl font-semibold">
              {rfq.title}
            </h1>
          </div>
          {rfq.summary && (
            <p className="text-sm text-gray-400 max-w-2xl">
              {rfq.summary}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              Created: {new Date(rfq.created_at).toLocaleString()}
            </span>
            {rfq.end_at && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Closes: {new Date(rfq.end_at).toLocaleString()}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-200">
              {rfq.visibility === "public" ? "Public RFQ" : "Invited RFQ"}
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-right">
          <div className="text-xs uppercase text-gray-400 mb-1">
            Time remaining
          </div>
          <div
            className={`text-sm font-semibold ${
              !countdown || countdown === "Closed"
                ? "text-red-400"
                : "text-emerald-400"
            }`}
          >
            {countdown || "—"}
          </div>
          {isClosed && (
            <div className="text-xs text-red-400 mt-1">
              Submission window closed
            </div>
          )}
        </div>
      </div>

      {/* 2x2 GRID: RFQ details + Proposal form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFQ Docs + Items */}
        <div className="space-y-6">
          {/* RFQ Documents slider-like list */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip size={18} className="text-indigo-400" />
              <h2 className="font-semibold">RFQ Documents</h2>
            </div>
            {rfq.rfq_documents && rfq.rfq_documents.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory p-1">
                {rfq.rfq_documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="snap-center flex flex-col items-center justify-center bg-gray-800 rounded-xl border border-gray-700 p-3 min-w-[140px] cursor-pointer hover:border-indigo-400 transition"
                    onClick={() => window.open(doc.file_url, "_blank")}
                  >
                    <FileText size={28} className="mb-2 text-indigo-300" />
                    <span className="text-xs text-gray-200 truncate max-w-[120px]">
                      {doc.file_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No documents attached.
              </p>
            )}
          </div>

          {/* RFQ Items + Pricing Grid */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={18} className="text-indigo-400" />
              <h2 className="font-semibold">RFQ Line Items Pricing</h2>
            </div>
            {rfq.rfq_items && rfq.rfq_items.length > 0 ? (
              <>
                <div className="border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        <th className="px-3 py-2 text-left">UoM</th>
                        <th className="px-3 py-2 text-left">
                          Unit price ({rfq.currency})
                        </th>
                        <th className="px-3 py-2 text-left">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfq.rfq_items.map((it) => {
                        const unitPriceStr = itemPrices[it.id] || "";
                        const qty = it.qty ? Number(it.qty) : 0;
                        const unitPrice = unitPriceStr
                          ? Number(unitPriceStr)
                          : 0;
                        const lineTotal =
                          !isNaN(unitPrice) && qty
                            ? unitPrice * qty
                            : null;

                        return (
                          <tr
                            key={it.id}
                            className="border-t border-gray-800/80"
                          >
                            <td className="px-3 py-2 text-gray-100">
                              {it.description}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {qty || "-"}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {it.uom ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isClosed}
                                value={unitPriceStr}
                                onChange={(e) =>
                                  handleItemPriceChange(
                                    it.id,
                                    e.target.value
                                  )
                                }
                                className="w-28 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-100">
                              {formatMoney(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-sm font-semibold text-gray-100">
                  Total quoted amount:{" "}
                  <span className="text-indigo-300">
                    {formatMoney(grandTotal)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                No line items defined for this RFQ.
              </p>
            )}
          </div>
        </div>

        {/* Proposal form */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" />
              <h2 className="font-semibold">Your Proposal</h2>
            </div>
            {currentProposal && (
              <span className="text-xs text-gray-400">
                Last submitted:{" "}
                {new Date(
                  currentProposal.submitted_at
                ).toLocaleString()}
              </span>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">
              Commercial / technical notes
            </label>
            <textarea
              disabled={isClosed}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="Describe your scope, exclusions, delivery timelines, payment terms etc."
            />
          </div>

          {/* Change notes */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">
              Change notes (for this version)
            </label>
            <input
              type="text"
              disabled={isClosed}
              value={changeNotesInput}
              onChange={(e) => setChangeNotesInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Example: Updated prices after clarifications"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-2">
              <Upload size={14} /> Proposal attachments
            </label>
            <input
              type="file"
              multiple
              disabled={isClosed}
              onChange={handleFileChange}
              className="block w-full text-xs text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
            {files.length > 0 && (
              <ul className="text-xs text-gray-400 space-y-1">
                {files.map((f, idx) => (
                  <li key={idx}>• {f.name}</li>
                ))}
              </ul>
            )}

            {/* Existing attachments on current version */}
            {currentProposal?.attachments && (
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">
                  Uploaded with latest version:
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentProposal.attachments.map(
                    (att: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          att.file_url &&
                          window.open(att.file_url, "_blank")
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-200 hover:border-indigo-400"
                      >
                        <FileText size={12} />
                        <span className="truncate max-w-[120px]">
                          {att.file_name}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              disabled={isClosed || submitting}
              onClick={handleSubmit}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isClosed
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {submitting && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {currentProposal ? "Submit new version" : "Submit proposal"}
            </button>
            {isClosed && (
              <p className="text-xs text-red-400 mt-2">
                You can no longer edit this proposal. RFQ submission window
                is closed.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Proposal History – full width bottom */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <HistoryIcon size={18} className="text-indigo-400" />
          <h2 className="font-semibold">Proposal history</h2>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500">
            No proposals submitted yet.
          </p>
        ) : (
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Total price</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Change notes</th>
                  <th className="px-3 py-2 text-left">Submitted at</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .slice()
                  .reverse()
                  .map((ver, idx) => {
                    const isLatest =
                      currentProposal && ver.id === currentProposal.id;
                    return (
                      <tr
                        key={ver.id}
                        className={`border-t border-gray-800/70 ${
                          isLatest ? "bg-indigo-950/40" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-100">
                          #{history.length - idx}
                          {isLatest && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-100">
                          {formatMoney(ver.total_price)}
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          {ver.status}
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          {ver.change_notes || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          {new Date(
                            ver.submitted_at
                          ).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
