# TrueTone Design System — Shared Component Library

> **Phase 3 Specification Document**  
> Light Warm Editorial Component Specifications (`public/css/components.css?v=2.0`).

---

## Component Inventory & Definitions

| Component Category | Selector / Primitive | One-Line Description |
| :--- | :--- | :--- |
| **Buttons** | `.btn-primary` | Solid ink background, white text, 10px radius, 36px height with no gradient or glow. |
| **Buttons** | `.btn-secondary` | White paper background with 1px hairline border, ink text, 10px radius, 36px height. |
| **Buttons** | `.btn-ghost` | Transparent background, ink-2 text, 10px radius, subtle fill hover effect. |
| **Buttons** | `.btn-destructive` | Violation tint background, violation border and text, 10px radius, 36px height. |
| **Buttons** | `.btn-vote-yes` | Pass soft tint background with pass border and text for approving reviews. |
| **Buttons** | `.btn-vote-no` | Violation soft tint background with violation border and text for rejecting reviews. |
| **Buttons** | `.btn-close` | 32px square transparent icon button with fill hover background for dismissing modals/banners. |
| **Buttons** | `[disabled]` | Reduced contrast (0.45 opacity) with `not-allowed` cursor for inactive interactive elements. |
| **Buttons** | `.loading` | Accessible loading state with hidden text and centered spinning border indicator. |
| **Pills & Tags** | `.tag-badge.pass` | Pass soft green tint background, pass green text, 6px radius, 12px text. |
| **Pills & Tags** | `.tag-badge.caution` | Caution soft amber tint background, caution amber text, 6px radius, 12px text. |
| **Pills & Tags** | `.tag-badge.violation` | Violation soft crimson tint background, violation crimson text, 6px radius, 12px text. |
| **Pills & Tags** | `.tag-badge.info` | Azure soft blue tint background, azure blue text, 6px radius, 12px text. |
| **Pills & Tags** | `.tag-badge.neutral` | Fill warm grey background, ink-2 text, hairline border, 6px radius, 12px text. |
| **Pills & Tags** | `.filter-pill` | Toggleable filter pill in 12px text and 6px radius, becoming solid ink with white text when active. |
| **Pills & Tags** | `.perm-pill` | Permission indicator pill switching between pass green when active and neutral when inactive. |
| **Cards** | `.card` | Surface card with 1px hairline border, 16px radius, paper background, subtle shadow, and no hover lift. |
| **Cards** | `.card.interactive` | Interactive container receiving a hairline-strong border on hover with zero translate lift. |
| **Cards** | `.feed-card` | Feed submission card with paper background, hairline border, 16px radius, and title/meta header. |
| **Stat Cards** | `.stat-card` | Metric summary card displaying a 28px Inter 600 value and ink-2 uppercase label with zero neon glow. |
| **Stat Cards** | `.stat-grid` | Responsive auto-fit grid container for displaying metric stat cards with 16px gap. |
| **Form Controls** | `.form-input` | 40px height single-line text input with hairline border, paper background, and azure focus ring. |
| **Form Controls** | `.form-select` | 40px height dropdown selector with hairline border, paper background, and azure focus ring. |
| **Form Controls** | `.form-textarea` | Multi-line textarea with 8px radius, hairline border, paper background, and azure focus ring. |
| **Form Controls** | `.checkbox-label` | Accessible label paired with a 16px checkbox themed with an azure accent color. |
| **Popovers** | `#tt-issue-popover` | Floating issue audit popover with paper background, 12px radius, overlay shadow, and zero glow. |
| **Popovers** | `#tt-review-issue-popover` | Review queue issue tooltip with paper background, overlay shadow, and pass suggestion box. |
| **Modals** | `.modal-overlay` | Fixed full-viewport backdrop with warm semi-transparent overlay and 4px blur. |
| **Modals** | `.modal-box` | Center-aligned modal dialog card with paper background, 16px radius, and overlay shadow. |
| **Comment Threads** | `.comment-tree` | Hierarchical comment thread container organizing discussion nodes with 12px gap. |
| **Comment Threads** | `.comment-node` | Individual comment bubble with sidebar warm background, hairline border, and 12px radius. |
| **Comment Threads** | `.btn-react` | 28px micro-pill button for liking or reacting to feedback with fill hover state. |
| **Toasts** | `.toast` | Dark ink notification badge with overlay shadow, 8px radius, and semantic status dot indicator. |
| **Warning Blocks** | `.warning-box` | Alert panel with caution soft background, caution border, 12px radius, and header title. |
| **States** | `.state-empty` | Centered dashed-border paper placeholder for queues or lists with zero items. |
| **States** | `.state-error` | Violation soft banner displaying error headlines and descriptive troubleshooting text. |
| **States** | `.state-loading` | Centered layout featuring an azure spinning ring and descriptive status label. |
| **Utilities** | `.eyebrow-mono` | 11px uppercase group label styled in JetBrains Mono 500 with 0.08em tracking. |
| **Utilities** | `.hairline` | 1px solid line divider matching token `--line` (#E4E1D8). |
| **Utilities** | `.wash` | Halftone editorial background combining three wash stop radial gradients with a 4px dot overlay. |
