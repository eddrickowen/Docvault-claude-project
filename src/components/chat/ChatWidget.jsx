/**
 * ChatWidget — Floating chat window with conversation history
 */
import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../../store/useChatStore";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Ico, IC, Btn } from "../ui";

export function ChatWidget({ onOpenSettings }) {
  const {
    isOpen, messages, currentConversation, conversations, settings, isStreaming,
    toggleWidget, setOpen, addMessage, loadConversation, createConversation,
    deleteConversation, getActiveApiKey, sendAIRequest,
  } = useChatStore();

  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content) => {
    if (!content.trim() || isStreaming) return;
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      alert("Please configure a Gemini API key in Settings first.");
      return;
    }
    try {
      await addMessage(content, "user");
      const assistantMsg = await addMessage("", "assistant");
      setStreamingMessageId(assistantMsg.id);
      await sendAIRequest(content, assistantMsg.id);
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setStreamingMessageId(null);
    }
  };

  if (!settings.enabled) return null;

  // Floating button (closed state)
  if (!isOpen) {
    return (
      <button
        onClick={toggleWidget}
        className={`fixed ${getPositionClass(settings.position)} z-[3000] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95`}
        style={{ backgroundColor: settings.primary_color, boxShadow: `0 0 20px ${settings.primary_color}44` }}
        title="Open AI Chat"
      >
        <Ico d={IC.stars} size={26} color="white" />
      </button>
    );
  }

  // Chat window (open state)
  return (
    <div className={`fixed ${getPositionClass(settings.position)} z-[3000] w-[420px] h-[600px] bg-surface border border-border-default rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default text-white" style={{ backgroundColor: settings.primary_color }}>
        <div className="flex items-center gap-2">
          <Ico d={IC.stars} size={20} color="white" />
          <div>
            <div className="font-bold text-sm">AI Assistant</div>
            {currentConversation && <div className="text-xs opacity-90">{currentConversation.title}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowConversations(!showConversations)} className="p-1.5 hover:bg-white/20 rounded transition-colors" title="Conversations">
            <Ico d={IC.list} size={16} color="white" />
          </button>
          <button onClick={() => createConversation().then(() => setShowConversations(false))} className="p-1.5 hover:bg-white/20 rounded transition-colors" title="New Conversation">
            <Ico d={IC.plus} size={16} color="white" />
          </button>
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="p-1.5 hover:bg-white/20 rounded transition-colors" title="Settings">
              <Ico d={IC.cog} size={16} color="white" />
            </button>
          )}
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded transition-colors" title="Close">
            <Ico d={IC.close} size={16} color="white" />
          </button>
        </div>
      </div>

      {/* Conversations Sidebar */}
      {showConversations && (
        <div className="absolute top-[52px] left-0 w-full h-[calc(100%-52px)] bg-surface z-10 flex flex-col">
          <div className="px-4 py-3 border-b border-border-default">
            <div className="text-sm font-bold text-text-primary">Conversations</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-muted">No conversations yet</div>
            ) : (
              conversations.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => { loadConversation(convo.id); setShowConversations(false); }}
                  className={`px-4 py-3 border-b border-border-default cursor-pointer hover:bg-surface-alt transition-colors group ${currentConversation?.id === convo.id ? "bg-brand-soft" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary truncate">{convo.title}</div>
                      <div className="text-xs text-text-muted mt-0.5">{new Date(convo.updated).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm("Delete this conversation?")) deleteConversation(convo.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                    >
                      <Ico d={IC.trash} size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-bg-app">
        {messages.length === 0 && !streamingMessageId && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center mb-4">
              <Ico d={IC.stars} size={32} color={settings.primary_color} />
            </div>
            <div className="text-lg font-bold text-text-primary mb-2">How can I help you?</div>
            <div className="text-sm text-text-muted max-w-xs">Ask about your POs, items, suppliers, or anything in the database.</div>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                { l: "Ringkasan PO", q: "Berikan ringkasan total PO saya" },
                { l: "Cek Overdue", q: "Ada PO yang overdue?" },
                { l: "Status Item", q: "Item apa saja yang belum delivered?" },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(btn.q)}
                  className="px-3 py-1.5 bg-white border border-border-default rounded-full text-[11px] font-bold text-text-secondary hover:border-brand hover:text-brand transition-all shadow-sm"
                >
                  {btn.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} isStreaming={msg.id === streamingMessageId} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Stop button */}
      {isStreaming && (
        <div className="px-4 py-2 bg-surface-alt border-t border-border-default">
          <Btn onClick={() => { setStreamingMessageId(null); }} variant="secondary" size="sm" className="w-full">
            <Ico d={IC.close} size={14} /> Stop
          </Btn>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isStreaming} placeholder="Tanya tentang PO, item, supplier..." />
    </div>
  );
}

function getPositionClass(position) {
  const map = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };
  return map[position] || map["bottom-right"];
}
