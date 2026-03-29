# Frontend Improvement Plan (20min sprint)

## Evaluator Observations

- Dashboard styling fixed (Tailwind v3) but still feels a bit "default"
- Control Center basic scaffold — needs Vercel-level polish
- Mobile experience could be smoother
- Some bloat: unused imports, repetitive class names, no design token system

## Goals

1. **Vercel-level polish:** Clean, minimal, fast, beautiful typography
2. **Remove bloat:** Audit dependencies, simplify components, tree-shake
3. **Mobile-first:** Ensure Control Center is excellent on phone
4. **Consistent tokens:** Create design tokens for spacing, colors, radius
5. **Performance:** Reduce CSS/JS size, lazy load if needed

## Tasks (to execute)

### D1. Audit & Simplify Dependencies
- [ ] Remove unused icon imports
- [ ] Check bundle size with `npm run build --profile`
- [ ] Consider removing `lucide-react` heavy usage or use tree-shaking

### D2. Create Design Token System
- [ ] Add `styles/design-tokens.ts` with spacing scale (4, 8, 12, 16, 24, 32, 48, 64)
- [ ] Font size scale: text-sm, base, lg, xl, 2xl, 3xl, 4xl
- [ ] Radius tokens: sm, md, lg, xl, 2xl
- [ ] Color palette as CSS variables in globals.css

### D3. Refactor Existing Components to Use Tokens
- [ ] Update Overview, Kanban, Learnings, Trinity, Calendar to use token classes
- [ ] Replace arbitrary `p-4`, `p-6` with `p-md`, `p-lg` from tokens
- [ ] Ensure consistent spacing rhythm (8px grid)

### D4. Polish Control Center UI
- [ ] Style chat bubbles with Vercel aesthetic (subtle borders, accent on user)
- [ ] Add timestamps with nice formatting (e.g., "14:32")
- [ ] Improve trace panel: collapsible sections, syntax highlighting, copy button
- [ ] Add "New message" badge on mobile when chat hidden
- [ ] Sticky input with send button always visible

### D5. Mobile UX Improvements
- [ ] Add swipe gesture to toggle trace drawer (mobile)
- [ ] Full-screen chat mode toggle (hide trace)
- [ ] Optimize touch targets (min 44x44px)
- [ ] Prevent zoom on input focus (viewport meta)

### D6. Accessibility & Performance
- [ ] Add ARIA labels
- [ ] Ensure color contrast AA compliance
- [ ] Lazy load heavy components (if any)
- [ ] Add `loading="lazy"` to off-screen images (if any)

### D7. Testing & Verification
- [ ] Run Playwright verify after changes
- [ ] Check Lighthouse scores (aim >90)
- [ ] Manually test on mobile viewport (375px)

## Execution Order

1. D2 (tokens) → D3 (apply tokens)
2. D4 (Control Center polish)
3. D1 (dependency cleanup)
4. D5 (mobile)
5. D6 (a11y, perf)
6. D7 (verify)

Will commit each step separately with conventional commit messages.
