"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/admin.css";
import { Save, XCircle, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../../../components/auth/AuthProvider";

type Option = { id: string; name: string; code?: string; parent_id?: string | null };

const currencyOptions = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "CAD", name: "Canadian Dollar (C$)" },
  { code: "INR", name: "Indian Rupee (₹)" },
  { code: "JPY", name: "Japanese Yen (¥)" },
  { code: "GBP", name: "British Pound (£)" },
];

export default function NewRequisitionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [costCenters, setCostCenters] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subcategories, setSubcategories] = useState<Option[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    department_id: "",
    cost_center_id: "",
    category_id: "",
    subcategory_id: "",
    description: "",
    estimated_value: "",
    currency: "USD",
  });

  // =============================================================
  // LOAD PROFILE (organization_id & user info)
  // =============================================================
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, organization_id, fname, lname, metadata")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) console.error("Error fetching profile:", error);
      setProfile(data);
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  // =============================================================
  // LOAD DEPARTMENTS & CATEGORIES
  // =============================================================
  useEffect(() => {
    async function loadMasters() {
      if (!profile?.organization_id) return;

      const { data: deptData, error: deptErr } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .order("name");

      const { data: catData, error: catErr } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .is("parent_id", null)
      .order("name");
      
      if (deptErr) console.error("Departments error:", deptErr);
      if (catErr) console.error("Categories error:", catErr);

      setDepartments(deptData || []);
      setCategories(catData || []);
    }

    loadMasters();
  }, [profile]);

  // =============================================================
  // LOAD COST CENTERS WHEN DEPARTMENT CHANGES
  // =============================================================
  useEffect(() => {
    async function loadCostCenters() {
      if (!formData.department_id) {
        setCostCenters([]);
        return;
      }

      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, name, code")
        .eq("department_id", formData.department_id)
        .eq("is_active", true)
        .order("name");

      if (error) console.error("Cost center load error:", error);
      setCostCenters(data || []);
    }

    loadCostCenters();
  }, [formData.department_id]);

  // =============================================================
  // LOAD SUBCATEGORIES WHEN CATEGORY CHANGES
  // =============================================================
  useEffect(() => {
    async function loadSubcats() {
      if (!formData.category_id) {
        setSubcategories([]);
        return;
      }

      const { data, error } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("parent_id", formData.category_id)
      .order("name");
      
      if (error) console.error("Subcategory load error:", error);
      setSubcategories(data || []);
    }

    loadSubcats();
  }, [formData.category_id]);

  // =============================================================
  // FILE HANDLING
  // =============================================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  // =============================================================
  // SUBMIT HANDLER
  // =============================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return alert("Profile not found. Please re-login.");
    setSubmitting(true);

    try {
      let uploadedFiles: any[] = [];

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

      const payload = {
        action: "create",
        organization_id: profile.organization_id,
        requested_by: profile.id,
        department_id: formData.department_id || null,
        cost_center_id: formData.cost_center_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        description: formData.description.trim(),
        estimated_value: formData.estimated_value
          ? Number(formData.estimated_value)
          : null,
        currency: formData.currency,
        attachments: uploadedFiles,
      };

      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unknown error");

      alert("✅ Requisition created successfully!");
      router.push("/admin/requisitions");
    } catch (err: any) {
      console.error("Requisition creation failed:", err);
      alert("Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="p-6 text-gray-500">Loading profile...</div>;

  // =============================================================
  // UI
  // =============================================================
  return (
    <div className="admin-content max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-[#012b73] mb-4">
        Create New Requisition
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md border border-gray-100 p-6 space-y-6"
      >
        {/* Header Info */}
        <div className="bg-[#f9fafc] p-3 rounded-md text-sm text-gray-700 border border-gray-200">
          <div>
            <b>Logged in as:</b> {profile.fname} {profile.lname}
          </div>
          <div className="text-gray-500">
            Org ID: <span className="font-mono">{profile.organization_id}</span>
          </div>
        </div>

        {/* Two Column Form Layout */}
        <div className="grid grid-cols-2 gap-6">
          <SelectField
            label="Department"
            name="department_id"
            options={departments}
            value={formData.department_id}
            onChange={(e) =>
              setFormData({
                ...formData,
                department_id: e.target.value,
                cost_center_id: "",
              })
            }
            placeholder="Select Department"
          />

          <SelectField
            label="Cost Center"
            name="cost_center_id"
            options={costCenters}
            value={formData.cost_center_id}
            onChange={(e) =>
              setFormData({ ...formData, cost_center_id: e.target.value })
            }
            placeholder="Select Cost Center"
          />

          <SelectField
            label="Category"
            name="category_id"
            options={categories}
            value={formData.category_id}
            onChange={(e) =>
              setFormData({
                ...formData,
                category_id: e.target.value,
                subcategory_id: "",
              })
            }
            placeholder="Select Category"
          />

          <SelectField
            label="Subcategory"
            name="subcategory_id"
            options={subcategories}
            value={formData.subcategory_id}
            onChange={(e) =>
              setFormData({ ...formData, subcategory_id: e.target.value })
            }
            placeholder="Select Subcategory"
          />

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Value
            </label>
            <input
              type="number"
              name="estimated_value"
              value={formData.estimated_value}
              onChange={(e) =>
                setFormData({ ...formData, estimated_value: e.target.value })
              }
              placeholder="Enter amount"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              name="currency"
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

          {/* Description (full width) */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the requisition"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          {/* Attachments (full width) */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attach Documents
            </label>
            <div className="border border-gray-300 rounded-md p-3 flex flex-col gap-2">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="text-sm"
              />
              {files.length > 0 && (
                <ul className="text-xs text-gray-600 list-disc pl-5">
                  {files.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 pt-4 justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/requisitions")}
            className="cta-btn flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <XCircle size={16} /> Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Save size={16} />
            {submitting ? "Creating..." : "Create Requisition"}
          </button>
        </div>
      </form>
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
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (e: any) => void;
  placeholder?: string;
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
        <option value="">{placeholder || "Select an option"}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.code ? `${opt.code} - ${opt.name}` : opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
