"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, XCircle, Trash2 } from "lucide-react";
import { useAuth } from "../../../../components/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Option = { id: string; name: string; code?: string; parent_id?: string | null };

const currencyOptions = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "CAD", name: "Canadian Dollar (C$)" },
  { code: "INR", name: "Indian Rupee (₹)" },
  { code: "JPY", name: "Japanese Yen (¥)" },
  { code: "GBP", name: "British Pound (£)" },
];

export default function EditRequisitionPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();

  const [formData, setFormData] = useState<any>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [costCenters, setCostCenters] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subcategories, setSubcategories] = useState<Option[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =============================================================
  // LOAD REQUISITION + PROFILE + MASTERS TOGETHER
  // =============================================================
  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  async function loadAll() {
    try {
      setLoading(true);

      // Fetch requisition, profile, and category/department data simultaneously
      const [reqRes, profRes] = await Promise.all([
        fetch(`/api/requisitions?id=${id}`).then((r) => r.json()),
        supabase.from("profiles").select("id, organization_id").eq("id", profile?.id).maybeSingle(),
      ]);

      if (!reqRes.success) throw new Error(reqRes.error);
      const req = reqRes.data;
      const orgId = profRes.data?.organization_id;

      // Load master lists in parallel
      const [dept, cat] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, code")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("categories")
          .select("id, name, parent_id")
          .is("parent_id", null)
          .order("name"),
      ]);

      setDepartments(dept.data || []);
      setCategories(cat.data || []);

      setFormData({
        department_id: req.department_id || "",
        cost_center_id: req.cost_center_id || "",
        category_id: req.category_id || "",
        subcategory_id: req.subcategory_id || "",
        description: req.description || "",
        estimated_value: req.estimated_value || "",
        currency: req.currency || "USD",
        attachments: req.attachments || [],
      });

      // Preload dependent dropdowns
      if (req.department_id)
        loadCostCenters(req.department_id, setCostCenters);
      if (req.category_id)
        loadSubcategories(req.category_id, setSubcategories);

    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCostCenters(deptId: string, setter: any) {
    const { data } = await supabase
      .from("cost_centers")
      .select("id, name, code")
      .eq("department_id", deptId)
      .eq("is_active", true)
      .order("name");
    setter(data || []);
  }

  async function loadSubcategories(catId: string, setter: any) {
    const { data } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("parent_id", catId)
      .order("name");
    setter(data || []);
  }

  // =============================================================
  // FILE HANDLERS
  // =============================================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleRemoveAttachment = (index: number) => {
    const updated = [...formData.attachments];
    updated.splice(index, 1);
    setFormData({ ...formData, attachments: updated });
  };

  // =============================================================
  // SAVE HANDLER
  // =============================================================
  async function handleSave() {
    if (!profile) return alert("Profile not found.");
    setSaving(true);

    try {
      // Upload new files
      let uploadedFiles = [...(formData.attachments || [])];
      for (const file of files) {
        const filePath = `${profile.organization_id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("requisition-files")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicURL } = supabase.storage
          .from("requisition-files")
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: publicURL.publicUrl,
          uploaded_at: new Date().toISOString(),
        });
      }

      const updatePayload = {
        department_id: formData.department_id || null,
        cost_center_id: formData.cost_center_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        description: formData.description.trim(),
        estimated_value: Number(formData.estimated_value) || null,
        currency: formData.currency,
        attachments: uploadedFiles,
      };

      const res = await fetch("/api/requisitions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "update",
          actor_id: profile.id,
          fields: updatePayload,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert("✅ Requisition updated successfully!");
      router.push(`/admin/requisitions/${id}`);
    } catch (err: any) {
      alert("Failed to save: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // =============================================================
  // RENDER
  // =============================================================
  if (loading)
    return <div className="p-6 text-gray-500">Loading requisition...</div>;
  if (!formData)
    return <div className="p-6 text-red-600">No requisition found.</div>;

  return (
    <div className="admin-content max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-[#012b73] mb-4">
        Edit Requisition
      </h1>

      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* DEPARTMENT */}
          <SelectField
            label="Department"
            name="department_id"
            options={departments}
            value={formData.department_id}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ ...formData, department_id: val, cost_center_id: "" });
              loadCostCenters(val, setCostCenters);
            }}
          />

          {/* COST CENTER */}
          <SelectField
            label="Cost Center"
            name="cost_center_id"
            options={costCenters}
            value={formData.cost_center_id}
            onChange={(e) =>
              setFormData({ ...formData, cost_center_id: e.target.value })
            }
          />

          {/* CATEGORY */}
          <SelectField
            label="Category"
            name="category_id"
            options={categories}
            value={formData.category_id}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ ...formData, category_id: val, subcategory_id: "" });
              loadSubcategories(val, setSubcategories);
            }}
          />

          {/* SUBCATEGORY */}
          <SelectField
            label="Subcategory"
            name="subcategory_id"
            options={subcategories}
            value={formData.subcategory_id}
            onChange={(e) =>
              setFormData({ ...formData, subcategory_id: e.target.value })
            }
          />

          {/* VALUE + CURRENCY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Value
            </label>
            <input
              type="number"
              value={formData.estimated_value}
              onChange={(e) =>
                setFormData({ ...formData, estimated_value: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {currencyOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
            />
          </div>

          {/* ATTACHMENTS */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attach Documents
            </label>
            <div className="border border-gray-300 rounded-md p-3 flex flex-col gap-2">
              {formData.attachments?.length > 0 && (
                <ul className="text-xs text-blue-600 list-disc pl-5">
                  {formData.attachments.map((file: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between">
                      <a href={file.url} target="_blank" rel="noreferrer">
                        {file.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input type="file" multiple onChange={handleFileChange} />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 pt-4 justify-end">
          <button
            onClick={() => router.push(`/admin/requisitions/${id}`)}
            className="cta-btn flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <XCircle size={16} /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------
   Reusable SelectField Component
--------------------------------------- */
function SelectField({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (e: any) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.code ? `${opt.code} - ${opt.name}` : opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
