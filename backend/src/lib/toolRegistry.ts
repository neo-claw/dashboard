import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

interface ToolDefinition {
  name: string;
  description: string;
  skill: string;
  permissions?: string[];
  inputSchema: any;
  outputSchema?: any;
}

class ToolRegistry {
  private tools: ToolDefinition[] = [];
  private lastScan = 0;
  private readonly TTL_MS = 10000; // 10 seconds cache

  async scanSkills() {
    const now = Date.now();
    if (this.tools.length > 0 && now - this.lastScan < this.TTL_MS) {
      return this.tools;
    }

    const skillRoots = [
      join(WORKSPACE_ROOT, 'skills'),
      join(WORKSPACE_ROOT, '.openclaw', 'extensions', 'compound-engineering', 'skills')
    ];

    const collected: ToolDefinition[] = [];

    for (const root of skillRoots) {
      try {
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillDir = join(root, entry.name);
            const toolsJsonPath = join(skillDir, 'tools.json');
            try {
              const content = await readFile(toolsJsonPath, 'utf-8');
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed.tools)) {
                for (const tool of parsed.tools) {
                  // Ensure required fields
                  if (tool.name && tool.description && tool.skill) {
                    collected.push({
                      name: tool.name,
                      description: tool.description,
                      skill: tool.skill,
                      permissions: tool.permissions || [],
                      inputSchema: tool.inputSchema || {},
                      outputSchema: tool.outputSchema
                    });
                  }
                }
              }
            } catch (err) {
              // No tools.json or invalid, skip
              continue;
            }
          }
        }
      } catch (err) {
        // Directory doesn't exist, skip
        continue;
      }
    }

    this.tools = collected;
    this.lastScan = now;
    return this.tools;
  }

  getAllTools(): ToolDefinition[] {
    return this.tools;
  }

  getToolsBySkill(skillId: string): ToolDefinition[] {
    return this.tools.filter(t => t.skill === skillId);
  }
}

// Singleton
export const toolRegistry = new ToolRegistry();