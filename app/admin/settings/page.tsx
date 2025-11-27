"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
import "@/app/styles/admin.css";

export default function SettingsPage() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  // ------------------- TAB STATE -------------------
  const [activeTab, setActiveTab] =
    useState<"departments" | "costcenters" | "uom">("departments");

  // ------------------- DEPARTMENTS -------------------
  const [departments, setDepartments] = useState<any[]>([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({
    id: "",
    name: "",
    code: "",
    is_active: true,
  });
  const [deptLoading, setDeptLoading] = useState(false);

  // ------------------- COST CENTERS -------------------
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [showCCModal, setShowCCModal] = useState(false);
  const [ccForm, setCCForm] = useState({
    id: "",
    department_id: "",
    name: "",
    code: "",
    description: "",
    is_active: true,
  });
  const [ccLoading, setCCLoading] = useState(false);

  // ------------------- UOM MASTER -------------------
  const [uoms, setUoms] = useState<any[]>([]);
  const [showUOMModal, setShowUOMModal] = useState(false);
  const [uomForm, setUomForm] = useState({
    id: "",
    uom_name: "",
    uom_type: "",
    is_active: true,
  });
  const [uomLoading, setUomLoading] = useState(false);

  // ------------------- LOAD DATA -------------------
  useEffect(() => {
    loadDepartments();
    loadCostCenters();
    loadUOMs();
  }, []);

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

  async function loadUOMs() {
    const res = await fetch("/api/uom-master");
    const json = await res.json();
    if (json.success) setUoms(json.data);
  }

  // ------------------- Department Handlers -------------------
  function openDeptModal(d?: any) {
    if (d) setDeptForm(d);
    else setDeptForm({ id: "", name: "", code: "", is_active: true });
    setShowDeptModal(true);
  }

  async function saveDepartment() {
    if (!deptForm.name.trim()) return alert("Name required");
    setDeptLoading(true);

    const method = deptForm.id ? "PATCH" : "POST";
    const res = await fetch("/api/departments", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deptForm),
    });

    const json = await res.json();
    if (!json.success) alert(json.error);
    setShowDeptModal(false);
    loadDepartments();
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

  // ------------------- COST CENTER HANDLERS -------------------
  function openCCModal(cc?: any) {
    if (cc) setCCForm(cc);
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
    if (!ccForm.name.trim() || !ccForm.department_id)
      return alert("Missing required fields.");

    setCCLoading(true);
    const method = ccForm.id ? "PATCH" : "POST";

    await fetch("/api/cost-centers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ccForm),
    });

    setShowCCModal(false);
    loadCostCenters();
    setCCLoading(false);
  }

  async function deleteCostCenter(id: string) {
    if (!confirm("Delete this record?")) return;
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

  // ------------------- UOM Actions -------------------
  function openUOMModal(u?: any) {
    if (u) setUomForm(u);
    else setUomForm({ id: "", uom_name: "", uom_type: "", is_active: true });
    setShowUOMModal(true);
  }

  async function saveUOM() {
    if (!uomForm.uom_name.trim() || !uomForm.uom_type)
      return alert("Required fields missing.");

    setUomLoading(true);
    const method = uomForm.id ? "PATCH" : "POST";

    await fetch("/api/uom-master", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uomForm),
    });

    setShowUOMModal(false);
    loadUOMs();
    setUomLoading(false);
  }

  async function deleteUOM(id: string) {
    if (!confirm("Delete this UOM?")) return;
    await fetch(`/api/uom-master?id=${id}`, { method: "DELETE" });
    loadUOMs();
  }

  async function toggleUOMStatus(u: any) {
    await fetch("/api/uom-master", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
    });
    loadUOMs();
  }

  // -------------------- RENDER --------------------
  return (
    <div className="admin-content">
      <div className="flex gap-6 mb-8 border-b pb-1">
        <TabButton label="Departments" active={activeTab === "departments"} onClick={() => setActiveTab("departments")} />
        <TabButton label="Cost Centers" active={activeTab === "costcenters"} onClick={() => setActiveTab("costcenters")} />
        <TabButton label="Units of Measure" active={activeTab === "uom"} onClick={() => setActiveTab("uom")} />
      </div>

      {activeTab === "departments" && (
        <DepartmentsSection
          departments={departments}
          openDeptModal={openDeptModal}
          deleteDepartment={deleteDepartment}
          toggleDepartmentStatus={toggleDepartmentStatus}
        />
      )}

      {activeTab === "costcenters" && (
        <CostCentersSection
          costCenters={costCenters}
          openCCModal={openCCModal}
          deleteCostCenter={deleteCostCenter}
          toggleCostCenterStatus={toggleCostCenterStatus}
        />
      )}

      {activeTab === "uom" && (
        <UOMSection
          uoms={uoms}
          openUOMModal={openUOMModal}
          deleteUOM={deleteUOM}
          toggleUOMStatus={toggleUOMStatus}
        />
      )}

      {/* UOM Modal */}
      {showUOMModal && (
        <Modal title="Unit of Measure" onClose={() => setShowUOMModal(false)}>
          <div className="space-y-3">
            <Input label="UOM Name" value={uomForm.uom_name} onChange={(e: any) => setUomForm({ ...uomForm, uom_name: e.target.value })} />
            <Input label="UOM Type" value={uomForm.uom_type} onChange={(e: any) => setUomForm({ ...uomForm, uom_type: e.target.value })} />

            <button onClick={saveUOM} disabled={uomLoading} className="cta-btn primary w-full mt-2 py-2 rounded-md">
              {uomLoading ? "Saving..." : "Save UOM"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- SECTION COMPONENTS ---------------- */

function DepartmentsSection({ departments, openDeptModal, deleteDepartment, toggleDepartmentStatus }: any) {
  return (
    <div className="bg-white border border-blue-200 shadow-md rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#012b73]">🏢 Departments</h2>
        <button onClick={() => openDeptModal()} className="flex items-center gap-2 bg-[#1d4ed8] text-white px-3 py-1.5 rounded-lg">
          <PlusCircle size={16} /> Add Department
        </button>
      </div>

      <div className="overflow-hidden rounded border border-blue-100">
        <table className="w-full text-sm">
          <thead className="bg-[#f1f5fb] text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-center">Active</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d: any) => (
              <tr key={d.id} className="border-b hover:bg-[#f6f9ff]">
                <td className="p-3 text-xs">{d.code}</td>
                <td className="p-3 text-xs">{d.name}</td>
                <td className="p-3 text-center">
                  <ToggleSwitch checked={d.is_active} onChange={() => toggleDepartmentStatus(d)} />
                </td>
                <td className="p-3 text-center flex justify-center gap-3">
                  <button onClick={() => openDeptModal(d)}>
                    <Edit size={16} className="text-blue-500" />
                  </button>
                  <button onClick={() => deleteDepartment(d.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
            {!departments.length && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">No departments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostCentersSection({ costCenters, openCCModal, deleteCostCenter, toggleCostCenterStatus }: any) {
  return (
    <div className="bg-white border border-blue-200 shadow-md rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#012b73]">💼 Cost Centers</h2>
        <button onClick={() => openCCModal()} className="flex items-center gap-2 bg-[#1d4ed8] text-white px-3 py-1.5 rounded-lg">
          <PlusCircle size={16} /> Add Cost Center
        </button>
      </div>

      <div className="overflow-hidden rounded border border-blue-100">
        <table className="w-full text-sm">
          <thead className="bg-[#f1f5fb] text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-center">Active</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {costCenters.map((cc: any) => (
              <tr key={cc.id} className="border-b hover:bg-[#f6f9ff]">
                <td className="p-3 text-xs">{cc.code}</td>
                <td className="p-3 text-xs">{cc.name}</td>
                <td className="p-3 text-xs">{cc.departments?.name || "-"}</td>
                <td className="p-3 text-center">
                  <ToggleSwitch checked={cc.is_active} onChange={() => toggleCostCenterStatus(cc)} />
                </td>
                <td className="p-3 text-center flex justify-center gap-3">
                  <button onClick={() => openCCModal(cc)}>
                    <Edit size={16} className="text-blue-500" />
                  </button>
                  <button onClick={() => deleteCostCenter(cc.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
            {!costCenters.length && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No cost centers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UOMSection({ uoms, openUOMModal, deleteUOM, toggleUOMStatus }: any) {
  return (
    <div className="bg-white border border-blue-200 shadow-md rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#012b73]">📦 Units of Measure</h2>
        <button onClick={() => openUOMModal()} className="flex items-center gap-2 bg-[#1d4ed8] text-white px-3 py-1.5 rounded-lg">
          <PlusCircle size={16} /> Add UOM
        </button>
      </div>

      <div className="overflow-hidden rounded border border-blue-100">
        <table className="w-full text-sm">
          <thead className="bg-[#f1f5fb] text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-center">Active</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {uoms.map((u: any) => (
              <tr key={u.id} className="border-b hover:bg-[#f6f9ff]">
                <td className="p-3 text-xs">{u.uom_name}</td>
                <td className="p-3 text-xs">{u.uom_type}</td>
                <td className="p-3 text-center">
                  <ToggleSwitch checked={u.is_active} onChange={() => toggleUOMStatus(u)} />
                </td>
                <td className="p-3 text-center flex justify-center gap-3">
                  <button onClick={() => openUOMModal(u)}>
                    <Edit size={16} className="text-blue-500" />
                  </button>
                  <button onClick={() => deleteUOM(u.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
            {!uoms.length && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">No UOM found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- REUSABLE COMPONENTS ---------------- */
function TabButton({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium border-b-2 ${
        active ? "border-[#012b73] text-[#012b73]" : "border-transparent text-gray-500 hover:text-[#012b73]"
      }`}
    >
      {label}
    </button>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        {children}
        <button onClick={onClose} className="absolute top-2 right-3 text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input value={value} onChange={onChange} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 ring-[#012b73]" />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: any) {
  return (
    <button onClick={onChange} className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${checked ? "bg-green-600" : "bg-gray-300"}`}>
      <span className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}
