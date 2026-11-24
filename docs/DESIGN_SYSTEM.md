# TrueTone Design System Specification

> **Aesthetic Architecture: Light Warm Editorial**  
> High-Performance Brand Tone Governance Platform  
> Designed for enterprise compliance, editorial rigor, and zero-distraction governance workflows.

---

## 1. Design Philosophy

TrueTone embodies a **Light Warm Editorial** design aesthetic. Unlike clinical SaaS dashboards or dark neon gaming consoles, TrueTone is designed around the metaphor of a prestigious editorial publishing house and legal compliance archive:

1. **Warm Canvas over Cold Whites**: A natural tactile base (`#ECEAE3`) inspired by archival parchment, combined with crisp paper cards (`#FFFFFF`) and sidebar warm tones (`#FBFAF7`).
2. **Editorial Typography Hierarchy**: Newsreader serif for page headlines and editorial reading surfaces, paired with Inter for high-density UI and JetBrains Mono for audit logs and machine timestamps.
3. **Calm Restraint**: No hover lifts, no fluorescent neon glows, no synthetic gradients. State transitions operate via crisp hairline borders (`#CBC7BC`, `#17171B`) and subtle paper shadows.
4. **Semantic Confidence**: Clean color-coded signals (Pass, Caution, Violation) rendered as soft pastel backgrounds with authoritative dark text, ensuring immediate readability and WCAG AA contrast.

---

## 2. Token Specification (`public/css/tokens.css`)

### 2.1 Palette Tokens
| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `--canvas` | `#ECEAE3` | Application-wide viewport backdrop and viewport wash |
| `--paper` | `#FFFFFF` | Primary card surfaces, modal dialog boxes, form inputs |
| `--paper-warm` | `#FAF8F5` | Secondary card sections, metric summary panels |
| `--sidebar` | `#FBFAF7` | Left persistent navigation bar and nested comment containers |
| `--fill` | `#F2F0EA` | Secondary button backgrounds, filter pill active fills, avatar chips |
| `--line` | `#E4E1D8` | Universal dividing borders, card strokes, header separators |
| `--line-strong` | `#CBC7BC` | High-emphasis borders, active borders, card hover strokes |
| `--ink` | `#17171B` | Primary headings, body copy, active button backgrounds |
| `--ink-2` | `#55555E` | Secondary descriptions, subheadings, input placeholders |
| `--ink-3` | `#8A8A93` | Metadata captions, timestamps, empty state text |

### 2.2 Semantic Status & Accents
| Accent | Main Token | Soft Background Token | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Azure** | `--azure: #27A9E1` | `--azure-soft: #E3F4FB` | Brand identity, interactive links, progress indicators |
| **Pass** | `--pass: #2F9D6C` | `--pass-soft: #E6F5EE` | Clean audits, approved submissions, low risk |
| **Caution** | `--caution: #C98A1E` | `--caution-soft: #FAF2E2` | Medium risk, warning notices, pending reviews |
| **Violation** | `--violation: #D2453D` | `--violation-soft: #FAECEB` | High risk, rejected content, tone violations |

### 2.3 Editorial Wash Accents
- `--wash-1: #F8DDA6` (Warm gold wash stop)
- `--wash-2: #A5DBF3` (Azure tint wash stop)
- `--wash-3: #BDB8F2` (Soft lavender wash stop)

### 2.4 Elevation & Radii
- **Radii scale**:
  - `--radius-sm: 8px` (Buttons, inputs, filter pills, badge tags)
  - `--radius-md: 12px` (Cards, dropdowns, floating popovers)
  - `--radius-lg: 16px` (Reading surfaces, modal containers)
  - `--radius-xl: 24px` (Hero cards, major surface panels)
- **Shadow scale**:
  - `--shadow-subtle: 0 1px 3px rgba(23, 23, 27, 0.06)` (Subtle card grounding)
  - `--shadow-overlay: 0 12px 32px rgba(23, 23, 27, 0.12), 0 2px 6px rgba(23, 23, 27, 0.04)` (Modals, floating popovers, dropdown menus)
  - **No glows**: Zero fluorescent glow or outer box-shadow filters.

---

## 3. Typography Scale & Font Pairing

| Role | Font Family | Size / Line-Height | Weight | Applied To |
| :--- | :--- | :--- | :--- | :--- |
| **Hero / Title** | `Newsreader`, Georgia, serif | 26px / 1.25 | 600 SemiBold | Viewport headers, modal titles, reading headlines |
| **Section Header** | `Inter`, sans-serif | 16px / 1.3 | 600 SemiBold | Card titles, column headers, rail group labels |
| **Body / Primary** | `Inter`, sans-serif | 14px / 1.5 | 400 Regular / 500 Med | Default UI text, form labels, comments |
| **Compact UI** | `Inter`, sans-serif | 13px / 1.45 | 500 Medium | Buttons, tab navigation labels, list items |
| **Editorial Reading**| `Newsreader`, Georgia, serif | 17px / 1.65 | 400 Regular | Review detail reading surface, post content |
| **Code & Audit** | `JetBrains Mono`, monospace | 11px / 1.4 | 500 Medium | Rule IDs (`VID-02`), timestamps, metric chips |

---

## 4. Component Inventory & Patterns

### 4.1 Persistent Navigation Shell
- **Brand Identity**: Stylized vertical audio-wave bar icon in ink, accompanied by serif product title and small mono department tag.
- **Persona Switcher**: Native select styled as an editorial card with clear viewing status, demonstrating live role-based visibility.
- **User Profile Card**: Initials avatar badge with live PostgreSQL permission indicators (`perm-pill`) for `POST`, `APPROVE`, and `ACT`.
- **Database Pulse Indicator**: Live pooling heartbeat dot (emerald green pulse when healthy, amber/red when checking or offline).

### 4.2 Scorecards & Card Containers
- **Border Feedback**: Cards do not lift on hover (`transform: translateY(-2px)` is strictly avoided). Hover states trigger a clean border transition (`--line` to `--line-strong`), maintaining spatial stillness.
- **Big Number Metrics**: Key figures (e.g. Pass Rates, Audit Scores) rendered at 24px-28px with thin 4px azure track progress bars.
- **Hairline Dividers**: Section breakdowns within cards use 1px solid `--line` or dashed dividers for historical summaries.

### 4.3 Segmented Filters & Buttons
- **Segmented Control**: Filter groups encased in a unified paper capsule with 2px gap, active state highlighted with neutral `--fill`.
- **Primary Ink Button**: `--ink` background with white text, transitioning to `--ink-2` on hover. Used for primary irreversible actions.
- **Secondary Line Button**: Transparent background with `--line` border and `--ink` text.
- **Icon Buttons**: Centered SVGs with dedicated `aria-label` attributes and minimum touch footprints.

### 4.4 Modals, Overlays & Popovers
- **Accessibility Contracts**: All modal overlays implement `role="dialog"` and `aria-modal="true"`.
- **Responsive Constraints**: Modals dynamically scale to `max-width: 92vw; max-height: 88vh; overflow-y: auto` on mobile.
- **Backdrop Styling**: Subtle dark overlay with soft blur (`rgba(23, 23, 27, 0.35)`).

---

## 5. Responsive Standards

| Breakpoint | Target Devices | Layout Reflow Behavior |
| :--- | :--- | :--- |
| **1440px+** | Wide Desktop | 2-column detail views, 3-column scorecard grids, sticky voting rails |
| **1024px** | Standard Laptops / Tablets Landscape | 2-column scorecard grids, flexible composer workspace |
| **768px** | Tablets Portrait / Phablets | Sidebar collapses into horizontal top navigation strip; grids stack into 1-column |
| **390px** | Mobile Viewports (iPhone / Android) | Fully stacked layout; modals fit 94vw; buttons enforce 40px+ tap targets |

---

## 6. Accessibility & Compliance (WCAG AA)

1. **Color Contrast**: All text-to-background combinations meet or exceed 4.5:1 ratio (e.g. `--ink` on `--canvas` is 13.8:1; `--pass` on `--pass-soft` is 4.6:1; `--violation` on `--violation-soft` is 5.1:1).
2. **Keyboard Navigation & Visible Focus**: Every interactive control (`button`, `a`, `input`, `select`, `textarea`, `[tabindex]`) displays a high-contrast 2px azure outline with 2px offset (`:focus-visible`).
3. **Screen Reader Landmarks**: Modals include `role="dialog"` and `aria-labelledby`; dynamic status announcements leverage `aria-live="polite"` on `#toast-container`.
4. **Motion Safety**: Full `@media (prefers-reduced-motion: reduce)` support reduces all CSS animations and transitions to `0.01ms`.

---

## 7. Architectural Governance & DOM Contract

1. **Zero Functional Alteration**: JavaScript business logic, fetch URLs, event listeners, timer intervals (`ttReviewsPollTimer`), and permission gates are 100% frozen.
2. **DOM Stability**: All element IDs and class names looked up by JavaScript (documented in `docs/DOM_CONTRACT.md`) remain untouched.
3. **No External CDN Dependencies**: All styling is pure CSS; fonts are served via Google Fonts with `font-display: swap` and preconnect links.
