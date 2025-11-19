"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Building2,
  FolderTree,
  Users,
  FilePlus,
  Save,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  children?: Category[];
};

type Contact = {
  name: string;
  email: string;
  phone: string;
};

type Document = {
  doc_type: string;
  issued_by: string;
  valid_from: string;
  valid_to: string;
  file?: File | null;
};

export default function AddSupplierPage() {
  const router = useRouter();

  // ================= STATE =================
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "", email: "", phone: "" },
  ]);
  const [documents, setDocuments] = useState<Document[]>([
    { doc_type: "", issued_by: "", valid_from: "", valid_to: "" },
  ]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ================= FETCH ORG ID =================
  useEffect(() => {
    const fetchOrgId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.organization_id) {
        setOrgId(data.organization_id);
      } else {
        console.warn("⚠️ Could not fetch organization ID");
      }
    };
    fetchOrgId();
  }, []);

  // ================= BUILD CATEGORY TREE =================
  const buildCategoryTree = (list: Category[]): Category[] => {
    const map: Record<string, Category> = {};
    const roots: Category[] = [];

    list.forEach((cat) => (map[cat.id] = { ...cat, children: [] }));
    list.forEach((cat) => {
      if (cat.parent_id && map[cat.parent_id])
        map[cat.parent_id].children?.push(map[cat.id]);
      else roots.push(map[cat.id]);
    });
    return roots;
  };

  // ================= FETCH CATEGORIES SAFELY =================
  useEffect(() => {
    const loadCategoriesAfterSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("⏳ Waiting for Supabase session...");
        setTimeout(loadCategoriesAfterSession, 500);
        return;
      }

      console.log("✅ Supabase session ready, fetching categories...");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Error fetching categories:", error.message);
        return;
      }

      if (data) {
        const tree = buildCategoryTree(data);
        setCategories(tree);
        console.log(`✅ Loaded ${tree.length} root categories`);
      }
    };

    loadCategoriesAfterSession();
  }, []);

  // ================= CATEGORY TREE LOGIC =================
  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const renderCategoryTree = (nodes: Category[], depth = 0) =>
    nodes.map((node) => (
      <div key={node.id} style={{ paddingLeft: `${depth * 20}px` }}>
        <div className="flex items-center gap-2 py-1">
          {node.children && node.children.length > 0 ? (
            expanded[node.id] ? (
              <ChevronDown
                size={14}
                className="cursor-pointer text-gray-500"
                onClick={() => toggleExpand(node.id)}
              />
            ) : (
              <ChevronRight
                size={14}
                className="cursor-pointer text-gray-500"
                onClick={() => toggleExpand(node.id)}
              />
            )
          ) : (
            <span className="w-3" />
          )}
          <input
            type="checkbox"
            checked={selectedCategories.includes(node.id)}
            onChange={() => toggleCategory(node.id)}
          />
          <span
            className={`text-sm ${
              node.parent_id ? "text-gray-700" : "font-medium text-[#012b73]"
            }`}
          >
            {node.name}
          </span>
        </div>
        {expanded[node.id] &&
          node.children &&
          node.children.length > 0 &&
          renderCategoryTree(node.children, depth + 1)}
      </div>
    ));

  // ================= ADD CONTACTS / DOCUMENTS =================
  const addContact = () =>
    setContacts([...contacts, { name: "", email: "", phone: "" }]);
  const addDocument = () =>
    setDocuments([
      ...documents,
      { doc_type: "", issued_by: "", valid_from: "", valid_to: "" },
    ]);

  // ================= HANDLE SUBMIT =================
  const handleSubmit = async () => {
    if (!companyName || !country) {
      alert("Company Name and Country are required!");
      return;
    }
    if (!orgId) {
      alert("Organization ID not found. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("company_name", companyName);
      formData.append("country", country);
      formData.append("registration_no", registrationNo);
      formData.append("org_onboarded_to", orgId);

      const metadata = { contacts };
      formData.append("metadata", JSON.stringify(metadata));
      formData.append("categories", JSON.stringify(selectedCategories));

      const docMeta = documents.map((d) => ({
        doc_type: d.doc_type,
        issued_by: d.issued_by,
        valid_from: d.valid_from,
        valid_to: d.valid_to,
      }));
      formData.append("documents", JSON.stringify(docMeta));

      documents.forEach((d) => {
        if (d.file) formData.append("files", d.file);
      });

      const res = await fetch("/api/suppliers", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create supplier");

      alert("✅ Supplier created successfully!");
      router.push("/admin/suppliers");
    } catch (err: any) {
      console.error("❌ Supplier creation failed:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= RENDER =================
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 size={22} className="text-[#012b73]" />
        <h1 className="text-2xl font-semibold text-[#012b73]">
          Add New Supplier
        </h1>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 space-y-6">
        {/* ---- Company Info ---- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-[#2f6efb]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Country</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-[#2f6efb]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Registration No
            </label>
            <input
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-[#2f6efb]"
            />
          </div>
        </div>

        {/* ---- Categories ---- */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderTree size={16} className="text-[#012b73]" />
            <h2 className="font-semibold text-gray-700">Assign Categories</h2>
          </div>
          <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-gray-50">
            {categories.length > 0 ? (
              renderCategoryTree(categories)
            ) : (
              <p className="text-gray-500 text-sm italic">
                No categories found.
              </p>
            )}
          </div>
        </div>

        {/* ---- Contacts ---- */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#012b73]" />
            <h2 className="font-semibold text-gray-700">Add Contacts</h2>
          </div>
          {contacts.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2"
            >
              <input
                placeholder="Name"
                value={c.name}
                onChange={(e) => {
                  const updated = [...contacts];
                  updated[i].name = e.target.value;
                  setContacts(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                placeholder="Email"
                value={c.email}
                onChange={(e) => {
                  const updated = [...contacts];
                  updated[i].email = e.target.value;
                  setContacts(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                placeholder="Phone"
                value={c.phone}
                onChange={(e) => {
                  const updated = [...contacts];
                  updated[i].phone = e.target.value;
                  setContacts(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          ))}
          <button
            onClick={addContact}
            className="text-[#2f6efb] text-sm hover:underline"
          >
            + Add another contact
          </button>
        </div>

        {/* ---- Documents ---- */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FilePlus size={16} className="text-[#012b73]" />
            <h2 className="font-semibold text-gray-700">
              Add Compliance Documents
            </h2>
          </div>
          {documents.map((d, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-2 items-center"
            >
              <input
                placeholder="Document Type"
                value={d.doc_type}
                onChange={(e) => {
                  const updated = [...documents];
                  updated[i].doc_type = e.target.value;
                  setDocuments(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                placeholder="Issued By"
                value={d.issued_by}
                onChange={(e) => {
                  const updated = [...documents];
                  updated[i].issued_by = e.target.value;
                  setDocuments(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="date"
                value={d.valid_from}
                onChange={(e) => {
                  const updated = [...documents];
                  updated[i].valid_from = e.target.value;
                  setDocuments(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="date"
                value={d.valid_to}
                onChange={(e) => {
                  const updated = [...documents];
                  updated[i].valid_to = e.target.value;
                  setDocuments(updated);
                }}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="file"
                onChange={(e) => {
                  const updated = [...documents];
                  updated[i].file = e.target.files?.[0] || null;
                  setDocuments(updated);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
              />
            </div>
          ))}
          <button
            onClick={addDocument}
            className="text-[#2f6efb] text-sm hover:underline"
          >
            + Add another document
          </button>
        </div>

        {/* ---- Save ---- */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-[#2f6efb] text-white px-6 py-2.5 rounded-lg hover:bg-[#174ed7] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {loading ? "Saving..." : "Save Supplier"}
          </button>
        </div>
      </div>

      <button
        onClick={() => router.back()}
        className="mt-4 flex items-center text-gray-600 text-sm hover:text-[#2f6efb]"
      >
        <ArrowLeft size={14} className="mr-1" /> Back
      </button>
    </div>
  );
}
