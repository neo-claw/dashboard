#!/usr/bin/env node
/**
 * Research Picks Generator
 * Fetches and filters recent AI/CS papers for morning digest.
 */

import axios from 'axios';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE = process.env.WORKSPACE || '/home/ubuntu/.openclaw/workspace';

// Config
const ARXIV_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.MA', 'cs.SY', 'eess.SP', 'stat.ML'];
const MAX_PAPERS = 200;
const RECENCY_DAYS = 180; // up to 6 months
const TOP_N = 5;
const NEW_TOPIC_PICK = 1;

// Load dynamic keywords from recent notes (Drive sync or memory)
function extractKeywords() {
  const keywords = new Set([
    'multi-agent', 'agent', 'orchestration', 'swarm', 'stigmergy',
    'event-driven', 'streaming', 'real-time', 'pipeline',
    'distributed', 'consensus', 'coordination', 'context',
    'memory', 'knowledge graph', 'retrieval', 'episodic',
    'ant colony', 'biological', 'communication', 'pheromone',
    'frontend', 'evaluation', 'visual', 'diff', 'testing',
    'analytics', 'greenhouse', 'netic', 'crm', 'dashboard',
    'reinforcement', 'learning', 'attention', 'transformer', 'residual'
  ]);
  // TODO: later, scan memory/*.md and drive_sync/ to add more
  return Array.from(keywords);
}

// Query arXiv API for recent submissions
async function fetchArxiv() {
  const now = new Date();
  const recencyMs = 180 * 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - recency_ms);
  const startStr = start.toISOString().slice(0, 10);

  const query = ARXIV_CATEGORIES.map(cat => `cat:${cat}`).join(' OR ');
  const url = `http://export.arxiv.org/api/query?search_query=(${query})+AND+submittedDate:[${startStr}T00:00:00Z+TO+${now.toISOString().slice(0, 10)}T23:59:59Z]&start=0&max_results=${MAX_PAPERS}&sortBy=submittedDate&sortOrder=descending`;

  const res = await axios.get(url, { timeout: 15000 });
  const xml = res.data;
  // Parse atom entries
  const entries = [];
  const idMatch = xml.match(/<entry>[\s\S]*?<\/entry>/g);
  if (idMatch) {
    for (const entryXml of idMatch) {
      const id = entryXml.match(/<id>([^<]+)<\/id>/)?.[1] || '';
      const title = entryXml.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || '';
      const summary = entryXml.match(/<summary>([^<]+)<\/summary>/)?.[1]?.trim() || '';
      const published = entryXml.match(/<published>([^<]+)<\/published>/)?.[1] || '';
      const authors = [...entryXml.matchAll(/<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g)].map(m => m[1]);
      const cats = [...entryXml.matchAll(/<category[^>]*term="([^"]+)"[^>]*>/g)].map(m => m[1]);
      entries.push({ id, title, summary, published, authors, categories: cats, source: 'arxiv' });
    }
  }
  return entries;
}

// Fetch from Semantic Scholar (papers with high citation velocity)
async function fetchSemanticScholar() {
  const query = 'artificial intelligence OR multi-agent systems OR distributed systems OR event sourcing';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,abstract,year,citationCount,venues,authors,url&limit=100&publicationDateOrYear:range=[${new Date(Date.now() - 180*24*60*60*1000).toISOString().slice(0,10)},]`;
  try {
    const res = await axios.get(url, { timeout: 15000 });
    return res.data.data.filter(p => !p.title.toLowerCase().includes('survey') && !p.title.toLowerCase().includes('review'));
  } catch (e) {
    console.error('SS error:', e.message);
    return [];
  }
}

// Score paper against keywords
function scorePaper(paper, keywords) {
  const text = (paper.title + ' ' + (paper.summary || paper.abstract || '')).toLowerCase();
  let kwScore = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) kwScore += 1;
  }
  // Penalize pure theory signals
  const theoryWords = ['proof', 'theorem', 'lower bound', 'upper bound', 'complexity class', 'hardness'];
  let theoryPenalty = theoryWords.filter(w => text.includes(w)).length * 0.5;
  // Simple recency: younger = higher
  const pubDate = paper.published ? new Date(paper.published) : new Date();
  const ageDays = Math.max(0, (Date.now() - pubDate.getTime()) / (1000*60*60*24));
  const recencyScore = Math.max(0, (180 - ageDays) / 180); // 0-1
  // Citations (normalize)
  const cites = paper.citationCount || 0;
  const velocityScore = Math.min(1, cites / 100); // crude; could compute per month
  // Composite
  const weighted = 0.4*recencyScore + 0.3*Math.min(1, kwScore/3) + 0.3*velocityScore - theoryPenalty;
  return { kwScore, ageDays: Math.round(ageDays), cites, composite: weighted };
}

// Deduplicate by title similarity (approximate)
function dedupe(papers) {
  const seen = new Set();
  const uniq = [];
  for (const p of papers.sort((a,b) => (b.citationCount||0) - (a.citationCount||0))) {
    const norm = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
    if (!seen.has(norm)) {
      seen.add(norm);
      uniq.push(p);
    }
  }
  return uniq;
}

async function main() {
  console.log('🔄 Generating research picks...');
  const keywords = extractKeywords();
  console.log(`📝 Using ${keywords.length} keywords`);

  const [arxivPapers, ssPapers] = await Promise.all([fetchArxiv(), fetchSemanticScholar()]);
  const all = [...arxivPapers, ...ssPapers].map(p => ({ ...p, _src: p.source || 'ss' }));
  console.log(`📦 Fetched ${all.length} candidates`);

  // Score each
  const scored = all.map(p => {
    const s = scorePaper(p, keywords);
    return { ...p, score: s };
  }).filter(p => p.score.composite > 0.2 && p.score.kwScore >= 1).filter(p => {
    // Exclude obvious theory papers
    const theory = ['proof', 'theorem', 'lower bound', 'upper bound', 'complexity class'];
    const text = (p.title + ' ' + (p.summary||p.abstract||'')).toLowerCase();
    return !theory.some(w => text.includes(w));
  });

  console.log(`✅ After filtering: ${scored.length}`);

  // Sort
  const ranked = scored.sort((a,b) => b.score.composite - a.score.composite);
  const header = ranked.slice(0, TOP_N);
  const tail = ranked.slice(TOP_N);

  // New topic: pick from tail with max distance to keyword set
  let newPick = null;
  if (tail.length > 0) {
    // Simple: pick highest composite among tail that has lowest kwScore
    const candidates = tail.filter(p => p.score.kwScore === 0 || p.score.kwScore === 1).sort((a,b) => b.score.composite - a.score.composite);
    newPick = candidates[0] || tail[tail.length-1];
  }

  // Format output for digest
  const fmt = (p) => `• ${p.title} (${p._src === 'arxiv' ? 'arXiv' : (p.venues?.[0]?.name || 'Unknown')}, ${p.published?.slice(0,10)}) — ${p.summary?.slice(0,120).replace(/\s+/g,' ')}... [Link](${p.id.startsWith('http') ? p.id : `https://arxiv.org/abs/${p.id}`})`;

  const digestText = [
    '**[Research Picks]**',
    ...header.map(fmt),
    newPick ? `\n**Horizon Expander:** ${newPick.title} — unexpected angle from ${newPick._src}.` : ''
  ].join('\n');

  // Save for reference
  await mkdir(join(WORKSPACE, 'research'), { recursive: true });
  await writeFile(join(WORKSPACE, 'research', `picks-${new Date().toISOString().slice(0,10)}.md`), digestText);
  console.log('✅ Research picks generated.');
  console.log(digestText);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
