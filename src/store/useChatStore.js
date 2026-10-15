/**
 * Chat Store — Manages chat widget state with PocketBase persistence.
 * AI logic delegated to chatAPI.sendChatMessage (lean, tool-calling).
 */
import { create } from "zustand";
import { pb } from "../lib/pocketbase";
import { logger } from "../lib/logger";
import { sendChatMessage, generateTitle, fetchAvailableModels } from "../lib/chatAPI";
import { usePOStore } from "./usePOStore";
import { isOverdue } from "../lib/helpers";

const DEFAULT_SETTINGS = {
  system_prompt: "",
  model: "gemini-2.0-flash",
  api_provider: "gemini",
  enabled: true,
  position: "bottom-right",
  primary_color: "#3b82f6",
};

export const useChatStore = create((set, get) => ({
  /* ── State ── */
  conversations: [],
  currentConversation: null,
  messages: [],
  apiKeys: [],
  settings: DEFAULT_SETTINGS,
  availableModels: [],
  isOpen: false,
  isLoading: false,
  isStreaming: false,
  _loaded: false,

  /* ── Init: load from PocketBase ── */
  init: async () => {
    const userId = pb.authStore.model?.id;
    if (!userId) { set({ _loaded: true }); return; }

    try {
      // Settings
      try {
        const recs = await pb.collection("chat_settings").getFullList({ filter: `user = "${userId}"` });
        if (recs.length > 0) set({ settings: { ...get().settings, ...recs[0] } });
      } catch { /* collection may not exist */ }

      // API Keys
      try {
        const keys = await pb.collection("chat_api_keys").getFullList({ filter: `user = "${userId}"` });
        set({ apiKeys: keys });
        if (keys.some((k) => k.provider?.toLowerCase() === "gemini")) get().refreshModels();
      } catch { /* collection may not exist */ }

      // Conversations (last 20)
      try {
        const convos = await pb.collection("chat_conversations").getList(1, 20, {
          filter: `user = "${userId}"`,
          sort: "-updated",
        });
        set({ conversations: convos.items });
      } catch { /* collection may not exist */ }
    } catch (err) {
      logger.error("Chat init failed:", err);
    }
    set({ _loaded: true });
  },

  /* ── Widget ── */
  toggleWidget: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  /* ── Active API Key ── */
  getActiveApiKey: () => {
    const { apiKeys, settings } = get();
    return apiKeys.find(
      (k) => k.provider?.toLowerCase() === settings.api_provider?.toLowerCase() && k.is_active
    );
  },

  /* ── Conversations ── */
  createConversation: async (title = "New Conversation") => {
    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error("Not authenticated");
    const convo = await pb.collection("chat_conversations").create({ user: userId, title, metadata: {} });
    set((s) => ({ conversations: [convo, ...s.conversations], currentConversation: convo, messages: [] }));
    return convo;
  },

  loadConversation: async (id) => {
    set({ isLoading: true });
    try {
      const msgs = await pb.collection("chat_messages").getFullList({ filter: `conversation.id = "${id}"`, sort: "created" });
      const convo = get().conversations.find((c) => c.id === id);
      set({ currentConversation: convo || null, messages: msgs, isLoading: false });
    } catch (err) {
      logger.error("Load conversation failed:", err);
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id) => {
    try {
      const msgs = await pb.collection("chat_messages").getFullList({ filter: `conversation = "${id}"` });
      for (const m of msgs) await pb.collection("chat_messages").delete(m.id);
      await pb.collection("chat_conversations").delete(id);
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        currentConversation: s.currentConversation?.id === id ? null : s.currentConversation,
        messages: s.currentConversation?.id === id ? [] : s.messages,
      }));
    } catch (err) {
      logger.error("Delete conversation failed:", err);
    }
  },

  updateConversationTitle: async (id, title) => {
    try {
      await pb.collection("chat_conversations").update(id, { title });
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        currentConversation: s.currentConversation?.id === id ? { ...s.currentConversation, title } : s.currentConversation,
      }));
    } catch { /* silent */ }
  },

  /* ── Messages ── */
  addMessage: async (content, role = "user") => {
    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error("Not authenticated");
    let convo = get().currentConversation;
    if (!convo) convo = await get().createConversation();

    const msg = await pb.collection("chat_messages").create({
      conversation: convo.id, user: userId, role, content, metadata: {},
    });
    set((s) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  updateMessageLocal: (id, updates) => {
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)) }));
  },

  updateMessage: async (id, updates) => {
    try { await pb.collection("chat_messages").update(id, updates); } catch { /* silent */ }
    get().updateMessageLocal(id, updates);
  },

  clearMessages: () => set({ messages: [], currentConversation: null }),

  /* ══════════════════════════════════════════════════════════
     SEND — the main AI flow (lean, tool-calling via chatAPI)
     ══════════════════════════════════════════════════════════ */
  sendAIRequest: async (content, assistantMsgId) => {
    const { settings, messages, getActiveApiKey, updateMessageLocal, updateMessage, updateConversationTitle, currentConversation } = get();
    const key = getActiveApiKey();
    if (!key) throw new Error("No active API key — add one in Chat Settings.");

    set({ isStreaming: true });
    try {
      // History = all prior COMPLETED exchanges (exclude: empty placeholder, system msgs,
      // and the current user message which is the last entry — sent separately via sendMessage)
      const history = messages
        .filter((m) => m.role !== "system" && m.id !== assistantMsgId && m.content)
        .slice(0, -1) // ← exclude current user msg (it's passed as 'content', not history)
        .map((m) => ({ role: m.role, content: m.content }));

      // Inject live DB stats from store — AI instantly knows real numbers, no tool call needed
      const { pos, items, suppliers, dos } = usePOStore.getState();
      const activePos = pos.filter((p) => !["paid", "cancelled"].includes(p.status));

      // Overdue POs: same logic as Dashboard — orderDate >7 days old, not paid/cancelled/received
      const currentYear = new Date().getFullYear();
      const overdueByYear = [currentYear, currentYear - 1, currentYear - 2]
        .map((yr) => {
          const yPos = pos.filter((p) => p.orderDate && new Date(p.orderDate).getFullYear() === yr);
          return `${yr}:${yPos.filter((p) => isOverdue(p, items, 7)).length}`;
        })
        .join(", ");

      const byStatus = {};
      pos.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });
      const statusSummary = Object.entries(byStatus).map(([k, v]) => `${k}:${v}`).join(", ");
      const liveCtx = `[LIVE SNAPSHOT — USE THESE NUMBERS, DO NOT CALL TOOLS FOR COUNTS]
Total POs: ${pos.length} | Status breakdown: ${statusSummary}
Active POs (not paid/cancelled): ${activePos.length}
⚠️ Overdue POs by year → ${overdueByYear} ← USE THESE, DO NOT QUERY
Total items: ${items.length}
Active suppliers: ${suppliers.filter((s) => !s.deletedAt).length}
Total DOs: ${dos.length}`;

      const finalText = await sendChatMessage({
        apiKey: key.api_key,
        model: settings.model || "gemini-2.0-flash",
        history,
        content: `${liveCtx}\n\nUser question: ${content}`,
        systemPrompt: settings.system_prompt || undefined,
        onStatus: (status) => updateMessageLocal(assistantMsgId, { content: `*${status}*` }),
      });

      updateMessageLocal(assistantMsgId, { content: finalText });
      await updateMessage(assistantMsgId, { content: finalText });

      // Auto-generate title on first message
      if (messages.length <= 2 && currentConversation) {
        generateTitle(key.api_key, content).then((title) => {
          updateConversationTitle(currentConversation.id, title);
        });
      }
    } catch (err) {
      logger.error("sendAIRequest failed:", err);
      let errorMsg = `Error: ${err.message}`;
      if (err.message?.includes("429") || err.message?.includes("Resource exhausted")) {
        errorMsg = "**Rate limited (429)** — tunggu 1 menit lalu coba lagi, atau ganti model ke gemini-1.5-flash di Settings.";
      }
      updateMessageLocal(assistantMsgId, { content: errorMsg });
      await updateMessage(assistantMsgId, { content: errorMsg });
    } finally {
      set({ isStreaming: false });
    }
  },

  /* ── API Keys CRUD ── */
  addApiKey: async (keyData) => {
    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error("Not authenticated");
    const rec = await pb.collection("chat_api_keys").create({
      name: keyData.name || `${keyData.provider} Key`,
      provider: keyData.provider,
      api_key: keyData.api_key,
      api_base_url: keyData.api_base_url || "",
      user: userId,
      is_active: true,
      metadata: {},
    });
    set((s) => ({ apiKeys: [...s.apiKeys, rec] }));
    if (keyData.provider?.toLowerCase() === "gemini") get().refreshModels();
    return rec;
  },

  updateApiKey: async (id, updates) => {
    const key = await pb.collection("chat_api_keys").update(id, updates);
    set((s) => ({ apiKeys: s.apiKeys.map((k) => (k.id === id ? key : k)) }));
    if (key.provider?.toLowerCase() === "gemini") get().refreshModels();
  },

  deleteApiKey: async (id) => {
    await pb.collection("chat_api_keys").delete(id);
    set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) }));
  },

  /* ── Settings ── */
  updateSettings: async (updates) => {
    const userId = pb.authStore.model?.id;
    if (!userId) throw new Error("Not authenticated");
    const newSettings = { ...get().settings, ...updates };
    try {
      const recs = await pb.collection("chat_settings").getFullList({ filter: `user = "${userId}"` });
      if (recs.length > 0) await pb.collection("chat_settings").update(recs[0].id, newSettings);
      else await pb.collection("chat_settings").create({ user: userId, ...newSettings });
    } catch { /* silent */ }
    set({ settings: newSettings });
  },

  /* ── Models ── */
  refreshModels: async () => {
    const geminiKey = get().apiKeys.find((k) => k.provider?.toLowerCase() === "gemini");
    if (!geminiKey?.api_key) return;
    const models = await fetchAvailableModels(geminiKey.api_key);
    if (models.length > 0) set({ availableModels: models });
  },
}));
