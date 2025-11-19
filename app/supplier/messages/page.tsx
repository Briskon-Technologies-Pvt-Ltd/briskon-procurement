// /app/messages/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  MessageSquarePlus,
  Send,
  X,
} from "lucide-react";

type ConversationSummary = {
  id: string;
  title: string;
  last_message: string | null;
  last_message_at: string | null;
  context_type: "rfq" | "auction" | "contract" | "unknown";
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_supplier_id: string | null;
  sender_buyer_id: string | null;
  body: string;
  created_at: string;
};

type EventOption = {
  id: string;
  title: string;
};

type EventsResponse = {
  rfqs: EventOption[];
  auctions: EventOption[];
};

export default function MessagesPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [contextType, setContextType] = useState<"rfq" | "auction">("rfq");
  const [events, setEvents] = useState<EventsResponse>({ rfqs: [], auctions: [] });
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [chatInput, setChatInput] = useState("");

  // Resolve supplierId from auth -> profiles -> supplier_contacts
  useEffect(() => {
    const loadSupplier = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile?.id) return;

      const { data: contact } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!contact?.supplier_id) return;

      setSupplierId(contact.supplier_id);
    };

    loadSupplier();
  }, []);

  // Load inbox when supplierId is ready
  useEffect(() => {
    if (!supplierId) return;
    const loadInbox = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/messaging/inbox?supplier_id=${supplierId}`
        );
        const json = await res.json();
        if (json.success) {
          setConversations(json.conversations || []);
          if (json.conversations?.length && !selectedConversationId) {
            setSelectedConversationId(json.conversations[0].id);
          }
        } else {
          console.error("Inbox error:", json.error);
        }
      } catch (err) {
        console.error("Inbox load error:", err);
      }
      setLoading(false);
    };
    loadInbox();
  }, [supplierId]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(
          `/api/messaging/messages?conversation_id=${selectedConversationId}`
        );
        const json = await res.json();
        if (json.success) {
          setMessages(json.messages || []);
        } else {
          console.error("Messages error:", json.error);
        }
      } catch (err) {
        console.error("Messages load error:", err);
      }
      setLoadingMessages(false);
    };
    loadMessages();
  }, [selectedConversationId]);

  const formatTimeShort = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateTimeBubble = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString();
  };

  const activeConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const openNewMessageModal = async () => {
    setShowNewModal(true);
    setContextType("rfq");
    setSelectedEventId("");
    setNewMessageBody("");

    try {
      const res = await fetch("/api/messaging/events");
      const json = await res.json();
      if (json.success) {
        setEvents({
          rfqs: json.rfqs || [],
          auctions: json.auctions || [],
        });
      } else {
        console.error("Events error:", json.error);
      }
    } catch (err) {
      console.error("Events load error:", err);
    }
  };

  const handleSendNewMessage = async () => {
    if (!supplierId || !selectedEventId || !newMessageBody.trim()) return;

    try {
      const res = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          context_type: contextType,
          context_id: selectedEventId,
          message: newMessageBody.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.error("Send new message error:", json.error);
        return;
      }

      const convId = json.conversation_id as string;

      // Reload inbox and select this conversation
      const inboxRes = await fetch(
        `/api/messaging/inbox?supplier_id=${supplierId}`
      );
      const inboxJson = await inboxRes.json();
      if (inboxJson.success) {
        setConversations(inboxJson.conversations || []);
        setSelectedConversationId(convId);
      }

      setShowNewModal(false);
      setNewMessageBody("");
    } catch (err) {
      console.error("Send new message error:", err);
    }
  };

  const handleSendChatMessage = async () => {
    if (!supplierId || !selectedConversationId || !chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");

    try {
      const res = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          supplier_id: supplierId,
          message: text,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.error("Send chat message error:", json.error);
        return;
      }

      // Optimistic reload
      const msgRes = await fetch(
        `/api/messaging/messages?conversation_id=${selectedConversationId}`
      );
      const msgJson = await msgRes.json();
      if (msgJson.success) {
        setMessages(msgJson.messages || []);
      }

      // Also refresh inbox so last_message / time updates
      const inboxRes = await fetch(
        `/api/messaging/inbox?supplier_id=${supplierId}`
      );
      const inboxJson = await inboxRes.json();
      if (inboxJson.success) {
        setConversations(inboxJson.conversations || []);
      }
    } catch (err) {
      console.error("Send chat message error:", err);
    }
  };

  const currentEventOptions =
    contextType === "rfq" ? events.rfqs : events.auctions;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* LEFT: Conversation List */}
      <div className="w-full md:w-1/3 lg:w-1/3 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Messages</h2>
            <p className="text-xs text-slate-400">
              Conversations linked to your RFQs & auctions
            </p>
          </div>
          <button
            onClick={openNewMessageModal}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-50"
          >
            <MessageSquarePlus className="h-3 w-3" />
            New
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-slate-500 text-sm px-4 text-center">
            No conversations yet. Start a new message to contact the buyer.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedConversationId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/60 hover:bg-slate-900/60 transition ${
                  c.id === selectedConversationId
                    ? "bg-slate-900/70"
                    : "bg-transparent"
                }`}
              >
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-100 line-clamp-1">
                    {c.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatTimeShort(c.last_message_at)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-2">
                  {c.last_message || "No messages yet"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Chat Window */}
      <div className="hidden md:flex flex-1 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex-col">
        {!selectedConversationId || !activeConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-500 text-sm px-6 text-center">
            <p>Select a conversation from the left or start a new message.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 line-clamp-1">
                  {activeConversation.title}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeConversation.context_type === "rfq"
                    ? "RFQ communication"
                    : activeConversation.context_type === "auction"
                    ? "Auction communication"
                    : "General communication"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center text-slate-400 text-sm h-full">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center text-slate-500 text-sm h-full">
                  No messages yet. Start the conversation below.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_supplier_id === supplierId;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs ${
                          isMine
                            ? "bg-indigo-600 text-slate-50 rounded-br-sm"
                            : "bg-slate-800 text-slate-100 rounded-bl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.body}
                        </div>
                        <div className="mt-1 text-[10px] opacity-70 text-right">
                          {formatDateTimeBubble(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-800/80 px-4 py-3">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
              >
                <input
                  type="text"
                  className="flex-1 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-semibold text-slate-50 disabled:opacity-60"
                  disabled={!chatInput.trim()}
                >
                  <Send className="h-3 w-3" />
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* New Message Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">
                New Message
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Communication context
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setContextType("rfq");
                      setSelectedEventId("");
                    }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 ${
                      contextType === "rfq"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                        : "border-slate-700 bg-slate-900/80 text-slate-300"
                    }`}
                  >
                    RFQ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContextType("auction");
                      setSelectedEventId("");
                    }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 ${
                      contextType === "auction"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                        : "border-slate-700 bg-slate-900/80 text-slate-300"
                    }`}
                  >
                    Auction
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Select {contextType === "rfq" ? "RFQ" : "Auction"}
                </label>
                <select
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {currentEventOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Message</label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg bg-slate-900/80 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Write your message to the buyer..."
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewModal(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewMessage}
                disabled={
                  !selectedEventId || !newMessageBody.trim() || !supplierId
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-50 font-semibold disabled:opacity-60"
              >
                Send message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
