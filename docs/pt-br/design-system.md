# MentisHub Design System

Two themes: **dark** and **light** (primary). Same geometry, different color scales.

---

## Themes

### Dark
| Token | Value |
|---|---|
| `--surface-0` | `#0e1116` |
| `--surface-1` | `#161c22` |
| `--surface-2` | `#1d2530` |
| `--surface-3` | `#2e3844` |
| `--text-primary` | `#fff8ee` |
| `--text-secondary` | `#8899aa` |
| `--amber-primary` | `#f0a818` |
| `--amber-bright` | `#ffc840` |
| `--amber-dim` | `#e09010` |
| `--gold-circuit` | `#c8943a` |
| `--gold-node` | `#f0c060` |
| `--border-subtle` | `rgba(200,168,96,0.12)` |
| `--border-active` | `rgba(240,168,24,0.4)` |
| `--shadow-hub` | `0 0 20px rgba(240,168,24,0.15)` |

### Light
| Token | Value |
|---|---|
| `--surface-0` | `#f5f0e8` |
| `--surface-1` | `#ede8de` |
| `--surface-2` | `#e4ddd2` |
| `--surface-3` | `#d8d0c4` |
| `--surface-inv` | `#0e1116` |
| `--text-primary` | `#1a1f26` |
| `--text-secondary` | `#4a5568` |
| `--text-muted` | `#7a8898` |
| `--amber-primary` | `#c88010` |
| `--amber-bright` | `#d4920c` |
| `--amber-dim` | `#b87808` |
| `--gold-circuit` | `#9a7830` |
| `--gold-node` | `#c88010` |
| `--border-subtle` | `rgba(160,120,40,0.15)` |
| `--border-active` | `rgba(160,120,40,0.4)` |

---

## Typography

| Role | Family | Weight | Usage |
|---|---|---|---|
| Display | `Syne` | 700–800 | h1–h3, wordmark |
| Mono | `Space Mono` | 400–700 | labels, badges, code, metadata |
| Body | `IBM Plex Sans` | 300–500 | paragraphs, UI copy |

```css
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
```

**Scale** (rem, base 16px):
`10px` label · `12px` mono-ui · `13px` body-sm · `16px` body · `20px` h3 · `28–40px` h2 · `48–96px` h1

---

## Spacing & Shape

- Grid: `8px` base unit. All spacing multiples of 8.
- `--radius-sm: 2px` — buttons, badges, inputs
- `--radius-md: 4px` — cards, panels
- No large border-radius. Avoid >8px on structural elements.

---

## Color Usage Rules

1. `--amber-primary` → interactive elements (CTAs, links, focus rings, active state)
2. `--amber-bright` → hub center, hover state (dark theme only)
3. `--gold-circuit` → circuit traces, secondary labels
4. `--gold-node` → data nodes, icon accents
5. Amber used sparingly — concentrated on convergence points, not scattered
6. Dark theme: amber reads as light/glow. Light theme: amber reads as weight/ink.

---

## Components

### Button

```css
.btn {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px 24px;
  border-radius: 2px;
  border: none;
  cursor: pointer;
}

/* Primary */
.btn-primary { background: var(--amber-primary); color: #fff8ee; font-weight: 700; }
.btn-primary:hover { background: var(--amber-bright); }         /* dark */
.btn-primary:hover { background: var(--amber-dim); }            /* light */

/* Secondary */
.btn-secondary {
  background: transparent;
  color: var(--amber-primary);
  border: 1px solid var(--border-active);
}
.btn-secondary:hover { background: rgba(240,168,24,0.06); }     /* dark */
.btn-secondary:hover { background: rgba(160,120,40,0.06); }     /* light */

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

/* Dark inverse (light theme only) */
.btn-dark { background: #0e1116; color: #fff8ee; font-weight: 700; }
```

### Badge

```css
.badge {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Active dot via ::before */
.badge-active::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--amber-primary);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

/* Dark theme */
.badge-amber { background: rgba(240,168,24,0.12); color: var(--amber-bright); border: 1px solid rgba(240,168,24,0.25); }
.badge-muted { background: rgba(46,56,68,0.8);    color: var(--text-secondary); border: 1px solid var(--border-subtle); }

/* Light theme */
.badge-amber { background: rgba(180,130,20,0.1);  color: #b87808; border: 1px solid rgba(180,130,20,0.3); }
.badge-muted { background: var(--surface-2);       color: var(--text-secondary); border: 1px solid var(--border-subtle); }
.badge-dark  { background: #0e1116; color: #aab8c8; }
```

### Input

```css
.input-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gold-circuit);
}

.input-field {
  background: var(--surface-2);        /* dark: --surface-2 | light: --surface-0 */
  border: 1px solid var(--border-active);
  border-radius: 2px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  outline: none;
  width: 100%;
}
.input-field:focus { border-color: var(--amber-primary); }
```

### Card

```css
.card {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

/* Amber top-line accent */
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;   /* 2px on light */
  background: linear-gradient(90deg, transparent, var(--amber-primary), transparent);
  opacity: 0.4;
}

.card-meta {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--amber-primary);
  margin-bottom: 6px;
}

.card-title {
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.card-body { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
```

### Section Label

```css
.section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--amber-primary);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}
.section-label::before {
  content: '';
  width: 24px; height: 1px;
  background: var(--amber-primary);
}
```

---

## Background Treatments

### Grid overlay (both themes)
```css
/* Dark */
background-image:
  linear-gradient(rgba(240,168,24,0.025) 1px, transparent 1px),
  linear-gradient(90deg, rgba(240,168,24,0.025) 1px, transparent 1px);
background-size: 48px 48px;

/* Light */
background-image:
  linear-gradient(rgba(160,120,40,0.06) 1px, transparent 1px),
  linear-gradient(90deg, rgba(160,120,40,0.06) 1px, transparent 1px);
background-size: 48px 48px;
```

### Top-line separator (sections)
```css
border-top: 1px solid var(--border-subtle);
```

---

## Icon / Logo

SVG icon: brain axial view, 500×500 viewBox. Fully symmetric (x-axis: 250).

**Geometry constants:**
- Canvas center: `(250, 250)`
- Left hemisphere: `cx=210 cy=250 rx=88 ry=118`
- Right hemisphere: `cx=290 cy=250 rx=88 ry=118` (mirror)
- Medial sulcus: vertical line `x=250`, `y=134→364`
- Hub center: `(250, 250)` — anel `r=14`, core `r=8`, inner dot `r=3`
- Circuit nodes major: `r=5` · minor: `r=3`
- Circuit traces: stroke `1.5px`, L-shapes orthogonal, clipped to each hemisphere

**Dark palette:** bg `#0e1116→#222830` · sulcus `#f0a818→#ffc840` · brain stroke `#c8a860→#906820` · circuits `#c8943a / #d4a848` · nodes `#f0c060 / #c8943a` · hub fill `#ffc840` · hub dot `#fff8ee`

**Light palette:** bg `#f5f0e8→#eee8dc` · sulcus `#c88010→#d4920c` · brain stroke `#9a7830→#6a5018` · circuits `#9a7830 / #b08030` · nodes `#c88010 / #9a7830` · hub fill `#d4920c` · hub dot `#f5f0e8`

---

## Do / Don't

| Do | Don't |
|---|---|
| Use `Space Mono` for all technical labels | Use `Inter`, `Roboto`, or system fonts |
| Keep amber concentrated on focal points | Scatter amber across the entire UI |
| Use `2px` radius on interactive elements | Use >8px radius on structural elements |
| Dark surface stack: 0→1→2→3 (deeper = darker) | Skip surface levels (creates flat hierarchy) |
| Light surfaces: warm parchment tones | Use cold white (`#ffffff`) as base |
| Amber in light theme: dense/burnt (`#c88010`) | Use bright amber (`#ffc840`) on light backgrounds |
