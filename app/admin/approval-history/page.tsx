"use client";

import React, { useState } from "react";
import "@/app/styles/admin.css";
import {
  History,
  Filter,
  Search,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

// ===================== MOCK DATA =====================
const approvalHistoryData = [
  {
    id: "AH-1001",
    entityType: "Requisition",
    entityId: "REQ-4001",
    approver: "Amit Sharma",
    role: "Procurement Manager",
    status: "Approved",
    actionAt: "2025-11-05T10:15:00Z",
    comments: "Looks good, proceed to RFQ creation.",
  },
  {
    id: "AH-1002",
    entityType: "Purchase Order",
    entityId: "PO-5002",
    approver: "Rita Kapoor",
    role: "Finance Approver",
    status: "Rejected",
    actionAt: "2025-11-03T14:10:00Z",
    comments: "Incorrect supplier code. Please verify before re-approval.",
  },
  {
    id: "AH-1003",
    entityType: "Contract",
    entityId: "CTR-4003",
    approver: "Nitin Rao",
    role: "Legal Team",
    status: "Approved",
    actionAt: "2025-11-02T18:45:00Z",
    comments: "Reviewed all clauses, cleared for signing.",
  },
  {
    id: "AH-1004",
    entityType: "RFQ",
    entityId: "RFQ-2004",
    approver: "Sunita Patel",
    role: "Procurement Officer",
    status: "Pending",
    actionAt: "2025-11-08T12:00:00Z",
    comments: "",
  },
];

const statusColors = {
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
};

export default function ApprovalHistoryPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredData = approvalHistoryData.filter((entry) => {
    const matchesFilter =
      filter === "All" || entry.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      entry.entityId.toLowerCase().includes(search.toLowerCase()) ||
      entry.approver.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] mb-1 flex items-center gap-2">
            <History size={22} /> Approval History
          </h1>
          <p className="text-sm text-gray-600">
            View all approval and rejection activities across the system, with
            comments and timestamps.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search by entity or approver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2f6efb] w-full md:w-1/3"
          />
        </div>

        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2f6efb]"
          >
            <option value="All">All</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* TIMELINE VIEW */}
      <div className="relative pl-6 mb-10">
        <div className="absolute left-2 top-0 bottom-0 w-1 bg-gray-200 rounded-full"></div>

        {filteredData.map((entry, index) => (
          <div key={entry.id} className="relative mb-6">
            <div
              className={`absolute -left-[11px] w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                entry.status === "Approved"
                  ? "border-green-500 bg-green-100"
                  : entry.status === "Rejected"
                  ? "border-red-500 bg-red-100"
                  : "border-yellow-500 bg-yellow-100"
              }`}
            >
              {entry.status === "Approved" ? (
                <CheckCircle size={10} className="text-green-600" />
              ) : entry.status === "Rejected" ? (
                <XCircle size={10} className="text-red-600" />
              ) : (
                <Clock size={10} className="text-yellow-600" />
              )}
            </div>

            <div className="ml-8 bg-white p-4 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[#012b73]">
                  {entry.entityType} - {entry.entityId}
                </h3>
                <span
                  className={`text-[11px] px-2 py-1 rounded-full ${statusColors[entry.status]}`}
                >
                  {entry.status}
                </span>
              </div>

              <div className="text-xs text-gray-600 mb-2">
                <User size={12} className="inline mr-1 text-gray-500" />
                {entry.approver} ({entry.role})
              </div>

              <div className="text-xs text-gray-500 mb-2">
                <Clock size={12} className="inline mr-1" />
                {new Date(entry.actionAt).toLocaleString()}
              </div>

              {entry.comments && (
                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-md p-2 mt-2 flex items-start gap-2">
                  <MessageSquare size={14} className="text-gray-400 mt-0.5" />
                  {entry.comments}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SUMMARY BAR */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-2 flex items-center gap-2">
          <AlertTriangle size={16} /> Approval Summary
        </h3>
        <div className="flex gap-6 text-sm text-gray-700">
          <div>
            ✅ Approved:{" "}
            <b>
              {approvalHistoryData.filter((a) => a.status === "Approved").length}
            </b>
          </div>
          <div>
            ❌ Rejected:{" "}
            <b>
              {approvalHistoryData.filter((a) => a.status === "Rejected").length}
            </b>
          </div>
          <div>
            ⏳ Pending:{" "}
            <b>
              {approvalHistoryData.filter((a) => a.status === "Pending").length}
            </b>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <FileText size={14} className="inline mr-1 text-[#2f6efb]" />
            Total records: {filteredData.length}
          </div>
          <div className="text-gray-500">
            Last sync: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
