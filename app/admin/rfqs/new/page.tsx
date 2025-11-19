"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function CreateRFQPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requisitionId = searchParams.get("requisition_id");

  const [loading, setLoading] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const [requisition, setRequisition] = useState<any | null>(null);

  const [organizationId, setOrganizationId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [visibility, setVisibility] = useState("invited");
  const [items, setItems] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [approvedRequisitions, setApprovedRequisitions] = useState<any[]>([]);

  /* --------------------------------------------------------
     ✅ Load only approved requisitions that don't have RFQs
  -------------------------------------------------------- */
  useEffect(() => {
    async function loadApprovedRequisitions() {
      try {
        // Step 1️⃣: Load all approved requisitions
        const reqRes = await fetch("/api/requisitions");
        const reqJson = await reqRes.json();
        if (!reqJson.success) throw new Error(reqJson.error || "Failed to load requisitions");
  
        const approvedRequisitions = (reqJson.data || []).filter(
          (r: any) => r.status === "approved"
        );
  
        // Step 2️⃣: Load all RFQs that have a requisition_id
        const rfqRes = await fetch("/api/rfqs");
        const rfqJson = await rfqRes.json();
  
        const linkedRequisitionIds = Array.isArray(rfqJson.rfqs)
          ? rfqJson.rfqs
              .map((r: any) => r.requisition_id)
              .filter((id: any) => typeof id === "string" && id.length > 0)
          : [];
  
        console.log("⚙️ Already linked requisitions:", linkedRequisitionIds);
  
        // Step 3️⃣: Exclude already-linked ones
        const filtered = approvedRequisitions.filter(
          (r: any) => !linkedRequisitionIds.includes(r.id)
        );
  
        console.log("✅ Showing available requisitions:", filtered.map((r: any) => r.id));
  
        setApprovedRequisitions(filtered);
      } catch (err) {
        console.error("❌ Error loading approved requisitions:", err);
      }
    }
  
    loadApprovedRequisitions();
  }, []);
  
  /* --------------------------------------------------------
     ✅ Fetch selected requisition & related suppliers
  -------------------------------------------------------- */
  useEffect(() => {
    if (requisitionId) {
      (async () => {
        try {
          setReqLoading(true);
          const res = await fetch(`/api/requisitions?id=${requisitionId}`);
          const json = await res.json();

          if (res.ok && json.success && json.data) {
            const req = json.data;
            setRequisition(req);
            setOrganizationId(req.organization_id || "");
            setTitle(req.description?.slice(0, 60) || "RFQ for Approved Requisition");
            setSummary(req.description || "");
            setCurrency(req.currency || "USD");
            setItems(
              req.items?.map((it: any) => ({
                description: it.description,
                qty: it.qty,
                uom: it.uom,
                estimated_value: it.estimated_value,
              })) || []
            );

            if (req.category_id) {
              const supRes = await fetch(`/api/suppliers?category_id=${req.category_id}`);
              const supJson = await supRes.json();
              if (supRes.ok && supJson.success) {
                setSuppliers(supJson.suppliers || supJson.data || []);
              }
            }
          }
        } catch (err) {
          console.error("Requisition fetch error:", err);
        } finally {
          setReqLoading(false);
        }
      })();
    }
  }, [requisitionId]);

  /* --------------------------------------------------------
     ✅ RFQ Form Handlers
  -------------------------------------------------------- */
  const addItem = () =>
    setItems([...items, { description: "", qty: 1, uom: "", estimated_value: "" }]);

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("summary", summary);
      formData.append("currency", currency);
      formData.append("visibility", visibility);
      formData.append("organization_id", organizationId);
      if (createdBy) formData.append("created_by", createdBy);
      if (requisitionId) formData.append("requisition_id", requisitionId);
      if (items.length) formData.append("items", JSON.stringify(items));
      if (selectedSuppliers.length)
        formData.append("invited_supplier_ids", JSON.stringify(selectedSuppliers));

      for (const file of files) formData.append("files", file);

      const res = await fetch("/api/rfqs", { method: "POST", body: formData });
      const json = await res.json();

      if (res.ok && json.success) {
        alert("✅ RFQ created successfully!");
        router.push("/admin/rfqs");
      } else throw new Error(json.error || "Failed to create RFQ");
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------
     ✅ UI Rendering
  -------------------------------------------------------- */
  if (reqLoading)
    return (
      <div className="p-6 text-gray-500 text-sm">
        Loading approved requisition details...
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">
        {requisitionId
          ? "Create RFQ from Approved Requisition"
          : "Create New RFQ"}
      </h1>

      {/* ✅ Dropdown for selecting approved requisition */}
      {!requisitionId && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Select Approved Requisition
          </label>
          <select
            className="w-full border border-gray-300 rounded-md p-2"
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) router.push(`/admin/rfqs/new?requisition_id=${selectedId}`);
            }}
          >
            <option value="">-- Choose an Approved Requisition --</option>
            {approvedRequisitions.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.description?.slice(0, 60)} ({r.id.slice(0, 8)})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Showing only approved requisitions not yet linked to any RFQ.
          </p>
        </div>
      )}

      {/* ✅ RFQ FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-8"
      >
        {/* ---------- GENERAL INFO ---------- */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">RFQ Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization ID</label>
              <input
                type="text"
                value={organizationId}
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="invited">Invited Suppliers</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
        </div>

        {/* ---------- RFQ ITEMS ---------- */}
        <div>
          <div className="flex justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">RFQ Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-center">UOM</th>
                  <th className="px-3 py-2 text-center">Est. Value</th>
                  <th className="px-3 py-2 text-center">Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        className="w-full border border-gray-300 rounded p-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        className="w-20 border border-gray-300 rounded text-center p-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="text"
                        value={item.uom}
                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                        className="w-20 border border-gray-300 rounded text-center p-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={item.estimated_value}
                        onChange={(e) =>
                          updateItem(idx, "estimated_value", e.target.value)
                        }
                        className="w-28 border border-gray-300 rounded text-center p-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------- SUPPLIER SELECTION ---------- */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Invite Suppliers</h2>
          {suppliers.length > 0 ? (
            <select
              multiple
              value={selectedSuppliers}
              onChange={(e) =>
                setSelectedSuppliers(Array.from(e.target.selectedOptions, (opt) => opt.value))
              }
              className="w-full border border-gray-300 rounded-md p-2 h-40"
            >
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} ({s.country})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">No suppliers available for this category.</p>
          )}
        </div>

        {/* ---------- FILES ---------- */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Attach Documents</h2>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}

            className="text-sm"
          />
          {files.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600">
              {files.map((f, i) => (
                <li key={i}>📄 {f.name}</li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- SUBMIT ---------- */}
        <div className="text-right pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 ml-auto"
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            Create RFQ
          </button>
        </div>
      </form>
    </div>
  );
}
