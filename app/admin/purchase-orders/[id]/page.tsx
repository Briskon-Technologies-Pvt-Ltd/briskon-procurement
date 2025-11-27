"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileDown, CheckCircle, XCircle } from "lucide-react";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ===== LOAD PO =====
  const loadPO = async () => {
    try {
      const res = await fetch(`/api/purchase-orders?id=${id}`);
      const json = await res.json();

      if (!json.success || !json.po) {
        setNotFound(true);
        return;
      }

      setPo(json.po);
    } catch (err) {
      console.error("PO fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPO();
  }, [id]);

  // ===== UI STATES =====
  if (loading) return <div className="text-center mt-12">Loading Purchase Order...</div>;
  if (notFound) return <div className="text-center mt-12 text-red-600 text-lg">PO not found.</div>;
  if (!po) return null;

  return (
    <div className="p-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/purchase-orders")}
        className="flex items-center gap-1 text-blue-600 hover:underline text-sm mb-4"
      >
        <ArrowLeft size={16} /> Back to Purchase Orders
      </button>

      {/* Header */}
      <h1 className="text-2xl font-semibold text-[#012b73] mb-1">Purchase Order</h1>
      <p className="text-gray-500 mb-4">PO Number: {po.po_number}</p>

      {/* Status + Actions */}
      <div className="flex items-center gap-4 mb-8">
        <span
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${po.status === "fulfilled"
              ? "bg-green-100 text-green-700"
              : po.status === "cancelled"
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
        >
          {po.status}
        </span>

        {po.status === "created" && (
          <>
            <button
              onClick={async () => {
                await fetch("/api/purchase-orders/status", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ po_id: id, status: "fulfilled" }),
                });
                loadPO();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle size={16} /> Mark Fulfilled
            </button>

            <button
              onClick={async () => {
                await fetch("/api/purchase-orders/status", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ po_id: id, status: "cancelled" }),
                });
                loadPO();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
            >
              <XCircle size={16} /> Cancel PO
            </button>
          </>
        )}

        {/* PDF Download */}
        <button
          onClick={() => window.open(`/api/purchase-orders/pdf?id=${po.id}`, "_blank")}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 flex items-center gap-2"
        >
          <FileDown size={16} /> Download PDF
        </button>
      </div>

      {/* Supplier */}
      <div className="bg-white border rounded-lg shadow p-5 mb-6">
        <h3 className="text-lg font-semibold text-[#012b73] mb-2">Supplier Information</h3>
        <p className="font-medium">{po.supplier.company_name}</p>
        <p className="text-gray-600 text-sm">{po.supplier.country}</p>

        {po.supplier.contacts?.map((c: any, idx: number) => (
          <p key={idx} className="text-gray-600 text-sm mt-1">
            📧 {c.email} | 📞 {c.phone}
          </p>
        ))}
      </div>

      {/* RFQ Details */}
      <div className="bg-white border rounded-lg shadow p-5 mb-6">
        <h3 className="text-lg font-semibold text-[#012b73] mb-2">RFQ Details</h3>
        <p className="font-medium">{po.rfq?.title}</p>
      </div>

      {/* Line Items */}
      {po.proposal?.line_items?.length > 0 && (
        <div className="bg-white border rounded-lg shadow p-5 mb-6">
          <h3 className="text-lg font-semibold text-[#012b73] mb-3">Line Item Breakdown</h3>

          <table className="w-full text-sm border border-gray-200 rounded-md">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 border">Description</th>
                <th className="p-2 border text-center">Qty</th>
                <th className="p-2 border text-center">UOM</th>
                <th className="p-2 border text-right">Unit Price</th>
                <th className="p-2 border text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.proposal.line_items.map((item: any, index: number) => {
                const rfqItem = Array.isArray(item.rfq_items) ? item.rfq_items[0] : item.rfq_items;
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 border">{rfqItem?.description}</td>
                    <td className="p-2 border text-center">{rfqItem?.qty}</td>
                    <td className="p-2 border text-center">{rfqItem?.uom}</td>
                    <td className="p-2 border text-right">{item.unit_price.toLocaleString()}</td>
                    <td className="p-2 border text-right font-semibold">
                      {item.total.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="text-right text-lg font-semibold mt-4">
            Total Amount: {po.rfq.currency} {po.total_amount.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
