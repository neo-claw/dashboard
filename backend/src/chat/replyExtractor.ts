import { flattenContent } from '../utils';

export function extractReply(stdout: string): string {
  try {
    const parsed = JSON.parse(stdout);
    // Schema variant 1: { messages: [{ role: 'assistant', content: string|array }] }
    if (parsed.messages && Array.isArray(parsed.messages)) {
      const assistantMsg = parsed.messages.find((m: any) => m.role === 'assistant');
      if (assistantMsg?.content) {
        return flattenContent(assistantMsg.content);
      }
    }
    // Variant 2: { response: { content: string } }
    if (parsed.response?.content) {
      return flattenContent(parsed.response.content);
    }
    // Variant 3: { content: string } directly
    if (parsed.content) {
      return flattenContent(parsed.content);
    }
    // Variant 4: { text: string }
    if (parsed.text) {
      return flattenContent(parsed.text);
    }
  } catch (e) {
    // Not JSON; fall through
  }
  // Fallback: first non-empty line
  const lines = stdout.trim().split('\n').filter(l => l.trim().length > 0);
  return lines[0] ?? '';
}
