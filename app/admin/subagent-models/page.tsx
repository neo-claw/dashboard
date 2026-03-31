import SubagentModelsEditor from '@/components/SubagentModelsEditor';

export default function AdminSubagentModelsPage() {
  return (
    <div>
      <SubagentModelsEditor />
      <div className="max-w-4xl mx-auto p-6 pt-0">
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>
              To restrict subagents to only specific models, enable &quot;Restrict subagents to allowed models only&quot; and add the allowed model identifiers.
            </li>
            <li>
              The model identifier format is typically: <code className="bg-blue-100 px-1 rounded">provider/model-path:tag</code> (e.g., <code>openrouter/stepfun/step-3.5-flash:free</code>)
            </li>
            <li>
              Set a default model that will be used when spawning a subagent without explicitly specifying a model.
            </li>
            <li>
              Changes take effect immediately for new subagent spawns. Existing subagents continue with their originally assigned model.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
