/**
 * ChatSettingsModal - Configure chat widget settings and API keys
 */
import { useState, useEffect } from 'react';
import { Modal, Btn, Ico, IC, FF, FIn, FSel, NumInput } from '../ui';
import { useChatStore } from '../../store/useChatStore';

const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div className="relative shrink-0">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`block w-8 h-[18px] rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-surface-alt border border-border-strong'
        }`}
      ></div>
      <div
        className={`absolute left-0.5 top-0.5 bg-white w-[14px] h-[14px] rounded-full transition-transform ${
          checked ? 'translate-x-3.5 shadow-sm' : ''
        }`}
      ></div>
    </div>
    <div className="flex flex-col justify-center">
      <span className="text-[13px] font-semibold text-text-primary leading-tight">
        {label}
      </span>
      {hint && <span className="text-[11px] text-text-muted mt-0.5">{hint}</span>}
    </div>
  </label>
);

export function ChatSettingsModal({ open, onClose }) {
  const { settings, apiKeys, availableModels, updateSettings, addApiKey, deleteApiKey, updateApiKey, refreshModels } =
    useChatStore();

  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [newKey, setNewKey] = useState({
    provider: 'openai',
    api_key: '',
    api_base_url: '',
    label: '',
    models: [],
  });
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings(localSettings);
    onClose();
  };

  const handleAddKey = async () => {
    if (!newKey.api_key.trim()) {
      alert('Please enter an API key');
      return;
    }

    try {
      await addApiKey(newKey);
      setNewKey({
        provider: 'openai',
        api_key: '',
        api_base_url: '',
        label: '',
        models: [],
      });
      setShowKeyForm(false);
    } catch (error) {
      alert('Failed to add API key: ' + error.message);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (confirm('Delete this API key?')) {
      await deleteApiKey(keyId);
    }
  };

  const handleToggleKey = async (keyId, isActive) => {
    await updateApiKey(keyId, { is_active: !isActive });
  };

  return (
    <Modal open={true} onClose={onClose} title="Chat Widget Settings" wide>
      <div className="flex gap-4 border-b border-border-default mb-4 pb-0">
        {['general', 'api-keys', 'appearance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand text-brand'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab === 'general' && 'General'}
            {tab === 'api-keys' && 'API Keys'}
            {tab === 'appearance' && 'Appearance'}
          </button>
        ))}
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-4">
            <Toggle
              checked={localSettings.enabled}
              onChange={(v) => setLocalSettings((p) => ({ ...p, enabled: v }))}
              label="Enable Chat Widget"
              hint="Show/hide the chat widget"
            />

            <FF label="System Prompt" hint="Instructions for the AI assistant">
              <textarea
                value={localSettings.system_prompt || ''}
                onChange={(e) =>
                  setLocalSettings((p) => ({ ...p, system_prompt: e.target.value }))
                }
                rows={4}
                className="w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="You are a helpful assistant..."
              />
            </FF>

            <FF label="Model" hint="AI model to use">
              {localSettings.api_provider === 'gemini' ? (
                <div className="flex gap-2">
                  <FSel
                    value={localSettings.model || ''}
                    onChange={(v) => setLocalSettings((p) => ({ ...p, model: v }))}
                    options={availableModels.map(m => ({ v: m.id, l: m.name }))}
                    className="flex-1"
                  />
                  <Btn 
                    size="sm" 
                    variant="ghost" 
                    onClick={refreshModels}
                    title="Refresh Available Models"
                  >
                    <Ico d={IC.refresh} size={14} />
                  </Btn>
                </div>
              ) : (
                <FIn
                  value={localSettings.model || ''}
                  onChange={(v) => setLocalSettings((p) => ({ ...p, model: v }))}
                  placeholder="gpt-4, claude-3-sonnet-20240229, etc."
                />
              )}
            </FF>

            <div className="grid grid-cols-2 gap-4">
              <FF label="API Provider">
                <FSel
                  value={localSettings.api_provider || 'openai'}
                  onChange={(v) => setLocalSettings((p) => ({ ...p, api_provider: v }))}
                  options={[
                    { v: 'gemini', l: 'Gemini (Google)' },
                    { v: 'openai', l: 'OpenAI' },
                    { v: 'anthropic', l: 'Anthropic' },
                    { v: 'groq', l: 'Groq' },
                    { v: 'custom', l: 'Custom' },
                  ]}
                />
              </FF>

              <FF label="Temperature" hint="0.0-2.0, higher = more creative">
                <NumInput
                  value={localSettings.temperature ?? 0.7}
                  onChange={(v) =>
                    setLocalSettings((p) => ({ ...p, temperature: Math.max(0, Math.min(2, v)) }))
                  }
                  min={0}
                  max={2}
                  step={0.1}
                />
              </FF>
            </div>

            <FF label="Max Tokens" hint="Maximum response length">
              <NumInput
                value={localSettings.max_tokens ?? 2000}
                onChange={(v) => setLocalSettings((p) => ({ ...p, max_tokens: Math.max(1, v) }))}
                min={1}
                max={10000}
              />
            </FF>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-text-primary">Configured API Keys</div>
              <Btn
                size="sm"
                variant="blue"
                onClick={() => setShowKeyForm(!showKeyForm)}
              >
                <Ico d={IC.plus} size={12} /> Add Key
              </Btn>
            </div>

            {/* Add Key Form */}
            {showKeyForm && (
              <div className="border border-border-default rounded-lg p-4 bg-surface-alt">
                <div className="flex flex-col gap-3">
                  <FF label="Provider">
                    <FSel
                      value={newKey.provider}
                      onChange={(v) => setNewKey((p) => ({ ...p, provider: v }))}
                      options={[
                        { v: 'gemini', l: 'Gemini (Google)' },
                        { v: 'openai', l: 'OpenAI' },
                        { v: 'anthropic', l: 'Anthropic' },
                        { v: 'groq', l: 'Groq' },
                        { v: 'custom', l: 'Custom' },
                      ]}
                    />
                  </FF>

                  <FF label="API Key" hint="Your API key (will be encrypted)">
                    <input
                      type="password"
                      value={newKey.api_key}
                      onChange={(e) =>
                        setNewKey((p) => ({ ...p, api_key: e.target.value }))
                      }
                      className="w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      placeholder="sk-..."
                    />
                  </FF>

                  <FF label="Label (Optional)" hint="Friendly name for this key">
                    <FIn
                      value={newKey.label}
                      onChange={(v) => setNewKey((p) => ({ ...p, label: v }))}
                      placeholder="My OpenAI Key"
                    />
                  </FF>

                  <FF
                    label="Base URL (Optional)"
                    hint="Custom API endpoint (leave empty for default)"
                  >
                    <FIn
                      value={newKey.api_base_url}
                      onChange={(v) => setNewKey((p) => ({ ...p, api_base_url: v }))}
                      placeholder="https://api.openai.com/v1"
                    />
                  </FF>

                  <div className="flex gap-2 justify-end">
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowKeyForm(false)}
                    >
                      Cancel
                    </Btn>
                    <Btn size="sm" variant="blue" onClick={handleAddKey}>
                      Add Key
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {/* Keys List */}
            <div className="flex flex-col gap-2">
              {apiKeys.length === 0 ? (
                <div className="text-center text-sm text-text-muted py-8">
                  No API keys configured yet
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border border-border-default rounded-lg bg-surface hover:border-brand-mid transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          key.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <div className="text-sm font-semibold text-text-primary">
                          {key.label || `${key.provider} Key`}
                        </div>
                        <div className="text-xs text-text-muted">
                          {key.provider} • {key.api_key.slice(0, 12)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleKey(key.id, key.is_active)}
                        title={key.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Ico
                          d={key.is_active ? IC.check : IC.close}
                          size={14}
                        />
                      </Btn>
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteKey(key.id)}
                        className="hover:text-red"
                      >
                        <Ico d={IC.trash} size={14} />
                      </Btn>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="flex flex-col gap-4">
            <FF label="Widget Position">
              <FSel
                value={localSettings.position || 'bottom-right'}
                onChange={(v) => setLocalSettings((p) => ({ ...p, position: v }))}
                options={[
                  { v: 'bottom-right', l: 'Bottom Right' },
                  { v: 'bottom-left', l: 'Bottom Left' },
                  { v: 'top-right', l: 'Top Right' },
                  { v: 'top-left', l: 'Top Left' },
                ]}
              />
            </FF>

            <FF label="Theme">
              <FSel
                value={localSettings.theme || 'auto'}
                onChange={(v) => setLocalSettings((p) => ({ ...p, theme: v }))}
                options={[
                  { v: 'auto', l: 'Auto (Follow System)' },
                  { v: 'light', l: 'Light' },
                  { v: 'dark', l: 'Dark' },
                ]}
              />
            </FF>

            <FF label="Primary Color" hint="Widget accent color">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={localSettings.primary_color || '#3b82f6'}
                  onChange={(e) =>
                    setLocalSettings((p) => ({ ...p, primary_color: e.target.value }))
                  }
                  className="w-12 h-8 rounded border border-border-default cursor-pointer"
                />
                <FIn
                  value={localSettings.primary_color || '#3b82f6'}
                  onChange={(v) => setLocalSettings((p) => ({ ...p, primary_color: v }))}
                  placeholder="#3b82f6"
                  className="flex-1 font-mono"
                />
              </div>
            </FF>

            <div className="mt-4 p-4 bg-surface-alt border border-border-default rounded-lg">
              <div className="text-xs font-bold text-text-primary mb-2">Preview</div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: localSettings.primary_color }}
                >
                  <Ico d={IC.stars} size={20} color="white" />
                </div>
                <div className="text-sm text-text-muted">Widget button preview</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-default">
        <Btn variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="blue" onClick={handleSave}>
          <Ico d={IC.save} size={12} /> Save Settings
        </Btn>
      </div>
    </Modal>
  );
}
