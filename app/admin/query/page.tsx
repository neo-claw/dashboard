'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QueryConfig {
  enabled: boolean;
  sources: string[];
  limit: number;
  maxTokens: number;
  injectAsSystem: boolean;
}

export default function QueryEngineSettingsPage() {
  const [config, setConfig] = useState<QueryConfig>({
    enabled: true,
    sources: ['files', 'memory', 'git'],
    limit: 10,
    maxTokens: 2000,
    injectAsSystem: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
      const res = await fetch(`${baseUrl}/api/v1/query/config`, {
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else if (res.status === 404) {
        // use defaults
      } else {
        console.error('Failed to fetch config');
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
      const res = await fetch(`${baseUrl}/api/v1/query/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage('Configuration saved successfully.');
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error || 'unknown'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleSource = (source: string) => {
    setConfig((prev) => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter((s) => s !== source)
        : [...prev.sources, source],
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Query Engine</h1>
        <p className="text-muted">Configure automatic context assembly for agent turns.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Enable or disable the query engine.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
              className="h-4 w-4"
            />
            <span>Enable Query Engine</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
          <CardDescription>Select which sources to include in context assembly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {['files', 'memory', 'git'].map((source) => (
            <label key={source} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.sources.includes(source)}
                onChange={() => toggleSource(source)}
                className="h-4 w-4"
              />
              <span className="capitalize">{source}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
          <CardDescription>Set result limits and token budget.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Results</label>
            <input
              type="number"
              min={1}
              max={100}
              value={config.limit}
              onChange={(e) => setConfig((c) => ({ ...c, limit: Number(e.target.value) }))}
              className="w-full border border-border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Tokens (approx)</label>
            <input
              type="number"
              min={100}
              max={10000}
              step={100}
              value={config.maxTokens}
              onChange={(e) => setConfig((c) => ({ ...c, maxTokens: Number(e.target.value) }))}
              className="w-full border border-border rounded px-3 py-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Injection</CardTitle>
          <CardDescription>How to inject the context into the prompt.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.injectAsSystem}
              onChange={(e) => setConfig((c) => ({ ...c, injectAsSystem: e.target.checked }))}
              className="h-4 w-4"
            />
            <span>Inject as System Prompt (otherwise prepend to user message)</span>
          </label>
        </CardContent>
      </Card>

      <CardFooter className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardFooter>

      {message && (
        <div className={`p-3 rounded text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
