# Design Tokens

This document outlines the design tokens used throughout the dashboard application. Tokens are defined as CSS variables in `app/globals.css` and can be used directly in your styles or via Tailwind utilities.

## Table of Contents

- [Colors](#colors)
- [Spacing](#spacing)
- [Typography](#typography)
- [Border Radius](#border-radius)
- [Glassmorphism](#glassmorphism)
- [Shadows](#shadows)
- [Animations](#animations)

## Colors

### Base Colors

| Token | Dark Theme | Light Theme | Usage |
|-------|------------|-------------|-------|
| `--color-bg` | `#0a0a0a` | `#ffffff` | Page background |
| `--color-fg` | `#f5f5f5` | `#0a0a0a` | Primary text |
| `--color-muted` | `#6b7280` | `#6b7280` | Secondary text, disabled text |
| `--color-accent` | `#00ff9d` | `#00ff9d` | Accent highlights, glows |

### Surface Colors

| Token | Dark Theme | Light Theme | Usage |
|-------|------------|-------------|-------|
| `--color-surface` | `#0f0f0f` | `#f5f5f5` | General surface |
| `--color-surface-card` | `#111111` | `#ffffff` | Card backgrounds |
| `--color-surface-hover` | `#1a1a1a` | `#f0f0f0` | Hover states |
| `--color-border` | `#262626` | `#e5e5e5` | Borders |
| `--color-border-light` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Subtle borders |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#3b82f6` | Primary actions, links, focus states |
| `--color-primary-foreground` | `#ffffff` | Text on primary backgrounds |
| `--color-secondary` | `#6b7280` | Secondary elements, muted backgrounds |
| `--color-secondary-foreground` | `#f5f5f5` | Text on secondary backgrounds |
| `--color-success` | `#10b981` | Success messages, positive states |
| `--color-success-foreground` | `#ffffff` | Text on success backgrounds |
| `--color-warning` | `#f59e0b` | Warnings, caution states |
| `--color-warning-foreground` | `#ffffff` | Text on warning backgrounds |
| `--color-error` | `#ef4444` | Errors, destructive actions |
| `--color-error-foreground` | `#ffffff` | Text on error backgrounds |

## Spacing

Based on a 4px grid system. All spacing values are CSS custom properties prefixed with `--space-`.

| Token | Value | Equivalent |
|-------|-------|------------|
| `--space-1` | `0.25rem` | 4px |
| `--space-2` | `0.5rem` | 8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem` | 16px |
| `--space-5` | `1.25rem` | 20px |
| `--space-6` | `1.5rem` | 24px |
| `--space-8` | `2rem` | 32px |
| `--space-10` | `2.5rem` | 40px |
| `--space-12` | `3rem` | 48px |
| `--space-16` | `4rem` | 64px |
| `--space-20` | `5rem` | 80px |

**Usage Example:**
```css
.my-element {
  padding: var(--space-4); /* 16px */
  margin-bottom: var(--space-8); /* 32px */
}
```

## Typography

Font size tokens for consistent text scaling.

| Token | Value | Description |
|-------|-------|-------------|
| `--text-xs` | `0.75rem` | 12px - Captions |
| `--text-sm` | `0.875rem` | 14px - Small text |
| `--text-base` | `1rem` | 16px - Body text (default) |
| `--text-lg` | `1.125rem` | 18px - Large body text |
| `--text-xl` | `1.25rem` | 20px - Subheadings |
| `--text-2xl` | `1.5rem` | 24px - Section titles |
| `--text-3xl` | `1.875rem` | 30px - Card titles |
| `--text-4xl` | `2.25rem` | 36px - Page headings |
| `--text-5xl` | `3rem` | 48px - Hero headings |

**Note:** The application uses two custom font families loaded from Google Fonts:
- `Inter` (sans-serif, `--font-inter`) - Primary UI font
- `Space Grotesk` (display, `--font-space`) - Headings and display text

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0.375rem` | 6px - Small elements |
| `--radius-md` | `0.5rem` | 8px - Buttons, inputs |
| `--radius-lg` | `0.75rem` | 12px - Cards |
| `--radius-xl` | `1rem` | 16px - Large cards, dialogs |
| `--radius-2xl` | `1.5rem` | 24px - Extra large containers |

## Glassmorphism

Glassmorphism tokens for creating frosted glass effects.

| Token | Value | Description |
|-------|-------|-------------|
| `--glass-backdrop-blur` | `blur(12px)` | Standard blur strength |
| `--glass-backdrop-blur-sm` | `blur(8px)` | Subtle blur |
| `--glass-backdrop-blur-lg` | `blur(16px)` | Strong blur |
| `--glass-opacity` | `0.7` | Standard opacity |
| `--glass-opacity-sm` | `0.5` | Lower opacity |
| `--glass-opacity-lg` | `0.85` | Higher opacity |
| `--glass-border` | `rgba(255,255,255,0.1)` (dark) / `rgba(0,0,0,0.1)` (light) | Glass edge border |
| `--glass-border-light` | `rgba(255,255,255,0.05)` (dark) / `rgba(0,0,0,0.05)` (light) | Subtle glass border |
| `--glass-bg` | `rgba(17,17,17,var(--glass-opacity))` (dark) / `rgba(255,255,255,var(--glass-opacity))` (light) | Glass background |

**Usage Example:**
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-backdrop-blur);
  -webkit-backdrop-filter: var(--glass-backdrop-blur);
  border: 1px solid var(--glass-border);
}
```

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-glow` | `0 0 20px var(--color-accent-glow)` | Accent glow effect |
| `--shadow-glow-sm` | `0 0 10px rgba(0, 255, 157, 0.1)` | Small accent glow |
| `--shadow-card` | `0 4px 20px -2px rgba(0,0,0,0.6), 0 0 0 1px var(--color-border-light)` | Card elevation |

## Animations

Built-in keyframe animations.

| Token | Duration | Description |
|-------|----------|-------------|
| `animate-fade-in` | 0.3s | Fade in with slight upward motion |
| `animate-slide-up` | 0.4s | Slide up from bottom |
| `animate-pulse-glow` | 3s (infinite) | Pulsing glow effect |
| `animate-shimmer` | 2s (infinite) | Shimmer effect |

## Tailwind Integration

The `tailwind.config.ts` extends Tailwind with custom values that map to these CSS variables. For example:

```ts
// Custom colors in tailwind.config.ts
colors: {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  // ... existing colors
}
```

This allows you to use semantic colors in your Tailwind classes:

```html
<button class="bg-primary text-primary-foreground hover:bg-primary/80">
  Primary Button
</button>

<alert class="border-warning text-warning bg-warning/10">
  Warning message
</alert>
```

## Theme Switching

The application supports dark and light themes via the `[data-theme]` attribute on the `<html>` element:

- **Dark theme (default):** No special attribute needed; uses `:root` variables.
- **Light theme:** Add `[data-theme="light"]` to override dark theme values.

The `ThemeProvider` component handles automatic system preference detection and localStorage persistence. The `ThemeToggle` component allows users to switch between:

1. **Light mode** - Light theme
2. **Dark mode** - Dark theme (default)
3. **System** - Follows OS preference automatically

## Accessibility

All tokens are designed with WCAG AA contrast ratios in mind:

- Primary text (`--color-fg`) on background (`--color-bg`) exceeds 7:1 contrast
- Semantic colors are chosen for clear differentiation and sufficient contrast
- Interactive states include focus rings using `--color-primary` for keyboard navigation

When using semantic colors, ensure text contrast meets accessibility standards. The default foreground colors on semantic backgrounds are set to `*-foreground` tokens for optimal readability.

## Utilities

Pre-built utility classes are available in `globals.css` under `@layer utilities`:

- `.p-token`, `.p-token-lg`, `.p-token-xl` - Padding shortcuts
- `.text-token-4xl` - Large text utility
- `.rounded-token-xl`, `.rounded-token-2xl` - Border radius shortcuts
- `.bg-surface-card`, `.bg-surface-hover` - Background utilities
- `.border-token` - Border utility
- `.shadow-glow`, `.shadow-glow-sm` - Glow shadow utilities
- `.glass`, `.glass-sm`, `.glass-lg` - Glassmorphism utilities
- `.text-primary`, `.bg-primary`, `.text-success`, `.bg-success`, etc. - Semantic color utilities

These utilities provide consistent spacing and styling across the application.
