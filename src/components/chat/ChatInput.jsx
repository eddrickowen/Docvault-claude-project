/**
 * ChatInput - Message input area with send button
 */
import { useState, useRef, useEffect } from 'react';
import { Ico, IC, Btn } from '../ui';

export function ChatInput({ onSend, disabled = false, placeholder = 'Type your message...' }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border-default bg-surface p-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: '120px' }}
        />

        <Btn
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="sm"
          variant="blue"
          className="!px-3 !py-2 h-[38px]"
        >
          <Ico d={IC.send} size={16} />
        </Btn>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <div className="text-xs text-text-muted">
          Press <kbd className="px-1.5 py-0.5 bg-surface-alt border border-border-default rounded text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-surface-alt border border-border-default rounded text-[10px]">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
}
