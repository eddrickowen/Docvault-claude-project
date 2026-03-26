import { Ico, IC } from '../ui';

/**
 * Simple Regex-based Markdown Parser for basic formatting
 */
function renderMarkdown(text) {
  if (!text) return "";
  
  // Escape HTML to prevent XSS (since we use dangerouslySetInnerHTML)
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Italic (*text*)
  html = html.replace(/\b\*(.*?)\*\b/g, "<em>$1</em>");
  
  // Inline Code (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 rounded font-mono text-[11px] font-bold">$1</code>');
  
  // Newlines (Preserve list-like behavior)
  html = html.replace(/\n/g, "<br />");

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  
  return (
    <div className={`flex w-full mb-5 ${isUser ? "justify-end" : "justify-start animate-fade-in"}`}>
      <div className={`flex max-w-[88%] items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
          isUser ? "bg-slate-800" : "bg-brand text-white"
        }`}>
          <Ico d={isUser ? IC.user : IC.stars} size={16} color="white" />
        </div>

        {/* Bubble Container */}
        <div className="flex flex-col gap-1 overflow-hidden">
          {/* Bubble */}
          <div className={`relative px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm transition-all border ${
            isUser 
              ? "bg-brand border-brand-mid text-white rounded-br-none" 
              : "bg-white border-border-default text-text-primary rounded-bl-none"
          }`}>
            <div className="font-medium break-words">
              {renderMarkdown(message.content)}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1.5 bg-brand/50 animate-pulse align-middle rounded-full" />
              )}
            </div>
          </div>
          
          {/* Metadata */}
          <div className={`text-[10px] mt-0.5 opacity-50 flex items-center gap-1 font-bold ${isUser ? "justify-end text-text-muted" : "justify-start text-text-muted"}`}>
             {new Date(message.created || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             {isUser && <Ico d={IC.check} size={10} color="var(--color-brand)" />}
          </div>
        </div>
      </div>
    </div>
  );
}
