/**
 * chatAPI — Lean Gemini-only AI layer with function calling.
 * No streaming (tool-call loops need sendMessage, not sendMessageStream).
 * Token-efficient: minimal system prompt, projected tool responses, pruned history.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pb } from "./pocketbase";

/* ══════════════════════════════════════════════════════════════
   TOOL DEFINITIONS — kept minimal so Gemini's context is small
   ══════════════════════════════════════════════════════════════ */
const TOOL_DECLARATIONS = [
  {
    name: "search",
    description: "Search POs or items by keyword (company, orderNo, itemName). Returns projected rows.",
    parameters: {
      type: "OBJECT",
      properties: {
        collection: { type: "STRING", enum: ["pos", "items", "suppliers"] },
        query: { type: "STRING" },
        limit: { type: "NUMBER" },
      },
      required: ["collection", "query"],
    },
  },
  {
    name: "query",
    description: "Run a PocketBase filter. Use double-quoted strings: status=\"paid\". Operators: =, !=, >, <, ~, &&, ||.",
    parameters: {
      type: "OBJECT",
      properties: {
        collection: { type: "STRING", enum: ["pos", "items", "dos", "suppliers"] },
        filter: { type: "STRING" },
        sort: { type: "STRING" },
        limit: { type: "NUMBER" },
      },
      required: ["collection", "filter"],
    },
  },
  {
    name: "detail",
    description: "Get full PO details including its items. Use after search/query to drill down.",
    parameters: {
      type: "OBJECT",
      properties: {
        po_id: { type: "STRING" },
      },
      required: ["po_id"],
    },
  },
];

/* ══════════════════════════════════════════════════════════════
   TOOL EXECUTION — each returns a tiny JSON object
   ══════════════════════════════════════════════════════════════ */
const ALLOWED = new Set(["pos", "items", "dos", "suppliers"]);

const projectRecord = (collection, r) => {
  if (collection === "pos")
    return { id: r.id, orderNo: r.orderNo, company: r.company, status: r.status, orderDate: r.orderDate, priority: r.priority };
  if (collection === "items")
    return { id: r.id, itemName: r.itemName, qty: r.qty, unit: r.unit, unitPrice: r.unitPrice, status: r.status, poId: r.poId };
  if (collection === "suppliers")
    return { id: r.id, name: r.name, contact: r.contact, phone: r.phone, tags: r.tags };
  if (collection === "dos")
    return { id: r.id, doNo: r.doNo, poId: r.poId, deliveryDate: r.deliveryDate };
  return r;
};

async function executeTool(name, args) {
  try {
    switch (name) {
      case "search": {
        const { collection, query, limit = 5 } = args;
        if (!ALLOWED.has(collection)) return { error: "restricted" };
        const searchField = collection === "pos" ? `company ~ "${query}" || orderNo ~ "${query}"`
          : collection === "items" ? `itemName ~ "${query}"`
          : collection === "suppliers" ? `name ~ "${query}"`
          : `id != ""`;
        const res = await pb.collection(collection).getList(1, Math.min(limit, 10), {
          filter: searchField,
          sort: "-created",
        });
        return { total: res.totalItems, rows: res.items.map((r) => projectRecord(collection, r)) };
      }

      case "query": {
        const { collection, filter, sort = "-created", limit = 10 } = args;
        if (!ALLOWED.has(collection)) return { error: "restricted" };
        const res = await pb.collection(collection).getList(1, Math.min(limit, 20), { filter, sort });
        return { total: res.totalItems, showing: res.items.length, rows: res.items.map((r) => projectRecord(collection, r)) };
      }

      case "detail": {
        const { po_id } = args;
        const po = await pb.collection("pos").getOne(po_id);
        const items = await pb.collection("items").getList(1, 50, {
          filter: `poId = "${po_id}"`,
          sort: "itemName",
        });
        return {
          id: po.id, orderNo: po.orderNo, company: po.company, status: po.status,
          orderDate: po.orderDate, priority: po.priority, notes: po.notes,
          items: items.items.map((i) => ({
            id: i.id, itemName: i.itemName, qty: i.qty, unit: i.unit,
            unitPrice: i.unitPrice, status: i.status, deliveryDate: i.deliveryDate,
          })),
        };
      }

      default:
        return { error: `unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err.message, filter: args.filter };
  }
}

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPT — kept under 250 tokens
   ══════════════════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `You are DocVault AI — assistant for a Purchase Order (PO) management system.
Today: ${new Date().toISOString().slice(0, 10)}.

COLLECTIONS & FIELDS:
- pos: orderNo, company, orderDate, status (draft/pending/confirmed/partial_del/delivered/invoiced/partial_pay/paid/cancelled/on_hold/revision), priority (normal/urgent/low), notes
- items: itemName, qty, unit, unitPrice, discount, status (pending/ordered/partial/delivered/invoiced/paid/returned/cancelled), deliveryDate, poId
- suppliers: name, contact, phone, email, tags
- dos: doNo, poId, deliveryDate

BUSINESS RULES:
- Item net = unitPrice × qty − discount
- PO total = sum(item nets) × 1.11
- OVERDUE PO = orderDate >7 days old AND status NOT IN (received, paid, cancelled). Age-based, NOT delivery-date.
- Active POs: status NOT IN (paid, cancelled)

FILTER SYNTAX: status="paid" | company~"keyword" | orderDate>"2024-01-01" | && ||

⚠️ CRITICAL — SNAPSHOT RULES:
Each message contains [LIVE SNAPSHOT] with PRE-COMPUTED numbers from the same data as the dashboard.
- "Overdue POs by year" in the snapshot = THE AUTHORITATIVE OVERDUE COUNT. NEVER call count/query to re-compute overdue — the snapshot number IS the answer.
- "Total POs", "Active POs", "Total items" etc. = use snapshot directly, no tool call needed.
- Only call tools to LIST specific records, SEARCH by keyword, or GET details of a specific PO.

TOOLS: search (by keyword) | query (filter records, returns totalItems) | detail (full PO+items)
STRATEGY:
1. Counts/totals/overdue → READ from snapshot ONLY. No tools.
2. List records by filter → 'query' (returns total + rows).
3. Full PO breakdown → 'detail'.
4. Find by name/number → 'search'.
5. Max 2 tool calls per response.

Answer in Indonesian or English (match user). Be concise.`;

/* ══════════════════════════════════════════════════════════════
   MAIN ENTRY — sendMessage with tool-call loop
   ══════════════════════════════════════════════════════════════ */
/**
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {Array}  opts.history  — prior messages [{role,content}]
 * @param {string} opts.content  — the new user message
 * @param {string} opts.systemPrompt — optional override
 * @param {Function} opts.onStatus — (text) callback for status updates
 * @returns {Promise<string>} final AI response text
 */
export async function sendChatMessage({ apiKey, model = "gemini-2.0-flash", history = [], content, systemPrompt, onStatus }) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt || SYSTEM_PROMPT,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });

  // Build Gemini history — must start with 'user', alternate user/model, end with 'model'
  const rawHistory = history
    .filter((m) => m.content && m.content.trim())
    .slice(-8) // keep last 4 exchanges (8 messages)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Drop leading 'model' turns (Gemini requires first turn to be 'user')
  while (rawHistory.length > 0 && rawHistory[0].role === "model") rawHistory.shift();

  // Ensure alternating roles — skip consecutive duplicates
  const chatHistory = [];
  let lastRole = null;
  for (const msg of rawHistory) {
    if (msg.role !== lastRole) { chatHistory.push(msg); lastRole = msg.role; }
  }

  // History must end with 'model' (complete turns only); drop trailing 'user' if present
  while (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "user") {
    chatHistory.pop();
  }

  const chat = geminiModel.startChat({ history: chatHistory });

  // Retry helper for 429
  const send = async (msg, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await chat.sendMessage(msg);
      } catch (err) {
        if ((err.message?.includes("429") || err.message?.includes("Resource exhausted")) && i < retries) {
          await new Promise((r) => setTimeout(r, (i + 1) * 2000));
          continue;
        }
        throw err;
      }
    }
  };

  let result = await send(content);
  let response = result.response;

  // Tool-call loop (max 4 iterations)
  let iter = 0;
  while (response.functionCalls()?.length > 0 && iter < 4) {
    iter++;
    const calls = response.functionCalls();
    if (onStatus) onStatus(`Querying database (${calls.map((c) => c.name).join(", ")})...`);

    const toolResults = [];
    for (const call of calls) {
      const data = await executeTool(call.name, call.args);
      toolResults.push({
        functionResponse: { name: call.name, response: { content: data } },
      });
    }

    result = await send(toolResults);
    response = result.response;
  }

  return response.text();
}

/* ══════════════════════════════════════════════════════════════
   TITLE GENERATION — uses same Gemini key, 1 cheap call
   ══════════════════════════════════════════════════════════════ */
export async function generateTitle(apiKey, userMessage) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(
      `Generate a 3-5 word title for this conversation. Reply with ONLY the title, no quotes:\n\nUser: ${userMessage.slice(0, 200)}`
    );
    return result.response.text().trim().slice(0, 60) || "New Conversation";
  } catch {
    return "New Conversation";
  }
}

/* ══════════════════════════════════════════════════════════════
   MODEL LIST — for settings dropdown
   ══════════════════════════════════════════════════════════════ */
export async function fetchAvailableModels(apiKey) {
  if (!apiKey) return [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({ id: m.name.replace("models/", ""), name: m.displayName }))
      .sort((a, b) => b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}
