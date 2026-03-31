'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';

interface Config {
  allowed_models: string[];
  default_model: string;
  restricted: boolean;
}

export default function SubagentModelsEditor() {
  const [config, setConfig] = useState<Config>({
    allowed_models: [],
    default_model: '',
    restricted: true,
  });
  const [newModel, setNewModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/subagent-models');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/subagent-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save config');
      }
      setSuccess('Configuration saved successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addModel = () => {
    if (!newModel.trim()) return;
    if (config.allowed_models.includes(newModel.trim())) {
      setError('Model already in list');
      return;
    }
    setConfig({
      ...config,
      allowed_models: [...config.allowed_models, newModel.trim()],
    });
    setNewModel('');
    setError(null);
  };

  const removeModel = (model: string) => {
    setConfig({
      ...config,
      allowed_models: config.allowed_models.filter(m => m !== model),
    });
    // If removing default, clear it or set to first available
    if (config.default_model === model) {
      const remaining = config.allowed_models.filter(m => m !== model);
      if (remaining.length > 0) {
        setConfig(prev => ({ ...prev, default_model: remaining[0] }));
      } else {
        setConfig(prev => ({ ...prev, default_model: '' }));
      }
    }
  };

  const setDefault = (model: string) => {
    setConfig(prev => ({ ...prev, default_model: model }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Allowed Subagent Models</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Configuration</h2>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="restricted"
              checked={config.restricted}
              onChange={e => setConfig({ ...config, restricted: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="restricted" className="ml-2 block text-sm text-gray-900">
              Restrict subagents to allowed models only
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Default Model</label>
            <select
              value={config.default_model}
              onChange={e => setDefault(e.target.value)}
              disabled={!config.restricted || config.allowed_models.length === 0}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">-- Select default model --</option>
              {config.allowed_models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Allowed Models</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addModel()}
            placeholder="Enter model identifier (e.g., openrouter/anthropic/claude-3.5-sonnet:free)"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            onClick={addModel}
            className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {config.allowed_models.length === 0 ? (
          <p className="text-gray-500 italic">No models added. Add at least one model if restriction is enabled.</p>
        ) : (
          <ul className="space-y-2">
            {config.allowed_models.map(model => (
              <li key={model} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{model}</span>
                  {model === config.default_model && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Default</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {model !== config.default_model && (
                    <button
                      onClick={() => setDefault(model)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      title="Set as default"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => removeModel(model)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
