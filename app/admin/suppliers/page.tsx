"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/admin.css";

import {
  Users,
  Search,
  Filter,
  Building,
  Mail,
  Phone,
  FileText,
  PlusCircle,
  Tag,
  CheckCircle,
  FolderOpen,
  X,
  MapPinned,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function SuppliersPage() {
  const router = useRouter();

  // ======================================================
  // MAIN STATES
  // ======================================================
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [registrationTrends, setRegistrationTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filterRisk, setFilterRisk] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  // ======================================================
  // DETAIL MODAL (if needed later)
  // ======================================================
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openDetail = async (id: string) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);

    const res = await fetch(`/api/supplier-details/${id}`);
    const json = await res.json();

    setDetailData(json);
    setLoadingDetail(false);
  };

  const closeDetail = () => {
    setDetailModalOpen(false);
    setDetailData(null);
  };

  const handleEscClose = useCallback((e: any) => {
    if (e.key === "Escape") closeDetail();
  }, []);

  useEffect(() => {
    if (detailModalOpen) document.addEventListener("keydown", handleEscClose);
    return () => document.removeEventListener("keydown", handleEscClose);
  }, [detailModalOpen, handleEscClose]);

  // ======================================================
  // DOCUMENT MODAL
  // ======================================================
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docData, setDocData] = useState<any[]>([]);

  const openDocumentModal = (docs: any[]) => {
    setDocData(docs);
    setDocModalOpen(true);
  };

  const closeDocumentModal = () => {
    setDocModalOpen(false);
    setDocData([]);
  };

  const handleDocEscClose = useCallback((e: any) => {
    if (e.key === "Escape") closeDocumentModal();
  }, []);

  useEffect(() => {
    if (docModalOpen) document.addEventListener("keydown", handleDocEscClose);
    return () => document.removeEventListener("keydown", handleDocEscClose);
  }, [docModalOpen, handleDocEscClose]);

  // ======================================================
  // FETCH SUPPLIERS LIST
  // ======================================================
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/supplier-dashboard");
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setSuppliers(json.suppliers);
        setRegistrationTrends(json.registrationTrends);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  // ======================================================
  // FILTERING + SEARCH
  // ======================================================
  const filteredSuppliers = useMemo(() => {
    let data = [...suppliers];

    if (filterRisk !== "All") data = data.filter((s) => s.risk === filterRisk);

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.categories.some((c: string) => c.toLowerCase().includes(q)) ||
          (s.contacts[0]?.email || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [suppliers, filterRisk, search]);

  // ======================================================
  // KPIs
  // ======================================================
  const totalSuppliers = suppliers.length;
  const totalAwards = suppliers.reduce((sum, s) => sum + s.totalAwards, 0);
  const totalContracts = suppliers.reduce((sum, s) => sum + s.activeContracts, 0);
  const totalRFQs = suppliers.reduce((sum, s) => sum + s.totalRFQs, 0);

  // ======================================================
  // LOADING & ERROR UI
  // ======================================================
  if (loading)
    return (
      <div className="admin-content flex items-center justify-center h-full">
        Loading suppliers dashboard…
      </div>
    );

  if (error)
    return (
      <div className="admin-content flex items-center justify-center h-full">
        Error: {error}
      </div>
    );

  // ======================================================
  // PAGE UI
  // ======================================================
  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div />
        <button
          onClick={() => router.push("/admin/suppliers/new")}
          className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
        >
          <PlusCircle size={18} /> Add Supplier
        </button>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-blue-200">
          <h3 className="font-semibold text-[#012b73] mb-3">Supplier Engagement</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { name: "RFQs", value: totalRFQs },
                { name: "Awards", value: totalAwards },
                { name: "Contracts", value: totalContracts },
              ]}
            >
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6efb" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#012b73" stopOpacity={0.9} />
                </linearGradient>
              </defs>

              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="url(#blueGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-blue-200">
          <h3 className="font-semibold text-[#012b73] mb-3">Supplier Registration Trends</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={registrationTrends}>
              <defs>
                <linearGradient id="blueGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6efb" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#012b73" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="url(#blueGradient2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* SUPPLIERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuppliers.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-blue-200 rounded-lg p-5 shadow-sm hover:shadow-lg flex flex-col"
            style={{ minHeight: "300px" }}
          >
            <div className="flex-1">
              <h3 className="font-semibold text-[#012b73] text-lg mb-1">
                {s.name}
              </h3>
              <div className="text-xs text-black mb-2 flex items-center gap-1">
                <MapPinned size={20}  strokeWidth={2.5} className="text-blue-600"/> {s.billing_address} 
              </div>
              <div className="w-full h-px bg-gray-300 mb-4"></div>
              {/* Categories */}
              <div className="text-xs text-gray-700 font-bold mb-4">Mapped Categories:</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {s.categories.map((cat: string, i: number) => (
                  <span
                    key={i}
                    className="text-[11px] bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    <Tag size={10} />
                    {cat}
                  </span>
                ))}
              </div>

              {/* Contacts */}
              <div className="text-xs text-gray-700 font-bold mb-2">Contacts:</div>
              <ul className="text-xs text-gray-600 list-disc pl-4 mb-3">
                {s.contacts.map((c: any, i: number) => (
                  <li key={i}>
                    <b>{c.title}</b> | {c.email} | {c.phone}
                  </li>
                ))}
              </ul>

              {/* Status */}
              <div className="flex justify-between text-xs mb-2 text-gray-600">
                <span className="flex items-center gap-1">
                <CheckCircle size={12} strokeWidth={2.5} className="text-green-600" /> Status: {s.status}
                </span>
                <span>Reg No: <b>{s.registration_no}</b></span>
              </div>

              {/* Documents Button */}
              <div className="flex justify-between text-xs text-[#2f6efb] mb-2">
                <button
                  className="hover:underline flex items-center gap-1"
                  onClick={() => openDocumentModal(s.documents)}
                >
                  <FolderOpen size={12} /> {s.documents.length} documents
                </button>
              </div>
            </div>

            {/* BOTTOM KPIs */}
            <div className="border-t mt-auto pt-3 text-sm text-gray-700 flex justify-between">
              <div>RFQs: <b>{s.totalRFQs}</b></div>
              <div>Awards: <b>{s.totalAwards}</b></div>
              <div>Active contracts: <b>{s.activeContracts}</b></div>
            </div>
          </div>
        ))}
      </div>

      {/* DOCUMENT MODAL */}
      {docModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            <button
              onClick={closeDocumentModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold mb-4 text-[#012b73]">
              Supplier Documents
            </h3>

            {docData.length === 0 ? (
              <p className="text-gray-500 text-sm">No documents available.</p>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {docData.map((doc, i) => (
                  <div
                    key={i}
                    className="border border-blue-200 rounded-md p-3 bg-blue-50 text-sm"
                  >
                    <div className="font-semibold text-[#012b73]">{doc.doc_type}</div>
                    <div className="text-gray-600">Issued by: {doc.issued_by}</div>
                    <div className="text-gray-600">Valid from: {doc.valid_from}</div>
                    <div className="text-gray-600">Valid to: {doc.valid_to}</div>

                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-white bg-[#012b73] hover:bg-blue-800 px-3 py-1 rounded-md"
                    >
                      View Document
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
