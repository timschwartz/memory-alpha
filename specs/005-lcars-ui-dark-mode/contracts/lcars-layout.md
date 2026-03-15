# UI Contract: LCARS-Inspired Layout

**Feature**: 005-lcars-ui-dark-mode | **Date**: 2026-03-15

## Header Layout Contract

The header is the primary LCARS-inspired navigation element. It appears on every page.

### Desktop Layout (≥ 768px)

```
┌──────────┬────────────────────────┬──────────────────┬───────────────────┐
│ End Cap  │   MEMORY ALPHA         │  Browse  Cat  …  │  [Search...] [Go] │
│ (rounded)│   (title)              │  (nav links)     │  (search bar)     │
└──────────┴────────────────────────┴──────────────────┴───────────────────┘
│                         Horizontal Bar                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **End Cap**: Rounded left element (`rounded-l-full`) with LCARS accent color background
- **Title Area**: App name in bold sans-serif, accent color text
- **Navigation Links**: Browse, Categories, Settings — inline horizontal
- **Search Bar**: Input + button, right-aligned
- **Horizontal Bar**: A thin accent-colored bar below the header row, providing the LCARS horizontal stripe

### Mobile Layout (< 768px)

```
┌──────────┬────────────────────┬─────┐
│ End Cap  │   MEMORY ALPHA     │  ☰  │
│ (rounded)│   (title)          │     │
└──────────┴────────────────────┴─────┘
│             Horizontal Bar           │
├──────────────────────────────────────┤
│  [Search input...              ] [Go]│ (always visible)
├──────────────────────────────────────┤
│  Browse                              │ (hamburger dropdown when open)
│  Categories                          │
│  Settings                            │
└──────────────────────────────────────┘
```

**Mobile changes**:
- Nav links hidden; replaced by hamburger button (`☰`)
- Search bar moves below the header bar (always visible)
- Hamburger opens a slide-down panel with vertical nav links
- End cap element remains for visual identity

## Page Shell Layout Contract

### Desktop

```
┌──────────────────────────────────────────────────────┐
│                      HEADER                           │
├────────┬─────────────────────────────────────────────┤
│ Side   │                                             │
│ Bar    │         MAIN CONTENT AREA                   │
│ (opt.) │         (max-w-5xl, centered)               │
│        │                                             │
├────────┴─────────────────────────────────────────────┤
│           Bottom Bar (accent colored)                │
└──────────────────────────────────────────────────────┘
```

**Elements**:
- **Side Bar** (optional): A narrow vertical LCARS-style bar on the left with rounded bottom end-cap. Used on content pages for visual framing. Not interactive.
- **Main Content Area**: Centered, `max-w-5xl`, padded — retains current layout width
- **Bottom Bar** (optional): A thin accent bar at the bottom of the content area

### Mobile

The side bar is hidden. Full-width content area with smaller padding.

## Panel/Card Contract

Content sections (Settings cards, article content area, browse list) are displayed within LCARS-inspired panels:

```
┌──────────┬───────────────────────────────────────────┐
│ Panel    │                                           │
│ Cap      │   Panel Content                           │
│ (rounded)│                                           │
└──────────┴───────────────────────────────────────────┘
```

**Styling**:
- Light mode: `bg-lcars-surface` with subtle border
- Dark mode: `dark:bg-lcars-surface-d` with subtle border
- Left edge has a rounded accent-colored cap element
- Content is padded inside the panel

## Color Usage Rules

| UI Element | Light Mode | Dark Mode |
|-----------|------------|-----------|
| Page background | `bg-lcars-bg` | `dark:bg-lcars-bg-d` |
| Panel/card background | `bg-lcars-surface` | `dark:bg-lcars-surface-d` |
| Primary text | `text-lcars-black` | `dark:text-lcars-text-d` |
| Secondary text | `text-lcars-gray` | `dark:text-lcars-gray-d` |
| Header end cap | `bg-lcars-violet` | `dark:bg-lcars-violet-d` |
| Header bar | `bg-lcars-amber` | `dark:bg-lcars-amber-d` |
| Navigation link | `text-lcars-blue` | `dark:text-lcars-blue-d` |
| Active nav link | `bg-lcars-sunset` | `dark:bg-lcars-sunset-d` |
| Button primary | `bg-lcars-amber` | `dark:bg-lcars-amber-d` |
| Button hover | `bg-lcars-sunset` | `dark:bg-lcars-sunset-d` |
| Search input border | `border-lcars-lilac` | `dark:border-lcars-lilac-d` |
| Pagination active | `bg-lcars-violet` | `dark:bg-lcars-violet-d` |
| Error state | `bg-lcars-mars` | `dark:bg-lcars-mars-d` |
| Loading spinner | `border-lcars-amber` | `dark:border-lcars-amber-d` |

## Responsive Breakpoint

| Breakpoint | Behavior |
|-----------|----------|
| `< 768px` (below `md:`) | Mobile: hamburger menu, stacked layout, no side bar |
| `≥ 768px` (md: and up) | Desktop: inline nav, side bar visible, full header |

All responsive behaviors use Tailwind's `md:` breakpoint prefix (`768px`).
