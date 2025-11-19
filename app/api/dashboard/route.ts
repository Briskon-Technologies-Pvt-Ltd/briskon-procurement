// /app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// service-role client because this is a backend route
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type AnyRecord = Record<string, any>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // support multiple possible param names, falls back to "all orgs"
  const organizationId =
    searchParams.get("org_id") ||
    searchParams.get("organization_id") ||
    searchParams.get("organizationId") ||
    null;

  const applyOrgFilter = (query: any, column = "organization_id") => {
    if (organizationId) {
      return query.eq(column, organizationId);
    }
    return query;
  };

  try {
    // ------- KPI COUNTS -------
    const requisitionsPromise = applyOrgFilter(
      supabase.from("requisitions").select("id", { count: "exact" })
    );

    const rfqsPromise = applyOrgFilter(
      supabase.from("rfqs").select("id", { count: "exact" })
    );

    const auctionsPromise = applyOrgFilter(
      supabase.from("auctions").select("id", { count: "exact" })
    );

    const suppliersPromise = applyOrgFilter(
      supabase.from("suppliers").select("id", { count: "exact" }),
      "org_onboarded_to"
    );

    const awardsPromise = applyOrgFilter(
      supabase.from("awards").select("id", { count: "exact" })
    );

    // ------- SPEND BY CATEGORY (using requisitions.cost_center) -------
    const spendPromise = applyOrgFilter(
      supabase.from("requisitions").select("cost_center, estimated_value")
    );

    // ------- SUPPLIER PERFORMANCE (approx: awards per month) -------
    const awardsForPerfPromise = applyOrgFilter(
      supabase.from("awards").select("id, awarded_at")
    );

    // ------- LISTS FOR CARDS -------
    const auctionsListPromise = applyOrgFilter(
      supabase
        .from("auctions")
        .select(
          `
          id,
          auction_type,
          start_at,
          end_at,
          status,
          created_at,
          rfq:rfqs ( title ),
          organization:organizations ( name )
        `
        )
        .order("created_at", { ascending: false })
        .limit(10)
    );

    const proposalsListPromise = applyOrgFilter(
      supabase
        .from("proposal_submissions")
        .select(
          `
          id,
          status,
          submitted_at,
          rfq:rfqs ( id, title ),
          supplier:suppliers ( company_name )
        `
        )
        .order("submitted_at", { ascending: false })
        .limit(10)
    );

    const purchaseOrdersPromise = applyOrgFilter(
      supabase
        .from("purchase_orders")
        .select(
          `
          id,
          po_number,
          total_amount,
          currency,
          status,
          due_date,
          created_at,
          supplier:suppliers ( company_name )
        `
        )
        .order("created_at", { ascending: false })
        .limit(10)
    );

    const approvalsPromise = applyOrgFilter(
      supabase
        .from("approvals")
        .select("id, entity_type, entity_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
    );

    const notificationsPromise = applyOrgFilter(
      supabase
        .from("notifications")
        .select("id, message, type, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      // notifications are per profile normally, but we leave org filter as-is
      "recipient_profile_id"
    );

    // Use messages table (not notifications) – very defensive on columns
    const messagesPromise = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    const [
      requisitionsRes,
      rfqsRes,
      auctionsResCount,
      suppliersRes,
      awardsResCount,
      spendRes,
      awardsForPerfRes,
      auctionsListRes,
      proposalsListRes,
      purchaseOrdersRes,
      approvalsRes,
      notificationsRes,
      messagesRes,
    ] = await Promise.all([
      requisitionsPromise,
      rfqsPromise,
      auctionsPromise,
      suppliersPromise,
      awardsPromise,
      spendPromise,
      awardsForPerfPromise,
      auctionsListPromise,
      proposalsListPromise,
      purchaseOrdersPromise,
      approvalsPromise,
      notificationsPromise,
      messagesPromise,
    ]);

    // Basic error bubbling (only log; still try to return what we can)
    const allErrors = [
      requisitionsRes.error,
      rfqsRes.error,
      auctionsResCount.error,
      suppliersRes.error,
      awardsResCount.error,
      spendRes.error,
      awardsForPerfRes.error,
      auctionsListRes.error,
      proposalsListRes.error,
      purchaseOrdersRes.error,
      approvalsRes.error,
      notificationsRes.error,
      messagesRes.error,
    ].filter(Boolean);

    if (allErrors.length) {
      console.error(
        "Dashboard API errors:",
        allErrors.map((e: any) => e.message || e)
      );
    }

    // ------- KPIs -------
    const kpis = {
      totalRequisitions: requisitionsRes.count ?? 0,
      activeRfqs: rfqsRes.count ?? 0,
      liveAuctions: auctionsResCount.count ?? 0,
      totalSuppliers: suppliersRes.count ?? 0,
      awardsIssued: awardsResCount.count ?? 0,
    };

    // ------- Spend by category (cost_center) -------
    const spendRows = (spendRes.data ?? []) as AnyRecord[];
    const spendMap = new Map<string, number>();
    for (const row of spendRows) {
      const key = row.cost_center || "Unclassified";
      const value = Number(row.estimated_value || 0);
      spendMap.set(key, (spendMap.get(key) || 0) + value);
    }
    const spendByCategory = Array.from(spendMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // ------- Supplier performance (awards per month) -------
    const perfRows = (awardsForPerfRes.data ?? []) as AnyRecord[];
    const perfMap = new Map<string, number>();

    for (const row of perfRows) {
      if (!row.awarded_at) continue;
      const d = new Date(row.awarded_at);
      const key = d.toLocaleString("default", { month: "short" });
      perfMap.set(key, (perfMap.get(key) || 0) + 1);
    }

    const supplierPerformance = Array.from(perfMap.entries())
      .map(([month, count]) => ({
        month,
        score: count, // can later normalise to 100-scale if you want
      }))
      .sort(
        (a, b) =>
          new Date(`${a.month} 1, 2000`).getTime() -
          new Date(`${b.month} 1, 2000`).getTime()
      );

    // ------- Auctions list -------
    const auctionsRows = (auctionsListRes.data ?? []) as AnyRecord[];
    const auctions = auctionsRows.map((row) => ({
      id: row.id,
      title: row.rfq?.title || "Auction",
      start_at: row.start_at,
      end_at: row.end_at,
      status: row.status,
      type: row.auction_type,
      organization: row.organization?.name || "Organization",
    }));

    // ------- Proposals / submissions -------
    const proposalRows = (proposalsListRes.data ?? []) as AnyRecord[];
    const proposals = proposalRows.map((row) => ({
      id: row.id,
      rfq_ref: row.rfq?.id || row.rfq?.title || "RFQ",
      supplier_name: row.supplier?.company_name || "Supplier",
      status: row.status,
    }));

    // ------- Purchase orders -------
    const poRows = (purchaseOrdersRes.data ?? []) as AnyRecord[];
    const purchaseOrders = poRows.map((row) => ({
      id: row.id,
      po_number: row.po_number,
      supplier_name: row.supplier?.company_name || "Supplier",
      total: Number(row.total_amount || 0),
      currency: row.currency || "USD",
      status: row.status,
      due_date: row.due_date,
    }));

    // ------- Approvals -------
    const approvalsRows = (approvalsRes.data ?? []) as AnyRecord[];
    const approvals = approvalsRows.map((row) => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      status: row.status,
      created_at: row.created_at,
    }));

    // ------- Notifications (recent activity) -------
    const notificationRows = (notificationsRes.data ?? []) as AnyRecord[];
    const notifications = notificationRows.map((row) => ({
      id: row.id,
      message: row.message,
      type: row.type,
      created_at: row.created_at,
    }));

    // ------- Messages (from messages table) -------
    let messages: AnyRecord[] = [];
    if (!messagesRes.error) {
      const msgRows = (messagesRes.data ?? []) as AnyRecord[];
      messages = msgRows.map((row) => ({
        id: row.id,
        subject:
          row.subject ||
          row.title ||
          (row.message ? row.message.slice(0, 60) : "") ||
          (row.body ? row.body.slice(0, 60) : "") ||
          "Message",
        body: row.body || row.message || row.content || "",
        created_at: row.created_at || row.sent_at || null,
      }));
    } else {
      // If messages table genuinely doesn’t exist, just return empty
      messages = [];
    }

    const payload = {
      kpis,
      spendByCategory,
      supplierPerformance,
      auctions,
      proposals,
      purchaseOrders,
      approvals,
      notifications,
      messages,
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("Dashboard API fatal error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
