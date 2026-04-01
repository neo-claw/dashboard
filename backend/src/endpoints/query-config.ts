import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';

export function registerQueryConfigEndpoint(app: any, workspaceRoot: string) {
  const configDir = join(workspaceRoot, 'config');
  const configPath = join(configDir, 'query.json');

  app.get('/api/v1/query/config', async (req: Request, res: Response) => {
    try {
      const data = await readFile(configPath, 'utf-8');
      const config = JSON.parse(data);
      res.json(config);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Return default config
        res.json({
          enabled: true,
          sources: ['files', 'memory', 'git'],
          limit: 10,
          maxTokens: 2000,
          injectAsSystem: false,
        });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post('/api/v1/query/config', async (req: Request, res: Response) => {
    try {
      await mkdir(configDir, { recursive: true });
      await writeFile(configPath, JSON.stringify(req.body, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
