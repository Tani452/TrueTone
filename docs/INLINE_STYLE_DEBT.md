# TrueTone Inline Style Debt Audit

> **AUDIT MANDATE (Hard Rule 4)**  
> Inline styles outrank CSS.  
> - **PRESENTATIONAL** inline properties (`color`, `background`, `border`, `font-*`, `padding`, `margin`, `gap`, `border-radius`, `box-shadow`) may be converted into classes or CSS variables in subsequent redesign phases.  
> - **FUNCTIONAL** inline properties (`display`, `visibility`, `width`, `height`, `opacity`, `transform`, dynamic coordinates/percentages) must **NOT** be touched because JS toggles or computes them.

---

## 1. Summary Statistics

- **Total Inline Styles Audited:** 275
- **Presentational Styles (Refactorable):** 205
- **Functional Styles (Locked / Do Not Touch):** 70
- **Unique Hardcoded Color Literals:** 65

---

## 2. Inline Style Debt Inventory

| File | Line | Classification | Inline Properties |
| :--- | :--- | :--- | :--- |
| `public/index.html` | L35 | **PRESENTATIONAL** | `font-size: 0.6rem; color: var(--text-muted);` |
| `public/index.html` | L64 | **PRESENTATIONAL** | `padding: 0 4px; margin-bottom: 8px;` |
| `public/index.html` | L77 | **PRESENTATIONAL** | `font-size: 0.78rem;` |
| `public/index.html` | L78 | **PRESENTATIONAL** | `font-size: 0.68rem; color: #64748b;` |
| `public/js/tabs/publish.tab.js` | L48 | **FUNCTIONAL** | `display: flex; flex-direction: column; align-items: flex-end; gap: 6px;` |
| `public/js/tabs/publish.tab.js` | L53 | **PRESENTATIONAL** | `font-size: 0.74rem; color: var(--text-muted);` |
| `public/js/tabs/publish.tab.js` | L54 | **PRESENTATIONAL** | `color: var(--text-primary);` |
| `public/js/tabs/publish.tab.js` | L60 | **FUNCTIONAL** | `display: none; margin-bottom: 16px;` |
| `public/js/tabs/publish.tab.js` | L98 | **FUNCTIONAL** | `display: flex; gap: 12px; align-items: center;` |
| `public/js/tabs/publish.tab.js` | L102 | **FUNCTIONAL** | `display: none; background: linear-gradient(135deg, #10b981, #059669);` |
| `public/js/tabs/publish.tab.js` | L110 | **FUNCTIONAL** | `margin-top: 14px; display: flex; flex-direction: column; gap: 6px; font-size: 0.76rem; color: var(--text-muted);` |
| `public/js/tabs/publish.tab.js` | L111 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;` |
| `public/js/tabs/publish.tab.js` | L115 | **FUNCTIONAL** | `color: #64748b; font-size: 0.72rem; display: flex; align-items: center; gap: 6px;` |
| `public/js/tabs/publish.tab.js` | L134 | **PRESENTATIONAL** | `font-weight: 600; font-size: 0.9rem; color: #fff;` |
| `public/js/tabs/publish.tab.js` | L135 | **FUNCTIONAL** | `display: flex; gap: 12px; align-items: center;` |
| `public/js/tabs/publish.tab.js` | L136 | **PRESENTATIONAL** | `color: #38bdf8; font-size: 0.8rem; text-decoration: none;` |
| `public/js/tabs/publish.tab.js` | L326 | **PRESENTATIONAL** | `font-size: 1.4rem;` |
| `public/js/tabs/publish.tab.js` | L338 | **FUNCTIONAL** | `height: 24px; width: 100%; max-width: 140px; margin-top: 3px;` |
| `public/js/tabs/publish.tab.js` | L586 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/publish.tab.js` | L587 | **PRESENTATIONAL** | `font-size: 1.1rem;` |
| `public/js/tabs/publish.tab.js` | L608 | **FUNCTIONAL** | `margin-top: 14px; border-top: 1px solid rgba(255, 132, 0, 0.3); padding-top: 12px; display: flex; flex-direction: column; gap: 10px; width: 100%;` |
| `public/js/tabs/publish.tab.js` | L609 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px; font-weight: 700; color: #ff5277; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;` |
| `public/js/tabs/publish.tab.js` | L624 | **PRESENTATIONAL** | `background: rgba(8, 14, 28, 0.85); border: 1px solid rgba(255, 82, 119, 0.4); border-radius: 6px; padding: 12px 14px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);` |
| `public/js/tabs/publish.tab.js` | L625 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;` |
| `public/js/tabs/publish.tab.js` | L626 | **FUNCTIONAL** | `font-weight: 700; color: #f8fafc; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;` |
| `public/js/tabs/publish.tab.js` | L627 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; padding: 2px 7px; border-radius: 4px; font-weight: 700;` |
| `public/js/tabs/publish.tab.js` | L628 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-family: monospace;` |
| `public/js/tabs/publish.tab.js` | L631 | **FUNCTIONAL** | `display: flex; gap: 8px; align-items: center;` |
| `public/js/tabs/publish.tab.js` | L632 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #ff5277; background: rgba(255, 82, 119, 0.15); border: 1px solid #ff5277; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase;` |
| `public/js/tabs/publish.tab.js` | L633 | **PRESENTATIONAL** | `background: rgba(255, 82, 119, 0.2); border: 1px solid #ff5277; color: #ff8fa3; padding: 3px 10px; border-radius: 4px; font-size: 0.76rem; cursor: pointer; font-weight: 600;` |
| `public/js/tabs/publish.tab.js` | L636 | **PRESENTATIONAL** | `font-size: 0.74rem; color: var(--text-muted); margin-bottom: 8px;` |
| `public/js/tabs/publish.tab.js` | L637 | **PRESENTATIONAL** | `color: #93c5fd;` |
| `public/js/tabs/publish.tab.js` | L639 | **PRESENTATIONAL** | `margin-bottom: 8px; font-size: 0.86rem; line-height: 1.4; color: #fca5a5;` |
| `public/js/tabs/publish.tab.js` | L640 | **PRESENTATIONAL** | `color: #ff6b81;` |
| `public/js/tabs/publish.tab.js` | L642 | **PRESENTATIONAL** | `background: rgba(6, 182, 212, 0.09); border-left: 3px solid #06b6d4; padding: 8px 12px; border-radius: 4px; font-size: 0.83rem; line-height: 1.4; color: #e2e8f0; margin-bottom: 8px;` |
| `public/js/tabs/publish.tab.js` | L643 | **PRESENTATIONAL** | `font-size: 0.7rem; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.05em;` |
| `public/js/tabs/publish.tab.js` | L647 | **PRESENTATIONAL** | `margin-top: 8px; margin-bottom: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px;` |
| `public/js/tabs/publish.tab.js` | L648 | **PRESENTATIONAL** | `cursor: pointer; font-size: 0.76rem; color: #38bdf8; font-weight: 600;` |
| `public/js/tabs/publish.tab.js` | L649 | **PRESENTATIONAL** | `font-size: 0.78rem; color: #cbd5e1; margin-top: 4px; padding: 6px 10px; background: rgba(0,0,0,0.35); border-radius: 4px; white-space: pre-wrap; font-family: inherit;` |
| `public/js/tabs/publish.tab.js` | L653 | **PRESENTATIONAL** | `margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;` |
| `public/js/tabs/publish.tab.js` | L654 | **PRESENTATIONAL** | `font-size: 0.74rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;` |
| `public/js/tabs/publish.tab.js` | L657 | **FUNCTIONAL** | `display: flex; flex-direction: column; gap: 6px;` |
| `public/js/tabs/publish.tab.js` | L659 | **PRESENTATIONAL** | `background: rgba(0, 0, 0, 0.45); border-left: 3px solid #f59e0b; padding: 6px 10px; border-radius: 3px; font-size: 0.8rem;` |
| `public/js/tabs/publish.tab.js` | L660 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; flex-wrap: wrap; gap: 4px;` |
| `public/js/tabs/publish.tab.js` | L661 | **PRESENTATIONAL** | `background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; font-family: monospace; font-size: 0.75rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; cursor: pointer;` |
| `public/js/tabs/publish.tab.js` | L664 | **PRESENTATIONAL** | `font-size: 0.68rem; color: #fde68a; text-transform: uppercase; font-weight: 700;` |
| `public/js/tabs/publish.tab.js` | L666 | **PRESENTATIONAL** | `color: #fca5a5; margin-bottom: 2px;` |
| `public/js/tabs/publish.tab.js` | L667 | **PRESENTATIONAL** | `font-size: 0.74rem; color: #94a3b8; font-style: italic; margin-bottom: 2px;` |
| `public/js/tabs/publish.tab.js` | L668 | **PRESENTATIONAL** | `font-size: 0.76rem; color: #6ee7b7;` |
| `public/js/tabs/publish.tab.js` | L682 | **FUNCTIONAL** | `display: flex; flex-direction: column; width: 100%;` |
| `public/js/tabs/publish.tab.js` | L683 | **FUNCTIONAL** | `display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 8px;` |
| `public/js/tabs/publish.tab.js` | L686 | **PRESENTATIONAL** | `margin-left: 6px;` |
| `public/js/tabs/publish.tab.js` | L778 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #94a3b8;` |
| `public/js/tabs/publish.tab.js` | L784 | **PRESENTATIONAL** | `font-size: 0.7rem; color: #6ee7b7; text-transform: uppercase; margin-bottom: 2px;` |
| `public/js/tabs/publish.tab.js` | L882 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #94a3b8;` |
| `public/js/tabs/publish.tab.js` | L888 | **PRESENTATIONAL** | `font-size: 0.7rem; color: #6ee7b7; text-transform: uppercase; margin-bottom: 2px;` |
| `public/js/tabs/publish.tab.js` | L891 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-top: 4px;` |
| `public/js/tabs/publish.tab.js` | L892 | **PRESENTATIONAL** | `color: #38bdf8; font-size: 0.8rem; text-decoration: none;` |
| `public/js/tabs/publish.tab.js` | L1027 | **PRESENTATIONAL** | `font-size: 0.95rem;` |
| `public/js/tabs/publish.tab.js` | L1029 | **PRESENTATIONAL** | `margin-top: 4px; font-size: 0.84rem;` |
| `public/js/tabs/publish.tab.js` | L1038 | **PRESENTATIONAL** | `font-size: 0.95rem;` |
| `public/js/tabs/publish.tab.js` | L1040 | **PRESENTATIONAL** | `margin-top: 4px; font-size: 0.84rem;` |
| `public/js/tabs/publish.tab.js` | L1041 | **PRESENTATIONAL** | `font-size: 0.78rem; color: #fde68a;` |
| `public/js/tabs/guidelines.tab.js` | L43 | **PRESENTATIONAL** | `font-size: 0.75rem;` |
| `public/js/tabs/guidelines.tab.js` | L76 | **PRESENTATIONAL** | `font-size: 1.1rem; line-height: 1;` |
| `public/js/tabs/guidelines.tab.js` | L85 | **FUNCTIONAL** | `display: none;` |
| `public/js/tabs/guidelines.tab.js` | L92 | **PRESENTATIONAL** | `font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;` |
| `public/js/tabs/guidelines.tab.js` | L103 | **PRESENTATIONAL** | `color: var(--text-muted); padding: 30px; text-align: center; grid-column: 1 / -1;` |
| `public/js/tabs/guidelines.tab.js` | L110 | **PRESENTATIONAL** | `margin-top: 30px;` |
| `public/js/tabs/guidelines.tab.js` | L112 | **FUNCTIONAL** | `display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 10px;` |
| `public/js/tabs/guidelines.tab.js` | L113 | **PRESENTATIONAL** | `background: var(--bg-surface-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border-strong);` |
| `public/js/tabs/guidelines.tab.js` | L114 | **PRESENTATIONAL** | `color: #60a5fa; font-size: 0.85rem;` |
| `public/js/tabs/guidelines.tab.js` | L115 | **PRESENTATIONAL** | `font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;` |
| `public/js/tabs/guidelines.tab.js` | L117 | **PRESENTATIONAL** | `background: var(--bg-surface-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border-strong);` |
| `public/js/tabs/guidelines.tab.js` | L118 | **PRESENTATIONAL** | `color: #60a5fa; font-size: 0.85rem;` |
| `public/js/tabs/guidelines.tab.js` | L119 | **PRESENTATIONAL** | `font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;` |
| `public/js/tabs/guidelines.tab.js` | L121 | **PRESENTATIONAL** | `background: var(--bg-surface-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border-strong);` |
| `public/js/tabs/guidelines.tab.js` | L122 | **PRESENTATIONAL** | `color: #60a5fa; font-size: 0.85rem;` |
| `public/js/tabs/guidelines.tab.js` | L123 | **PRESENTATIONAL** | `font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;` |
| `public/js/tabs/guidelines.tab.js` | L136 | **PRESENTATIONAL** | `max-width: 560px;` |
| `public/js/tabs/guidelines.tab.js` | L138 | **FUNCTIONAL** | `color: #f8fafc; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/guidelines.tab.js` | L144 | **PRESENTATIONAL** | `font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;` |
| `public/js/tabs/guidelines.tab.js` | L147 | **FUNCTIONAL** | `display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px; border-top: 1px solid var(--border-strong); padding-top: 14px;` |
| `public/js/tabs/guidelines.tab.js` | L148 | **PRESENTATIONAL** | `padding: 8px 16px;` |
| `public/js/tabs/guidelines.tab.js` | L151 | **PRESENTATIONAL** | `padding: 8px 18px; background: linear-gradient(135deg, #10b981, #059669);` |
| `public/js/tabs/guidelines.tab.js` | L164 | **PRESENTATIONAL** | `max-width: 780px;` |
| `public/js/tabs/guidelines.tab.js` | L166 | **PRESENTATIONAL** | `color: #f8fafc; font-size: 1.05rem;` |
| `public/js/tabs/guidelines.tab.js` | L169 | **PRESENTATIONAL** | `margin-bottom: 10px; font-size: 0.78rem; color: var(--text-muted);` |
| `public/js/tabs/guidelines.tab.js` | L170 | **PRESENTATIONAL** | `background: #090d16; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 18px; color: #38bdf8; font-family: var(--font-mono); font-size: 0.8rem; max-height: 60vh; overflow: auto; white-space: pre-wrap; line-height: 1.55;` |
| `public/js/tabs/guidelines.tab.js` | L228 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 10px;` |
| `public/js/tabs/guidelines.tab.js` | L232 | **PRESENTATIONAL** | `font-size: 0.76rem; color: #94a3b8; margin-top: 2px;` |
| `public/js/tabs/guidelines.tab.js` | L287 | **PRESENTATIONAL** | `margin-bottom: 4px;` |
| `public/js/tabs/guidelines.tab.js` | L288 | **PRESENTATIONAL** | `color: #f8fafc;` |
| `public/js/tabs/guidelines.tab.js` | L289 | **PRESENTATIONAL** | `color: var(--text-muted); font-size: 0.78rem;` |
| `public/js/tabs/guidelines.tab.js` | L294 | **PRESENTATIONAL** | `margin-bottom: 14px;` |
| `public/js/tabs/guidelines.tab.js` | L296 | **PRESENTATIONAL** | `margin: 10px 0 14px 20px;` |
| `public/js/tabs/guidelines.tab.js` | L299 | **PRESENTATIONAL** | `background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;` |
| `public/js/tabs/guidelines.tab.js` | L300 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #6ee7b7; text-transform: uppercase; font-weight: 700; margin-bottom: 2px;` |
| `public/js/tabs/guidelines.tab.js` | L301 | **PRESENTATIONAL** | `font-size: 0.84rem; color: #d1fae5;` |
| `public/js/tabs/guidelines.tab.js` | L304 | **PRESENTATIONAL** | `font-weight: 600; color: #f8fafc;` |
| `public/js/tabs/guidelines.tab.js` | L418 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 10px;` |
| `public/js/tabs/guidelines.tab.js` | L422 | **PRESENTATIONAL** | `font-size: 0.76rem; color: #94a3b8; margin-top: 2px;` |
| `public/js/tabs/guidelines.tab.js` | L475 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;` |
| `public/js/tabs/guidelines.tab.js` | L476 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/guidelines.tab.js` | L477 | **PRESENTATIONAL** | `font-size: 1.2rem;` |
| `public/js/tabs/guidelines.tab.js` | L478 | **PRESENTATIONAL** | `color: #6ee7b7; font-size: 1.05rem;` |
| `public/js/tabs/guidelines.tab.js` | L480 | **PRESENTATIONAL** | `padding: 4px 10px; font-size: 0.76rem;` |
| `public/js/tabs/guidelines.tab.js` | L484 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 10px;` |
| `public/js/tabs/guidelines.tab.js` | L512 | **PRESENTATIONAL** | `background: var(--bg-surface-elevated); padding: 36px; border-radius: 8px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;` |
| `public/js/tabs/guidelines.tab.js` | L514 | **PRESENTATIONAL** | `font-size: 0.82rem; margin-top: 4px;` |
| `public/js/tabs/guidelines.tab.js` | L523 | **PRESENTATIONAL** | `background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.3);` |
| `public/js/tabs/guidelines.tab.js` | L529 | **PRESENTATIONAL** | `overflow: hidden;` |
| `public/js/tabs/guidelines.tab.js` | L540 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #10b981; font-weight: 600;` |
| `public/js/tabs/guidelines.tab.js` | L541 | **PRESENTATIONAL** | `padding: 4px 10px; font-size: 0.76rem;` |
| `public/js/tabs/guidelines.tab.js` | L549 | **PRESENTATIONAL** | `color: var(--accent-rose); padding: 18px; grid-column: 1 / -1;` |
| `public/js/tabs/guidelines.tab.js` | L624 | **PRESENTATIONAL** | `color: #6ee7b7; margin: 12px 0 4px 0; font-size: 0.92rem;` |
| `public/js/tabs/guidelines.tab.js` | L625 | **PRESENTATIONAL** | `color: #60a5fa; margin: 14px 0 6px 0; font-size: 1.05rem;` |
| `public/js/tabs/guidelines.tab.js` | L626 | **PRESENTATIONAL** | `color: #f8fafc;` |
| `public/js/tabs/guidelines.tab.js` | L628 | **PRESENTATIONAL** | `background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-family: monospace; color: #38bdf8;` |
| `public/js/tabs/guidelines.tab.js` | L629 | **PRESENTATIONAL** | `margin-bottom: 4px;` |
| `public/js/tabs/reviews.tab.js` | L77 | **PRESENTATIONAL** | `color: #34d399; font-weight: 600;` |
| `public/js/tabs/reviews.tab.js` | L78 | **PRESENTATIONAL** | `color: #f87171; font-weight: 600;` |
| `public/js/tabs/reviews.tab.js` | L81 | **FUNCTIONAL** | `width: ${yesPercent}%;` |
| `public/js/tabs/reviews.tab.js` | L82 | **FUNCTIONAL** | `width: ${noPercent}%;` |
| `public/js/tabs/reviews.tab.js` | L90 | **PRESENTATIONAL** | `color: var(--text-muted); font-style: italic;` |
| `public/js/tabs/reviews.tab.js` | L150 | **PRESENTATIONAL** | `color: ${sevColor}; font-weight: 700;` |
| `public/js/tabs/reviews.tab.js` | L212 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/reviews.tab.js` | L228 | **PRESENTATIONAL** | `color: #6ee7b7; border-color: rgba(16, 185, 129, 0.2);` |
| `public/js/tabs/reviews.tab.js` | L235 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 14px;` |
| `public/js/tabs/reviews.tab.js` | L236 | **FUNCTIONAL** | `font-size: 0.8rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;` |
| `public/js/tabs/reviews.tab.js` | L239 | **PRESENTATIONAL** | `font-size: 0.82rem; padding: 6px 14px;` |
| `public/js/tabs/reviews.tab.js` | L267 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;` |
| `public/js/tabs/reviews.tab.js` | L272 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #34d399; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 6px 12px; border-radius: 20px;` |
| `public/js/tabs/reviews.tab.js` | L286 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-muted);` |
| `public/js/tabs/reviews.tab.js` | L293 | **PRESENTATIONAL** | `text-align: center; padding: 40px; color: var(--text-muted);` |
| `public/js/tabs/reviews.tab.js` | L347 | **PRESENTATIONAL** | `background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 48px; text-align: center; color: var(--text-muted);` |
| `public/js/tabs/reviews.tab.js` | L348 | **PRESENTATIONAL** | `font-size: 2.2rem; margin-bottom: 12px;` |
| `public/js/tabs/reviews.tab.js` | L349 | **PRESENTATIONAL** | `color: var(--text-primary); margin-bottom: 6px;` |
| `public/js/tabs/reviews.tab.js` | L350 | **PRESENTATIONAL** | `font-size: 0.88rem; margin-bottom: ${currentFilter === 'all' ? '0' : '16px'};` |
| `public/js/tabs/reviews.tab.js` | L354 | **PRESENTATIONAL** | `background: rgba(6, 182, 212, 0.12); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; font-family: var(--font-mono); transition: all 0.2s ease;` |
| `public/js/tabs/reviews.tab.js` | L444 | **PRESENTATIONAL** | `color: var(--accent-rose); padding: 24px; text-align: center;` |
| `public/js/tabs/reviews.tab.js` | L459 | **PRESENTATIONAL** | `padding: 40px; text-align: center; color: var(--text-muted);` |
| `public/js/tabs/reviews.tab.js` | L476 | **PRESENTATIONAL** | `color: var(--accent-rose); margin-top: 24px;` |
| `public/js/tabs/reviews.tab.js` | L508 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 14px; flex-wrap: wrap;` |
| `public/js/tabs/reviews.tab.js` | L513 | **PRESENTATIONAL** | `font-size: 1.25rem; font-weight: 700;` |
| `public/js/tabs/reviews.tab.js` | L514 | **PRESENTATIONAL** | `font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;` |
| `public/js/tabs/reviews.tab.js` | L521 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 10px; flex-wrap: wrap;` |
| `public/js/tabs/reviews.tab.js` | L531 | **PRESENTATIONAL** | `background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 22px;` |
| `public/js/tabs/reviews.tab.js` | L532 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;` |
| `public/js/tabs/reviews.tab.js` | L533 | **FUNCTIONAL** | `font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/reviews.tab.js` | L535 | **PRESENTATIONAL** | `font-size: 0.76rem; background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3);` |
| `public/js/tabs/reviews.tab.js` | L537 | **PRESENTATIONAL** | `font-size: 0.76rem; color: var(--text-muted);` |
| `public/js/tabs/reviews.tab.js` | L540 | **PRESENTATIONAL** | `background: #090d16; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 18px; font-size: 0.94rem; line-height: 1.7; color: #f8fafc; min-height: 90px; white-space: pre-wrap;` |
| `public/js/tabs/reviews.tab.js` | L547 | **PRESENTATIONAL** | `background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 22px;` |
| `public/js/tabs/reviews.tab.js` | L548 | **FUNCTIONAL** | `font-size: 1rem; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/reviews.tab.js` | L572 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;` |
| `public/js/tabs/reviews.tab.js` | L574 | **PRESENTATIONAL** | `font-size: 0.72rem; color: #f87171; font-family: monospace; font-weight: 700;` |
| `public/js/tabs/reviews.tab.js` | L577 | **FUNCTIONAL** | `width: 100%; max-height: 160px; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;` |
| `public/js/tabs/reviews.tab.js` | L578 | **PRESENTATIONAL** | `max-height: 100%; max-width: 100%; border-radius: 4px;` |
| `public/js/tabs/reviews.tab.js` | L581 | **FUNCTIONAL** | `width: 100%; padding: 8px 10px; background: rgba(0,0,0,0.4); border-radius: 4px; display: flex; align-items: center; justify-content: center;` |
| `public/js/tabs/reviews.tab.js` | L582 | **FUNCTIONAL** | `width: 100%;` |
| `public/js/tabs/reviews.tab.js` | L585 | **FUNCTIONAL** | `width: 100%; height: 130px; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;` |
| `public/js/tabs/reviews.tab.js` | L586 | **PRESENTATIONAL** | `max-height: 100%; max-width: 100%; object-fit: contain;` |
| `public/js/tabs/reviews.tab.js` | L589 | **PRESENTATIONAL** | `padding: 16px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.85rem; color: #fca5a5;` |
| `public/js/tabs/reviews.tab.js` | L593 | **PRESENTATIONAL** | `font-size: 0.82rem; font-weight: 600; color: #fca5a5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` |
| `public/js/tabs/reviews.tab.js` | L596 | **PRESENTATIONAL** | `font-size: 0.76rem; color: #fca5a5; background: rgba(220, 38, 38, 0.15); border-left: 2px solid #dc2626; padding: 4px 8px; border-radius: 2px;` |
| `public/js/tabs/reviews.tab.js` | L600 | **PRESENTATIONAL** | `font-size: 0.74rem; background: rgba(0,0,0,0.35); border-radius: 3px; padding: 4px 8px;` |
| `public/js/tabs/reviews.tab.js` | L601 | **PRESENTATIONAL** | `color: #38bdf8; cursor: pointer; font-weight: 600;` |
| `public/js/tabs/reviews.tab.js` | L602 | **PRESENTATIONAL** | `color: #cbd5e1; margin-top: 4px; white-space: pre-wrap;` |
| `public/js/tabs/reviews.tab.js` | L606 | **PRESENTATIONAL** | `font-size: 0.74rem; background: rgba(0,0,0,0.4); border-left: 2px solid #f59e0b; padding: 4px 8px; border-radius: 2px;` |
| `public/js/tabs/reviews.tab.js` | L607 | **PRESENTATIONAL** | `color: #fde68a; font-weight: 700; font-size: 0.68rem; text-transform: uppercase;` |
| `public/js/tabs/reviews.tab.js` | L609 | **PRESENTATIONAL** | `color: #fca5a5; margin-top: 2px; font-size: 0.72rem;` |
| `public/js/tabs/reviews.tab.js` | L615 | **PRESENTATIONAL** | `margin-top: auto; padding-top: 6px;` |
| `public/js/tabs/reviews.tab.js` | L616 | **PRESENTATIONAL** | `font-size: 0.76rem; color: #60a5fa; text-decoration: underline;` |
| `public/js/tabs/reviews.tab.js` | L623 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center;` |
| `public/js/tabs/reviews.tab.js` | L627 | **FUNCTIONAL** | `width: 100%; max-height: 160px; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;` |
| `public/js/tabs/reviews.tab.js` | L628 | **PRESENTATIONAL** | `max-height: 100%; max-width: 100%; border-radius: 4px;` |
| `public/js/tabs/reviews.tab.js` | L631 | **FUNCTIONAL** | `width: 100%; padding: 8px 10px; background: rgba(0,0,0,0.4); border-radius: 4px; display: flex; align-items: center; justify-content: center;` |
| `public/js/tabs/reviews.tab.js` | L632 | **FUNCTIONAL** | `width: 100%;` |
| `public/js/tabs/reviews.tab.js` | L635 | **FUNCTIONAL** | `width: 100%; height: 130px; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;` |
| `public/js/tabs/reviews.tab.js` | L636 | **PRESENTATIONAL** | `max-height: 100%; max-width: 100%; object-fit: contain;` |
| `public/js/tabs/reviews.tab.js` | L639 | **PRESENTATIONAL** | `padding: 16px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.85rem; color: #94a3b8;` |
| `public/js/tabs/reviews.tab.js` | L643 | **PRESENTATIONAL** | `font-size: 0.82rem; font-weight: 600; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` |
| `public/js/tabs/reviews.tab.js` | L646 | **PRESENTATIONAL** | `margin-top: auto; padding-top: 6px;` |
| `public/js/tabs/reviews.tab.js` | L647 | **PRESENTATIONAL** | `font-size: 0.76rem; color: #60a5fa; text-decoration: underline;` |
| `public/js/tabs/reviews.tab.js` | L659 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;` |
| `public/js/tabs/reviews.tab.js` | L661 | **PRESENTATIONAL** | `font-size: 1.05rem; font-weight: 700; color: var(--text-primary);` |
| `public/js/tabs/reviews.tab.js` | L662 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;` |
| `public/js/tabs/reviews.tab.js` | L666 | **PRESENTATIONAL** | `min-width: 200px;` |
| `public/js/tabs/reviews.tab.js` | L672 | **PRESENTATIONAL** | `background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px; font-size: 0.85rem; color: var(--text-secondary);` |
| `public/js/tabs/reviews.tab.js` | L674 | **PRESENTATIONAL** | `color: #34d399;` |
| `public/js/tabs/reviews.tab.js` | L676 | **PRESENTATIONAL** | `color: #f87171;` |
| `public/js/tabs/reviews.tab.js` | L688 | **PRESENTATIONAL** | `font-size: 0.78rem; color: var(--text-muted); margin-left: 8px;` |
| `public/js/tabs/reviews.tab.js` | L692 | **FUNCTIONAL** | `background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.82rem; color: #fbbf24; width: 100%;` |
| `public/js/tabs/reviews.tab.js` | L702 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;` |
| `public/js/tabs/reviews.tab.js` | L703 | **FUNCTIONAL** | `font-size: 1rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/reviews.tab.js` | L705 | **PRESENTATIONAL** | `font-size: 0.76rem; background: var(--bg-surface-elevated); color: var(--text-secondary); padding: 2px 8px; border-radius: 12px;` |
| `public/js/tabs/reviews.tab.js` | L717 | **PRESENTATIONAL** | `margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-subtle);` |
| `public/js/tabs/reviews.tab.js` | L718 | **PRESENTATIONAL** | `font-size: 0.84rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;` |
| `public/js/tabs/reviews.tab.js` | L721 | **PRESENTATIONAL** | `background: #090d16;` |
| `public/js/tabs/reviews.tab.js` | L722 | **FUNCTIONAL** | `display: flex; justify-content: flex-end; margin-top: 8px;` |
| `public/js/tabs/reviews.tab.js` | L723 | **PRESENTATIONAL** | `font-size: 0.82rem; padding: 8px 16px;` |
| `public/js/tabs/reviews.tab.js` | L780 | **PRESENTATIONAL** | `color: var(--text-muted); font-size: 0.82rem; padding: 12px 0;` |
| `public/js/tabs/reviews.tab.js` | L794 | **PRESENTATIONAL** | `color: var(--text-primary);` |
| `public/js/tabs/reviews.tab.js` | L795 | **PRESENTATIONAL** | `color: var(--text-muted); font-size: 0.74rem;` |
| `public/js/tabs/reviews.tab.js` | L798 | **PRESENTATIONAL** | `color: var(--text-muted); font-size: 0.72rem;` |
| `public/js/tabs/reviews.tab.js` | L818 | **FUNCTIONAL** | `display: none;` |
| `public/js/tabs/reviews.tab.js` | L819 | **PRESENTATIONAL** | `background: #060911; font-size: 0.82rem;` |
| `public/js/tabs/reviews.tab.js` | L820 | **FUNCTIONAL** | `display: flex; justify-content: flex-end; gap: 8px;` |
| `public/js/tabs/reviews.tab.js` | L821 | **PRESENTATIONAL** | `font-size: 0.76rem; padding: 4px 10px;` |
| `public/js/tabs/reviews.tab.js` | L822 | **PRESENTATIONAL** | `font-size: 0.76rem; padding: 4px 10px;` |
| `public/js/tabs/reviews.tab.js` | L828 | **PRESENTATIONAL** | `margin-top: 10px;` |
| `public/js/tabs/action.tab.js` | L61 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 12px;` |
| `public/js/tabs/action.tab.js` | L64 | **PRESENTATIONAL** | `font-weight: 700; font-size: 1rem; color: var(--text-primary);` |
| `public/js/tabs/action.tab.js` | L65 | **PRESENTATIONAL** | `font-size: 0.78rem; color: var(--text-muted);` |
| `public/js/tabs/action.tab.js` | L73 | **PRESENTATIONAL** | `${isGood ? 'color: #34d399; font-weight: 600;' : ''}` |
| `public/js/tabs/action.tab.js` | L79 | **PRESENTATIONAL** | `${stats.flagged_submissions > 0 ? 'color: #f87171;' : ''}` |
| `public/js/tabs/action.tab.js` | L80 | **PRESENTATIONAL** | `color: #34d399;` |
| `public/js/tabs/action.tab.js` | L88 | **PRESENTATIONAL** | `font-size: 0.72rem; color: var(--text-muted); align-self: center;` |
| `public/js/tabs/action.tab.js` | L95 | **PRESENTATIONAL** | `color: var(--accent-cyan); font-weight: 600;` |
| `public/js/tabs/action.tab.js` | L120 | **PRESENTATIONAL** | `color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;` |
| `public/js/tabs/action.tab.js` | L131 | **PRESENTATIONAL** | `margin-bottom: 24px;` |
| `public/js/tabs/action.tab.js` | L137 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-muted);` |
| `public/js/tabs/action.tab.js` | L144 | **PRESENTATIONAL** | `text-align: center; padding: 48px; color: var(--text-muted); grid-column: 1 / -1;` |
| `public/js/tabs/action.tab.js` | L189 | **PRESENTATIONAL** | `color: var(--accent-rose); padding: 24px; text-align: center; grid-column: 1 / -1;` |
| `public/js/tabs/action.tab.js` | L226 | **PRESENTATIONAL** | `background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 48px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;` |
| `public/js/tabs/action.tab.js` | L227 | **PRESENTATIONAL** | `font-size: 2.2rem; margin-bottom: 12px;` |
| `public/js/tabs/action.tab.js` | L228 | **PRESENTATIONAL** | `color: var(--text-primary); margin-bottom: 6px;` |
| `public/js/tabs/action.tab.js` | L229 | **PRESENTATIONAL** | `font-size: 0.88rem;` |
| `public/js/tabs/action.tab.js` | L288 | **PRESENTATIONAL** | `padding: 48px; text-align: center; color: var(--text-muted);` |
| `public/js/tabs/action.tab.js` | L304 | **PRESENTATIONAL** | `color: var(--accent-rose); margin-top: 24px;` |
| `public/js/tabs/action.tab.js` | L347 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 16px;` |
| `public/js/tabs/action.tab.js` | L348 | **PRESENTATIONAL** | `width: 52px; height: 52px; font-size: 1.25rem;` |
| `public/js/tabs/action.tab.js` | L352 | **PRESENTATIONAL** | `font-size: 1.35rem; font-weight: 700; color: var(--text-primary);` |
| `public/js/tabs/action.tab.js` | L353 | **PRESENTATIONAL** | `font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;` |
| `public/js/tabs/action.tab.js` | L358 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 12px; flex-wrap: wrap;` |
| `public/js/tabs/action.tab.js` | L359 | **PRESENTATIONAL** | `padding: 6px 12px; font-size: 0.8rem;` |
| `public/js/tabs/action.tab.js` | L360 | **PRESENTATIONAL** | `${stats.flagged_submissions > 0 ? 'color: #f87171;' : ''}` |
| `public/js/tabs/action.tab.js` | L360 | **PRESENTATIONAL** | `color: #34d399;` |
| `public/js/tabs/action.tab.js` | L371 | **PRESENTATIONAL** | `font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; ${isGood ? 'color: #34d399;' : 'color: #fda4af;'}` |
| `public/js/tabs/action.tab.js` | L374 | **PRESENTATIONAL** | `font-size: 0.92rem; color: #cbd5e1; line-height: 1.7; background: #090d16; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 18px; white-space: pre-wrap;` |
| `public/js/tabs/action.tab.js` | L385 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;` |
| `public/js/tabs/action.tab.js` | L388 | **FUNCTIONAL** | `display: flex; flex-direction: column; gap: 8px;` |
| `public/js/tabs/action.tab.js` | L390 | **PRESENTATIONAL** | `background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; padding: 10px 14px; font-size: 0.88rem; color: #fecdd3;` |
| `public/js/tabs/action.tab.js` | L403 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;` |
| `public/js/tabs/action.tab.js` | L406 | **FUNCTIONAL** | `display: flex; flex-direction: column; gap: 8px;` |
| `public/js/tabs/action.tab.js` | L408 | **FUNCTIONAL** | `display: flex; align-items: flex-start; gap: 10px; background: #090d16; border: 1px solid var(--border-subtle); border-radius: 4px; padding: 10px 14px; font-size: 0.88rem; color: #e2e8f0;` |
| `public/js/tabs/action.tab.js` | L409 | **PRESENTATIONAL** | `color: var(--accent-cyan); font-weight: 700;` |
| `public/js/tabs/action.tab.js` | L421 | **PRESENTATIONAL** | `font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;` |
| `public/js/tabs/action.tab.js` | L426 | **PRESENTATIONAL** | `color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;` |
| `public/js/tabs/action.tab.js` | L428 | **FUNCTIONAL** | `display: flex; flex-direction: column; gap: 10px;` |
| `public/js/tabs/action.tab.js` | L437 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;` |
| `public/js/tabs/action.tab.js` | L438 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/action.tab.js` | L439 | **PRESENTATIONAL** | `font-size: 0.76rem; font-weight: 700; color: ${isFlagged ? '#f87171' : '#34d399'};` |
| `public/js/tabs/action.tab.js` | L442 | **PRESENTATIONAL** | `font-size: 0.74rem; color: var(--text-muted);` |
| `public/js/tabs/action.tab.js` | L447 | **PRESENTATIONAL** | `font-size: 0.86rem; color: #cbd5e1; margin-bottom: 6px;` |
| `public/js/tabs/action.tab.js` | L451 | **PRESENTATIONAL** | `background: rgba(220, 38, 38, 0.12); border-left: 2px solid #dc2626; padding: 6px 10px; border-radius: 2px; font-size: 0.78rem; color: #fca5a5;` |
| `public/js/tabs/action.tab.js` | L466 | **PRESENTATIONAL** | `font-size: 0.76rem; background: var(--bg-surface-elevated); color: var(--text-secondary); padding: 2px 8px; border-radius: 12px;` |
| `public/js/tabs/action.tab.js` | L472 | **FUNCTIONAL** | `display: flex; flex-direction: column; gap: 10px; margin-top: 14px;` |
| `public/js/tabs/action.tab.js` | L474 | **PRESENTATIONAL** | `color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;` |
| `public/js/tabs/action.tab.js` | L479 | **FUNCTIONAL** | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;` |
| `public/js/tabs/action.tab.js` | L480 | **FUNCTIONAL** | `display: flex; align-items: center; gap: 8px;` |
| `public/js/tabs/action.tab.js` | L481 | **PRESENTATIONAL** | `font-size: 0.86rem; color: var(--text-primary);` |
| `public/js/tabs/action.tab.js` | L482 | **PRESENTATIONAL** | `font-size: 0.74rem; color: var(--text-muted);` |
| `public/js/tabs/action.tab.js` | L484 | **PRESENTATIONAL** | `font-size: 0.72rem; color: var(--text-muted);` |
| `public/js/tabs/action.tab.js` | L486 | **PRESENTATIONAL** | `font-size: 0.88rem; color: #cbd5e1; line-height: 1.5; white-space: pre-wrap;` |
| `public/js/tabs/action.tab.js` | L494 | **PRESENTATIONAL** | `margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-subtle);` |
| `public/js/tabs/action.tab.js` | L496 | **PRESENTATIONAL** | `font-size: 0.86rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;` |
| `public/js/tabs/action.tab.js` | L499 | **PRESENTATIONAL** | `background: #090d16;` |
| `public/js/tabs/action.tab.js` | L500 | **FUNCTIONAL** | `display: flex; justify-content: flex-end; margin-top: 10px;` |
| `public/js/tabs/action.tab.js` | L501 | **PRESENTATIONAL** | `font-size: 0.84rem; padding: 8px 18px;` |
| `public/js/tabs/action.tab.js` | L506 | **PRESENTATIONAL** | `background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 12px 16px; font-size: 0.84rem; color: #fbbf24;` |
| `public/js/tabs/action.tab.js` | L587 | **PRESENTATIONAL** | `margin-top: 40px;` |
| `public/js/tabs/action.tab.js` | L588 | **PRESENTATIONAL** | `font-size: 1.5rem;` |
| `public/js/tabs/action.tab.js` | L591 | **PRESENTATIONAL** | `margin-top: 4px;` |

---

## 3. Hardcoded Color Literals Inventory

The following 65 hardcoded color literals were identified in `index.html` and `public/js/tabs/*.js`. In future phases, these should map to the **TrueTone Design System Tokens** (Canvas `#ECEAE3`, Paper `#FFFFFF`, Sidebar `#FBFAF7`, Ink `#17171B`, Ink-2 `#55555E`, Ink-3 `#8A8A93`, Line `#E4E1D8`, Fill `#F2F0EA`, Azure `#27A9E1`, Pass `#2F9D6C`, Caution `#C98A1E`, Violation `#D2453D`):

### Hex Codes (33)

```text
#000  #039  #059669  #060911  #06B6D4  #090D16  #0A0F1D  #10B981  #34D399  #38BDF8  #60A5FA  #64748B  #6EE7B7  #93C5FD  #94A3B8  #CBD5E1  #D1FAE5  #DC2626  #E2E8F0  #EF4444  #F43F5E  #F59E0B  #F87171  #F8FAFC  #FBBF24  #FCA5A5  #FDA4AF  #FDE68A  #FECDD3  #FF5277  #FF6B81  #FF8FA3  #FFF
```

### RGB / RGBA Values (32)

```text
rgba(0, 0, 0, 0.4)
rgba(0, 0, 0, 0.45)
rgba(0,0,0,0.3)
rgba(0,0,0,0.35)
rgba(0,0,0,0.4)
rgba(0,0,0,0.6)
rgba(15, 23, 42, 0.8)
rgba(16, 185, 129, 0.1)
rgba(16, 185, 129, 0.15)
rgba(16, 185, 129, 0.2)
rgba(16, 185, 129, 0.25)
rgba(16, 185, 129, 0.3)
rgba(220, 38, 38, 0.12)
rgba(220, 38, 38, 0.15)
rgba(239, 68, 68, 0.08)
rgba(239, 68, 68, 0.2)
rgba(239, 68, 68, 0.3)
rgba(245, 158, 11, 0.1)
rgba(245, 158, 11, 0.15)
rgba(245, 158, 11, 0.25)
rgba(255, 132, 0, 0.3)
rgba(255, 255, 255, 0.1)
rgba(255, 82, 119, 0.15)
rgba(255, 82, 119, 0.2)
rgba(255, 82, 119, 0.4)
rgba(255,255,255,0.08)
rgba(255,255,255,0.1)
rgba(56, 189, 248, 0.15)
rgba(56, 189, 248, 0.2)
rgba(6, 182, 212, 0.09)
rgba(6, 182, 212, 0.12)
rgba(8, 14, 28, 0.85)
```
