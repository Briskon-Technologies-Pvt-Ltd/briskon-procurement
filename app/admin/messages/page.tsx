"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Send, Search } from "lucide-react";

type Conversation = {
  id: string;
  rfq_id: string | null;
  auction_id: string | null;
  supplier_id: string | null;
  supplier_name: string;
  rfq_name?: string | null;
  auction_name?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_admin: boolean | number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_supplier_id: string | null;
  sender_buyer_id: string | null;
  message_text: string;
  created_at: string;
};

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    setSelected(conversationId);
    selectedRef.current = conversationId;

    await fetch("/api/messaging/markReadAdmin", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId }),
    });

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_admin: false } : c))
    );
    setFiltered((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_admin: false } : c))
    );

    const res = await fetch(`/api/messaging/getMessages?conversation_id=${conversationId}`);
    const json = await res.json();
    if (json.success) setMessages(json.messages);

    setLoadingMessages(false);
    scrollToBottom();
  };

  const loadInbox = async () => {
    setLoadingInbox(true);

    const res = await fetch("/api/messaging/adminInbox");
    const json = await res.json();

    if (json.success) {
      const sorted = json.conversations.sort(
        (a: Conversation, b: Conversation) =>
          new Date(b.last_message_at || "").getTime() -
          new Date(a.last_message_at || "").getTime()
      );

      setConversations(sorted);
      setFiltered(sorted);

      if (!selectedRef.current && sorted.length > 0) {
        loadMessages(sorted[0].id);
      }
    }

    setLoadingInbox(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) setAdminId(session.user.id);

      await loadInbox();
    };

    init();

    const channel = supabase
      .channel("messages-realtime-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new as Message;

          if (newMessage.conversation_id === selectedRef.current) {
            setMessages((prev) => [...prev, newMessage]);
            scrollToBottom();
          } else {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === newMessage.conversation_id ? { ...c, unread_admin: true } : c
              )
            );
            setFiltered((prev) =>
              prev.map((c) =>
                c.id === newMessage.conversation_id ? { ...c, unread_admin: true } : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filterInbox = (value: string) => {
    setSearch(value);
    const v = value.toLowerCase();
    setFiltered(
      conversations.filter(
        (c) =>
          c.supplier_name.toLowerCase().includes(v) ||
          c.last_message?.toLowerCase().includes(v) ||
          c.rfq_name?.toLowerCase().includes(v) ||
          c.auction_name?.toLowerCase().includes(v)
      )
    );
  };

  const formatTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

  const selectedConv = conversations.find((c) => c.id === selected);

  const sendMessage = async () => {
    if (!text.trim() || !selected || !adminId) return;

    await fetch("/api/messaging/sendMessage", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: selected,
        message_text: text.trim(),
        sender_buyer_id: adminId,
      }),
    });

    setText("");
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white">

      {/* LEFT PANEL */}
      <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-500 mb-4 tracking-wide">MESSAGES</h2>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => filterInbox(e.target.value)}
            placeholder="Search supplier, message or title"
            className="w-full border rounded-xl px-9 py-2 text-sm focus:outline-indigo-500"
          />
        </div>

        {loadingInbox && <Loader2 className="animate-spin mx-auto" />}

        {!loadingInbox && filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => loadMessages(c.id)}
            className={`relative p-4 rounded-xl cursor-pointer mb-3 transition flex gap-3 ${
              selected === c.id ? "bg-indigo-100 border border-indigo-300" : "bg-gray-100"
            }`}
          >
            {/* COLORED SIDE BAR */}
            <div
              className={`w-1.5 rounded-full ${
                c.rfq_id ? "bg-green-600" : "bg-indigo-600"
              }`}
            />

            <div className="flex-1">
              <div className="flex justify-between items-center">
                <div className="text-[13px] font-semibold text-gray-900 truncate">
                  {c.rfq_name || c.auction_name}
                </div>
                <div className="text-[11px] text-gray-500 ml-2">
                  {formatTime(c.last_message_at)}
                </div>
              </div>

              <div className="text-[12px] text-gray-600 mt-1 truncate">
                {c.last_message?.substring(0, 60)}
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Supplier: <span className="font-medium">{c.supplier_name}</span>
              </div>
            </div>

            {(c.unread_admin === true || c.unread_admin === 1) && (
              <span className="absolute top-3 right-4 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
          </div>
        ))}
      </div>

      {/* RIGHT CHAT PANEL */}
      <div className="flex-1 flex flex-col">
        {selectedConv && (
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="font-semibold text-gray-900">{selectedConv.supplier_name}</div>
            <div className="text-xs text-gray-600">
              {selectedConv.rfq_id ? selectedConv.rfq_name : selectedConv.auction_name}
            </div>
          </div>
        )}

        {/* CHAT MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loadingMessages && <Loader2 className="animate-spin mx-auto" />}

          {!loadingMessages && messages.map((m) => {
            const isAdmin = m.sender_buyer_id === adminId;
            return (
              <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl shadow text-sm ${
                    isAdmin
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-200 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  <div className="mb-1 text-[10px] opacity-70">
                    {isAdmin ? "You" : selectedConv?.supplier_name}
                  </div>
                  <div>{m.message_text}</div>
                  <div className="text-[10px] mt-1 opacity-50 text-right">
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* SEND BOX */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-indigo-500"
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
