"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../../components/auth/AuthProvider";
import "@/app/styles/admin.css";

export default function SettingsPage() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  // Departments
  const [departments, setDepartments] = useState<any[]>([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ id: "", name: "", code: "", is_active: true });
  const [deptLoading, setDeptLoading] = useState(false);

  // Cost Centers
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [showCCModal, setShowCCModal] = useState(false);
  const [ccForm, setCCForm] = useState({
    id: "",
    department_id: "",
    code: "",
    name: "",
    description: "",
    is_active: true,
  });
  const [ccLoading, setCCLoading] = useState(false);

  // ===============================
  // LOAD DATA
  // ===============================
  useEffect(() => {
    if (orgId) {
      loadDepartments();
      loadCostCenters();
    }
  }, [orgId]);

  async function loadDepartments() {
    const res = await fetch("/api/departments");
    const json = await res.json();
    if (json.success) setDepartments(json.data);
  }

  async function loadCostCenters() {
    const res = await fetch("/api/cost-centers");
    const json = await res.json();
    if (json.success) setCostCenters(json.data);
  }

  // ===============================
  // DEPARTMENT HANDLERS
  // ===============================
  function openDeptModal(d?: any) {
    if (d)
      setDeptForm({ id: d.id, name: d.name, code: d.code, is_active: d.is_active });
    else setDeptForm({ id: "", name: "", code: "", is_active: true });
    setShowDeptModal(true);
  }

  async function saveDepartment() {
    if (!orgId || !deptForm.name.trim()) return alert("Name is required.");
    setDeptLoading(true);

    const method = deptForm.id ? "PATCH" : "POST";
    const body = { ...deptForm, organization_id: orgId };

    const res = await fetch("/api/departments", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      setShowDeptModal(false);
      loadDepartments();
    } else alert(data.error || "Error saving department");

    setDeptLoading(false);
  }

  async function deleteDepartment(id: string) {
    if (!confirm("Delete this department?")) return;
    await fetch(`/api/departments?id=${id}`, { method: "DELETE" });
    loadDepartments();
  }

  async function toggleDepartmentStatus(d: any) {
    await fetch("/api/departments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, is_active: !d.is_active }),
    });
    loadDepartments();
  }

  // ===============================
  // COST CENTER HANDLERS
  // ===============================
  function openCCModal(cc?: any) {
    if (cc)
      setCCForm({
        id: cc.id,
        department_id: cc.department_id,
        name: cc.name,
        code: cc.code,
        description: cc.description || "",
        is_active: cc.is_active,
      });
    else
      setCCForm({
        id: "",
        department_id: "",
        name: "",
        code: "",
        description: "",
        is_active: true,
      });
    setShowCCModal(true);
  }

  async function saveCostCenter() {
    if (!orgId || !ccForm.name.trim() || !ccForm.department_id)
      return alert("All fields are required.");

    setCCLoading(true);
    const method = ccForm.id ? "PATCH" : "POST";
    const body = { ...ccForm, organization_id: orgId };

    const res = await fetch("/api/cost-centers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      setShowCCModal(false);
      loadCostCenters();
    } else alert(data.error || "Error saving cost center");

    setCCLoading(false);
  }

  async function deleteCostCenter(id: string) {
    if (!confirm("Delete this cost center?")) return;
    await fetch(`/api/cost-centers?id=${id}`, { method: "DELETE" });
    loadCostCenters();
  }

  async function toggleCostCenterStatus(cc: any) {
    await fetch("/api/cost-centers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cc.id, is_active: !cc.is_active }),
    });
    loadCostCenters();
  }

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="admin-content">
      <h1 className="text-2xl font-semibold text-[#012b73] mb-4">⚙️ Settings</h1>
      <p className="text-gray-600 mb-6">
        Manage departments and cost centers associated with your organization.
      </p>

      {/* DEPARTMENTS SECTION */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-lg mb-10 p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#012b73]">🏢 Departments</h2>
          <button
            onClick={() => openDeptModal()}
            className="cta-btn primary flex items-center gap-2 px-3 py-1 rounded-md"
          >
            <PlusCircle size={16} /> Add Department
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f9fafc] text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-center">Active</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-b hover:bg-[#f5f7fb]">
                <td className="p-2">{d.code}</td>
                <td className="p-2">{d.name}</td>
                <td className="p-2 text-center">
                  <ToggleSwitch
                    checked={d.is_active}
                    onChange={() => toggleDepartmentStatus(d)}
                  />
                </td>
                <td className="p-2 text-center flex justify-center gap-2">
                  <button onClick={() => openDeptModal(d)}>
                    <Edit size={15} className="text-blue-600 hover:text-blue-800" />
                  </button>
                  <button onClick={() => deleteDepartment(d.id)}>
                    <Trash2 size={15} className="text-red-600 hover:text-red-800" />
                  </button>
                </td>
              </tr>
            ))}
            {!departments.length && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* COST CENTERS SECTION */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#012b73]">💼 Cost Centers</h2>
          <button
            onClick={() => openCCModal()}
            className="cta-btn primary flex items-center gap-2 px-3 py-1 rounded-md"
          >
            <PlusCircle size={16} /> Add Cost Center
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f9fafc] text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2 text-center">Active</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {costCenters.map((cc) => (
              <tr key={cc.id} className="border-b hover:bg-[#f5f7fb]">
                <td className="p-2">{cc.code}</td>
                <td className="p-2">{cc.name}</td>
                <td className="p-2">{cc.departments?.name || "-"}</td>
                <td className="p-2 text-center">
                  <ToggleSwitch
                    checked={cc.is_active}
                    onChange={() => toggleCostCenterStatus(cc)}
                  />
                </td>
                <td className="p-2 text-center flex justify-center gap-2">
                  <button onClick={() => openCCModal(cc)}>
                    <Edit size={15} className="text-blue-600 hover:text-blue-800" />
                  </button>
                  <button onClick={() => deleteCostCenter(cc.id)}>
                    <Trash2 size={15} className="text-red-600 hover:text-red-800" />
                  </button>
                </td>
              </tr>
            ))}
            {!costCenters.length && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No cost centers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------ MODALS ------------------ */}

      {showDeptModal && (
        <Modal title="Department" onClose={() => setShowDeptModal(false)}>
          <div className="space-y-3">
            <Input label="Code" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} />
            <Input label="Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
            <button
              onClick={saveDepartment}
              disabled={deptLoading}
              className="cta-btn primary w-full mt-2 py-2 rounded-md"
            >
              {deptLoading ? "Saving..." : "Save Department"}
            </button>
          </div>
        </Modal>
      )}

      {showCCModal && (
        <Modal title="Cost Center" onClose={() => setShowCCModal(false)}>
          <div className="space-y-3">
            <Select
              label="Department"
              options={departments}
              value={ccForm.department_id}
              onChange={(e) => setCCForm({ ...ccForm, department_id: e.target.value })}
            />
            <Input label="Code" value={ccForm.code} onChange={(e) => setCCForm({ ...ccForm, code: e.target.value })} />
            <Input label="Name" value={ccForm.name} onChange={(e) => setCCForm({ ...ccForm, name: e.target.value })} />
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Description"
              value={ccForm.description}
              onChange={(e) => setCCForm({ ...ccForm, description: e.target.value })}
            />
            <button
              onClick={saveCostCenter}
              disabled={ccLoading}
              className="cta-btn primary w-full mt-2 py-2 rounded-md"
            >
              {ccLoading ? "Saving..." : "Save Cost Center"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --------------------- Reusable Components --------------------- */
function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        {children}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-md p-2 text-sm"
      />
    </div>
  );
}

function Select({ label, options, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-md p-2 text-sm"
      >
        <option value="">Select...</option>
        {options.map((opt: any) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* --------------------- Toggle Switch --------------------- */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
