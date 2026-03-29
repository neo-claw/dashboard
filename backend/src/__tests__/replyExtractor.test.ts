import { extractReply } from '../chat/replyExtractor';

describe('extractReply', () => {
  it('extracts from messages array with string content', () => {
    const stdout = JSON.stringify({
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' }
      ]
    });
    expect(extractReply(stdout)).toBe('hi there');
  });

  it('extracts from messages array with array content (text parts)', () => {
    const stdout = JSON.stringify({
      messages: [
        { role: 'assistant', content: [{ type: 'text', text: 'answer' }] }
      ]
    });
    expect(extractReply(stdout)).toBe('answer');
  });

  it('extracts from response.content', () => {
    const stdout = JSON.stringify({ response: { content: 'response text' } });
    expect(extractReply(stdout)).toBe('response text');
  });

  it('extracts from top-level content', () => {
    const stdout = JSON.stringify({ content: 'top level content' });
    expect(extractReply(stdout)).toBe('top level content');
  });

  it('extracts from top-level text', () => {
    const stdout = JSON.stringify({ text: 'just text' });
    expect(extractReply(stdout)).toBe('just text');
  });

  it('falls back to first line for non-JSON', () => {
    const stdout = 'line1\nline2';
    expect(extractReply(stdout)).toBe('line1');
  });

  it('falls back to empty string for empty output', () => {
    expect(extractReply('')).toBe('');
  });

  it('handles mixed content array with non-text parts', () => {
    const stdout = JSON.stringify({
      messages: [
        { role: 'assistant', content: [{ type: 'text', text: 'part1' }, { type: 'image' }, { type: 'text', text: 'part2' }] }
      ]
    });
    expect(extractReply(stdout)).toBe('part1\npart2');
  });
});
