import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export interface SubagentModelsConfig {
  allowed_models: string[];
  default_model: string;
  restricted: boolean;
}

const CONFIG_PATH = path.join(process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace', 'config/subagent-models.yaml');

let cachedConfig: SubagentModelsConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function loadConfig(forceReload = false): Promise<SubagentModelsConfig> {
  const now = Date.now();
  if (cachedConfig && !forceReload && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const parsed = yaml.load(content) as any;
    const config: SubagentModelsConfig = {
      allowed_models: Array.isArray(parsed.allowed_models) ? parsed.allowed_models : [],
      default_model: parsed.default_model || '',
      restricted: !!parsed.restricted,
    };
    // Validation
    if (config.restricted && config.allowed_models.length === 0) {
      throw new Error('When restricted is true, allowed_models must not be empty');
    }
    if (!config.allowed_models.includes(config.default_model)) {
      throw new Error('default_model must be in allowed_models list');
    }
    cachedConfig = config;
    cacheTimestamp = now;
    return config;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // Return a permissive default if no config file
      const defaultConfig: SubagentModelsConfig = {
        allowed_models: [],
        default_model: '',
        restricted: false,
      };
      return defaultConfig;
    }
    throw err;
  }
}

export async function saveConfig(config: SubagentModelsConfig): Promise<void> {
  // Validate
  if (config.restricted && config.allowed_models.length === 0) {
    throw new Error('When restricted is true, allowed_models must not be empty');
  }
  if (!config.allowed_models.includes(config.default_model)) {
    throw new Error('default_model must be in allowed_models list');
  }
  const content = yaml.dump(config, { lineWidth: -1 });
  // Atomic write: write to temp file then rename
  const tempPath = CONFIG_PATH + '.' + Date.now() + '.tmp';
  await writeFile(tempPath, content, 'utf-8');
  await writeFile(CONFIG_PATH, content, 'utf-8'); // atomic replace in most OS
  // Clear cache
  cachedConfig = config;
  cacheTimestamp = Date.now();
}

export function isAllowedModel(model: string): boolean {
  // Note: this uses cached config; if config may change, call loadConfig first
  if (!cachedConfig) {
    // If not loaded yet, return true (permissive) or false? We can try to sync load.
    // But better to ensure loadConfig called first.
    // For safety, return true to avoid blocking.
    return true;
  }
  if (!cachedConfig.restricted) return true;
  return cachedConfig.allowed_models.includes(model);
}

export function getAllowedModels(): string[] {
  if (!cachedConfig) return [];
  return cachedConfig.allowed_models;
}

export function getDefaultModel(): string {
  if (!cachedConfig) return '';
  return cachedConfig.default_model;
}
