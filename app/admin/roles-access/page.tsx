"use client";

import React, { useState } from "react";
import "@/app/styles/admin.css";
import {
  Shield,
  User,
  Users,
  KeyRound,
  Lock,
  PlusCircle,
  Filter,
  Search,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";

const roles = [
  {
    id: 1,
    name: "Super Admin",
    description: "Full platform access, including system configurations.",
    users: 2,
    permissions: ["Manage Roles", "Manage Users", "All Settings"],
  },
  {
    id: 2,
    name: "Procurement Manager",
    description: "Can manage requisitions, RFQs, and auctions.",
    users: 4,
    permissions: [
      "Create Requisition",
      "Approve RFQ",
      "Award Auctions",
      "Manage PO",
    ],
  },
  {
    id: 3,
    name: "Finance Approver",
    description: "Approves POs and contracts; manages vendor payments.",
    users: 3,
    permissions: ["Approve PO", "Approve Contracts"],
  },
  {
    id: 4,
    name: "Viewer",
    description: "Read-only access to dashboards and reports.",
    users: 1,
    permissions: ["View Reports", "View Auctions"],
  },
];

export default function RolesAccessPage() {
  const [search, setSearch] = useState("");

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] flex items-center gap-2 mb-1">
            <Shield size={22} /> Roles & Access Control
          </h1>
          <p className="text-sm text-gray-600">
            Manage roles, permissions, and user access policies across modules.
          </p>
        </div>
        <button className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg">
          <PlusCircle size={18} /> Add Role
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <KeyRound size={20} className="mx-auto text-[#2f6efb] mb-1" />
          <div className="text-xs text-gray-500">Total Roles</div>
          <div className="text-xl font-bold">{roles.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <Users size={20} className="mx-auto text-[#0eb25c] mb-1" />
          <div className="text-xs text-gray-500">Total Users Mapped</div>
          <div className="text-xl font-bold">10</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <Lock size={20} className="mx-auto text-[#f59e0b] mb-1" />
          <div className="text-xs text-gray-500">Restricted Modules</div>
          <div className="text-xl font-bold">3</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <Settings size={20} className="mx-auto text-[#dc2626] mb-1" />
          <div className="text-xs text-gray-500">Permission Changes (This Month)</div>
          <div className="text-xl font-bold">7</div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-2 mb-6">
        <Search size={18} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2f6efb] w-full md:w-1/3"
        />
      </div>

      {/* ROLE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {filteredRoles.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[#012b73] text-lg">
                  {r.name}
                </h3>
                <p className="text-xs text-gray-500">{r.description}</p>
              </div>
              <div className="text-sm font-semibold text-green-600">
                {r.users} users
              </div>
            </div>
            <div className="text-sm text-gray-700 mb-2 font-medium">
              Permissions:
            </div>
            <ul className="ml-5 list-disc text-xs text-gray-600 mb-3">
              {r.permissions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button className="text-blue-600 hover:text-blue-700 text-xs">
                Edit
              </button>
              <button className="text-red-600 hover:text-red-700 text-xs">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ACCESS MATRIX PREVIEW */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8 overflow-x-auto">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <KeyRound size={16} /> Access Matrix (Preview)
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f9fafc] text-gray-600 text-xs uppercase border-b">
              <th className="p-3 text-left">Module</th>
              {roles.map((r) => (
                <th key={r.id} className="p-3 text-center">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["Requisitions", "RFQs", "Auctions", "Awards", "POs", "Contracts"].map(
              (module, i) => (
                <tr key={i} className="border-b hover:bg-[#f5f7fb] transition">
                  <td className="p-3">{module}</td>
                  {roles.map((r, j) => (
                    <td key={j} className="p-3 text-center">
                      {Math.random() > 0.5 ? (
                        <CheckCircle size={14} className="text-green-500 mx-auto" />
                      ) : (
                        <XCircle size={14} className="text-red-400 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <FileText size={14} className="inline mr-1 text-[#2f6efb]" />
            {roles.length} roles currently configured in system.
          </div>
          <div className="text-gray-500">Access audit synced on {new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
