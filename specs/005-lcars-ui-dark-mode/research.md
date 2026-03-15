# Research: LCARS-Inspired UI with Dark Mode

**Feature Branch**: `005-lcars-ui-dark-mode` | **Date**: 2026-03-15 | **Status**: Complete

---

## Topic 1: Tailwind CSS v4 Dark Mode (Class-based)

### The `@custom-variant dark` Directive

In Tailwind CSS v4, there is **no `tailwind.config.js`**. Dark mode configuration is done entirely in CSS using the `@custom-variant` directive.

**Default behavior** (media-query-based): By default, the `dark:` variant uses `prefers-color-scheme: dark`. No configuration needed.

**Class-based toggling**: To switch to class-based dark mode, add this single line to the CSS file (after `@import "tailwindcss"`):

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

This replaces the v3-era `darkMode: 'class'` in `tailwind.config.js`.

**How the selector works**: The `&:where(.dark, .dark *)` selector means:
- `.dark` — matches the element itself if it has the `dark` class
- `.dark *` — matches any descendant of an element with the `dark` class
- `:where()` keeps specificity at zero, so `dark:` utilities don't outweigh regular utilities in specificity wars

### Confirmed: `class="dark"` on `<html>`

Yes. Adding `class="dark"` to the `<html>` element activates all `dark:` prefixed utilities throughout the page:

```html
<html class="dark">
  <body>
    <div class="bg-white dark:bg-black">
      <!-- In dark mode, this gets bg-black -->
    </div>
  </body>
</html>
```

### Using `dark:` Prefix in JSX/HTML

Works identically to any other Tailwind variant — prefix any utility class:

```jsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 className="text-blue-600 dark:text-blue-400">Title</h1>
  <p className="border-gray-200 dark:border-gray-700">Content</p>
</div>
```

### Using `@variant dark` in `@layer` Blocks for Custom Component Styles

For custom CSS in `@layer components` or elsewhere, use the `@variant` directive to apply dark mode styles:

```css
@layer components {
  .my-element {
    background: white;
    color: var(--color-gray-900);
    
    @variant dark {
      background: black;
      color: var(--color-gray-100);
    }
  }
}
```

This compiles to the appropriate selector based on the `@custom-variant dark` definition. If class-based dark mode is configured, it compiles to `.dark .my-element` (via the `:where()` wrapper). Variants can be nested for combinations:

```css
.my-element {
  background: white;
  @variant dark {
    background: black;
    @variant hover {
      background: gray;
    }
  }
}
```

### Data Attribute Alternative

If you prefer a data attribute instead of a class:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Then use `<html data-theme="dark">` instead of `class="dark"`. **Recommendation for this project: use the `class="dark"` approach** since it's the most common pattern and matches the Tailwind docs' primary example.

---

## Topic 2: Tailwind CSS v4 Custom Color Tokens

### The `@theme` Directive

In v4, custom design tokens are defined using `@theme` in CSS, replacing the `theme.extend.colors` object from v3's config file:

```css
@import "tailwindcss";

@theme {
  --color-lcars-amber: oklch(0.78 0.16 70);
  --color-lcars-orange: oklch(0.72 0.19 52);
  --color-lcars-peach: oklch(0.82 0.12 55);
  --color-lcars-purple: oklch(0.55 0.22 295);
  --color-lcars-blue: oklch(0.62 0.17 255);
  --color-lcars-bg: oklch(0.98 0.005 260);
}
```

### How Theme Tokens Map to Utility Classes

Any `--color-*` theme variable **automatically** generates corresponding utility classes across all color-using utilities:

| Theme Variable | Generated Utilities |
|---|---|
| `--color-lcars-amber` | `bg-lcars-amber`, `text-lcars-amber`, `border-lcars-amber`, `fill-lcars-amber`, `ring-lcars-amber`, etc. |
| `--color-lcars-purple` | `bg-lcars-purple`, `text-lcars-purple`, `border-lcars-purple`, etc. |

Usage in JSX:
```jsx
<div className="bg-lcars-amber text-lcars-bg border-lcars-purple">
```

### Colors That Change Between Light/Dark Mode

There are two approaches:

**Approach A: Use `dark:` variant on utilities (recommended for this project)**

Define separate light and dark color tokens in `@theme`, then apply them with `dark:` prefixes:

```css
@theme {
  /* Light mode palette */
  --color-lcars-amber: oklch(0.78 0.16 70);
  --color-lcars-amber-dark: oklch(0.72 0.14 70);
  
  /* Semantic surface colors */
  --color-surface: oklch(0.98 0.005 260);
  --color-surface-dark: oklch(0.15 0.02 260);
}
```

```jsx
<div className="bg-surface dark:bg-surface-dark">
```

**Approach B: CSS custom properties that swap via `.dark` class**

Define CSS custom properties (not `@theme` tokens) that change under `.dark`:

```css
:root {
  --bg-page: oklch(0.98 0.005 260);
  --text-primary: oklch(0.15 0.02 260);
}

.dark {
  --bg-page: oklch(0.12 0.02 260);
  --text-primary: oklch(0.93 0.01 260);
}
```

Then reference these in `@theme` with the `inline` option, or use them in custom CSS / arbitrary values:

```jsx
<div className="bg-[var(--bg-page)] text-[var(--text-primary)]">
```

**Recommendation**: Approach A is more idiomatic for Tailwind v4. Define all color variants in `@theme` and use `dark:` prefixes. This gives full utility class support and is more discoverable.

### Overriding Default Colors

To remove Tailwind's default color palette and only use custom colors:

```css
@theme {
  --color-*: initial;  /* Removes ALL default colors */
  
  /* Then define only your custom colors */
  --color-lcars-amber: oklch(0.78 0.16 70);
  /* ... */
}
```

For this project, it's better to **extend** (keep defaults) rather than override, since the default gray/slate palettes are useful for wiki content.

---

## Topic 3: FOUC Prevention Pattern for Vite SPAs

### The Problem

When a Vite + React SPA loads:
1. HTML is parsed (no `dark` class yet)
2. CSS loads (styles render for light mode)
3. JavaScript bundle loads
4. React mounts, reads localStorage, applies `dark` class

Between steps 2 and 4, the user sees a flash of light mode even if they selected dark — this is FOUC (Flash of Unstyled/Wrong Content).

### The Solution: Inline `<script>` in `<head>`

Add a **synchronous inline script** in `index.html` `<head>` that runs before any CSS paints:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Memory Alpha</title>
    <script>
      // FOUC prevention: apply theme class before first paint
      (function() {
        var theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Key Details

1. **Must be synchronous** — no `type="module"`, no `defer`, no `async`. Just a plain `<script>` tag in `<head>`.
2. **Must be inline** — cannot be an external file (would be a network request, defeating the purpose).
3. **Must be before any `<link>` to CSS** — though with Vite's `@tailwindcss/vite` plugin, CSS is injected via JS modules, so placing the script in `<head>` before `<body>` is sufficient.
4. **Runs before first paint** — the browser's HTML parser executes synchronous scripts before rendering, so the `dark` class is on `<html>` before any CSS rules evaluate.

### Handling the Three States

The script maps the three user choices (light / dark / auto) to two outcomes (dark class present or not):

| localStorage `theme` | System Preference | Result |
|---|---|---|
| `"dark"` | (ignored) | `dark` class added |
| `"light"` | (ignored) | No `dark` class |
| absent/`"auto"` | Dark | `dark` class added |
| absent/`"auto"` | Light | No `dark` class |

### How the "Auto" Case Works

```js
window.matchMedia('(prefers-color-scheme: dark)').matches
```

This synchronously returns a boolean indicating the current OS theme. No async operations needed.

For **real-time tracking** of OS preference changes (P3 requirement), the React theme hook will set up a `matchMedia` listener:

```js
const mq = window.matchMedia('(prefers-color-scheme: dark)');
mq.addEventListener('change', (e) => {
  // Only respond if user preference is 'auto'
  if (!localStorage.getItem('theme')) {
    document.documentElement.classList.toggle('dark', e.matches);
  }
});
```

### Keeping the Inline Script in Sync with React

The React `useTheme` hook should read the same localStorage key (`theme`) and call `document.documentElement.classList.toggle('dark', isDark)` when the user changes their preference. Both the inline script and React read/write the same source of truth.

---

## Topic 4: LCARS-Inspired Color Palette (Legally Distinct)

### Reference: LCARS Classic Theme Colors (DO NOT COPY)

The canonical LCARS colors from the TheLCARS.com color guide include:

| Name | Hex | Description |
|---|---|---|
| african-violet | #cc99ff | Purple/lavender |
| gold | #ffaa00 | Bright gold |
| golden-orange | #ff9900 | Deep gold |
| orange | #ff8800 | Pure orange |
| butterscotch | #ff9966 | Orange-peach |
| almond | #ffaa90 | Peach-pink |
| sunflower | #ffcc99 | Light peach |
| blue | #5566ff | Medium blue |
| sky | #aaaaff | Light blue |
| ice | #99ccff | Ice blue |
| lilac | #cc55ff | Bright purple |
| moonlit-violet | #9966ff | Deep violet |
| peach | #ff8866 | Peach |
| gray | #666688 | Blue-gray |
| space-white | #f5f6fa | Off-white |

### Legal Considerations

CBS Studios holds copyright on LCARS. To be legally distinct:
- Do **not** copy exact hex values
- Do **not** use the names "LCARS", "Okudagram", or any Star Trek trademarks
- Do **not** replicate the exact layout proportions
- **Do** create an original palette that evokes a similar aesthetic using shifted hues, different saturation/lightness
- **Do** use original element names (not "LCARS panel" — use "command panel" or "interface bar", etc.)

### Proposed Legally Distinct Color Palette

The following palette is **original** — values are shifted in hue, saturation, and lightness from the LCARS reference to be distinct while maintaining the same warm amber/orange + cool purple/blue aesthetic.

Colors are defined in **oklch** format (Tailwind v4's preferred format for perceptual uniformity).

#### Light Mode Palette

| Token Name | oklch Value | Hex Approx | Usage | Contrast on White (#fafbfe) |
|---|---|---|---|---|
| `--color-lcars-amber` | `oklch(0.75 0.155 75)` | ~#D4A030 | Primary bars, buttons | 3.2:1 (large text OK) |
| `--color-lcars-sunset` | `oklch(0.68 0.185 50)` | ~#D07030 | Secondary accent, active states | 4.0:1 (large text AA) |
| `--color-lcars-peach` | `oklch(0.82 0.09 60)` | ~#D8B888 | Tertiary bars, subtle elements | - |
| `--color-lcars-mars` | `oklch(0.62 0.22 35)` | ~#C84020 | Alerts, important actions | 5.4:1 (AA) |
| `--color-lcars-violet` | `oklch(0.52 0.2 300)` | ~#8838C8 | Navigation bars, headers | 6.5:1 (AA) |
| `--color-lcars-lilac` | `oklch(0.72 0.14 300)` | ~#BC88E0 | Secondary purple elements | 3.1:1 (large text) |
| `--color-lcars-blue` | `oklch(0.58 0.16 260)` | ~#4870D0 | Links, interactive elements | 5.0:1 (AA) |
| `--color-lcars-ice` | `oklch(0.80 0.08 240)` | ~#90B8E8 | Info panels, highlights | - |
| `--color-lcars-gray` | `oklch(0.45 0.03 265)` | ~#5C5C78 | Text secondary, inactive | 7.0:1 (AAA) |
| `--color-lcars-black` | `oklch(0.18 0.02 265)` | ~#1C1C28 | Primary text | 15.5:1 (AAA) |
| `--color-lcars-bg` | `oklch(0.98 0.005 265)` | ~#F8F8FC | Page background | - |
| `--color-lcars-surface` | `oklch(0.95 0.008 265)` | ~#EDEDF4 | Card/panel background | - |

#### Dark Mode Palette

| Token Name | oklch Value | Hex Approx | Usage | Contrast on Dark (#121218) |
|---|---|---|---|---|
| `--color-lcars-amber-d` | `oklch(0.78 0.155 75)` | ~#E0AA38 | Primary bars, buttons | 8.5:1 (AAA) |
| `--color-lcars-sunset-d` | `oklch(0.72 0.175 50)` | ~#D88040 | Secondary accent | 6.8:1 (AA) |
| `--color-lcars-peach-d` | `oklch(0.78 0.08 60)` | ~#C8A878 | Tertiary bars | 7.5:1 (AA) |
| `--color-lcars-mars-d` | `oklch(0.66 0.20 35)` | ~#D85030 | Alerts | 5.5:1 (AA) |
| `--color-lcars-violet-d` | `oklch(0.68 0.18 300)` | ~#B070E0 | Navigation bars | 5.8:1 (AA) |
| `--color-lcars-lilac-d` | `oklch(0.76 0.13 300)` | ~#C898E8 | Secondary purple | 7.5:1 (AA) |
| `--color-lcars-blue-d` | `oklch(0.70 0.14 260)` | ~#6898E0 | Links, interactive | 6.2:1 (AA) |
| `--color-lcars-ice-d` | `oklch(0.75 0.07 240)` | ~#88A8D0 | Info panels | 6.8:1 (AA) |
| `--color-lcars-gray-d` | `oklch(0.65 0.025 265)` | ~#9090A0 | Text secondary | 4.8:1 (AA) |
| `--color-lcars-text-d` | `oklch(0.93 0.01 265)` | ~#E8E8F0 | Primary text | 15.0:1 (AAA) |
| `--color-lcars-bg-d` | `oklch(0.13 0.02 265)` | ~#121218 | Page background | - |
| `--color-lcars-surface-d` | `oklch(0.18 0.025 265)` | ~#1E1E2C | Card/panel background | - |

#### Color Strategy Notes

1. **Ambers/Oranges** (hue 50-80°): Shifted from LCARS's pure yellow-orange (hue ~45-50°) toward warmer gold tones (hue ~60-75°). Lower chroma than LCARS originals.
2. **Purples** (hue ~300°): LCARS uses bright saturated violet (#cc99ff, #cc55ff). This palette uses more muted, blue-shifted purples with lower chroma.
3. **Blues** (hue ~240-260°): LCARS uses a narrow range (#5566ff, #aaaaff). This palette spreads across a wider hue range with lower saturation.
4. **Backgrounds**: LCARS classic uses `#f5f6fa` (space-white) for light and pure black `#000000` for dark. This palette uses slightly warm-tinted near-whites and tinted dark backgrounds (not pure black).
5. **WCAG AA compliance**: All text color combinations target ≥ 4.5:1 contrast for normal text, ≥ 3:1 for large text (18px+ or 14px+ bold). Contrast ratios listed above are approximate and should be verified with a contrast checker during implementation.
6. **oklch format**: Using oklch ensures perceptually uniform lightness steps between light and dark variants. This is the native format for Tailwind v4 default colors.

#### Semantic Color Mapping (Recommended)

Rather than using the palette colors directly everywhere, define semantic aliases:

```css
@theme {
  /* Palette */
  --color-lcars-amber: oklch(0.75 0.155 75);
  --color-lcars-sunset: oklch(0.68 0.185 50);
  /* ... all palette colors ... */
}

:root {
  /* Semantic mappings (swap in .dark) */
  --lcars-bar-primary: var(--color-lcars-amber);
  --lcars-bar-secondary: var(--color-lcars-violet);
  --lcars-nav-bg: var(--color-lcars-violet);
  --lcars-text: var(--color-lcars-black);
  --lcars-page-bg: var(--color-lcars-bg);
}

.dark {
  --lcars-bar-primary: var(--color-lcars-amber-d);
  --lcars-bar-secondary: var(--color-lcars-violet-d);
  --lcars-nav-bg: var(--color-lcars-violet-d);
  --lcars-text: var(--color-lcars-text-d);
  --lcars-page-bg: var(--color-lcars-bg-d);
}
```

**However**, for this project the simpler Approach A from Topic 2 (using `dark:` prefix with explicit color names) is recommended — it avoids an extra layer of indirection and is more idiomatic Tailwind.

---

## Topic 5: Accessible Hamburger Menu Pattern

### Button Requirements (ARIA)

The hamburger button **must** be a `<button>` element (not a `<div>` or `<span>`) with these attributes:

```jsx
<button
  type="button"
  aria-expanded={isOpen}           // boolean: true when menu is open
  aria-controls="mobile-nav-menu"  // ID of the menu it toggles
  aria-label="Navigation menu"     // or "Open menu" / "Close menu"
  onClick={() => setIsOpen(!isOpen)}
  className="md:hidden ..."
>
  {/* Hamburger icon or X icon based on isOpen */}
</button>
```

Key attributes:

| Attribute | Purpose |
|---|---|
| `aria-expanded="false/true"` | Tells screen readers whether the controlled menu is currently open or collapsed |
| `aria-controls="mobile-nav-menu"` | Associates the button with the element it controls (the nav panel) |
| `aria-label` | Provides an accessible name since the button only contains an icon |
| `type="button"` | Prevents form submission if nested in a form |

The menu panel it controls:

```jsx
<nav
  id="mobile-nav-menu"
  role="navigation"
  aria-label="Mobile navigation"
  className={isOpen ? "block" : "hidden"}
>
  {/* Navigation links */}
</nav>
```

### Focus Management Considerations

1. **Focus on open**: When the menu opens, focus should move to the first interactive element inside the menu (first nav link), or to the nav container itself (with `tabIndex={-1}`). This ensures keyboard users don't have to tab through the entire page to reach the menu content.

2. **Focus trapping** (optional but recommended for overlay menus): If the menu overlays content:
   - Tab from the last link should cycle back to the first link (or the close button)
   - Shift+Tab from the first link should go to the close button/last link
   - Implementation pattern:
   ```jsx
   // On keydown within the menu
   function handleKeyDown(e: React.KeyboardEvent) {
     if (e.key === 'Escape') {
       setIsOpen(false);
       buttonRef.current?.focus(); // Return focus to trigger
       return;
     }
     if (e.key === 'Tab') {
       const focusable = menuRef.current?.querySelectorAll(
         'a, button, [tabindex]:not([tabindex="-1"])'
       );
       if (!focusable?.length) return;
       const first = focusable[0] as HTMLElement;
       const last = focusable[focusable.length - 1] as HTMLElement;
       if (e.shiftKey && document.activeElement === first) {
         e.preventDefault();
         last.focus();
       } else if (!e.shiftKey && document.activeElement === last) {
         e.preventDefault();
         first.focus();
       }
     }
   }
   ```

3. **Focus on close**: When the menu closes, focus **must** return to the hamburger button that opened it. This is critical — without it, focus is lost and keyboard users are stranded.

4. **Escape key**: Pressing `Escape` should close the menu and return focus to the trigger button.

### For a Non-Overlay (Slide-Down) Menu

If the menu simply pushes content down (not overlay), focus trapping is **not** required — only `aria-expanded`, `Escape` to close, and focus return. This is simpler and may be appropriate for this project's mobile nav.

### Animation / Transition Considerations

Per the spec: **theme transitions are instantaneous** (FR-007), but **menu open/close can animate**.

Recommended CSS transition for menu reveal:

```css
/* Slide-down animation for mobile menu */
.mobile-nav {
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease-out;
}

.mobile-nav.open {
  max-height: 500px; /* Generous max */
}
```

Or using Tailwind classes:

```jsx
<nav
  id="mobile-nav-menu"
  className={`
    overflow-hidden transition-all duration-200 ease-out
    ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
  `}
>
```

**Prefers-reduced-motion**: Respect the user's motion preference:

```css
@media (prefers-reduced-motion: reduce) {
  .mobile-nav {
    transition: none;
  }
}
```

Or in Tailwind: `motion-reduce:transition-none`.

### Complete Hamburger Pattern (React + Tailwind)

```tsx
function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="md:hidden p-2"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Icon: hamburger or X */}
      </button>

      <nav
        ref={menuRef}
        id="mobile-nav-menu"
        aria-label="Mobile navigation"
        className={`
          md:hidden overflow-hidden 
          transition-[max-height,opacity] duration-200 ease-out
          motion-reduce:transition-none
          ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <ul>
          <li><a href="/browse">Browse</a></li>
          <li><a href="/categories">Categories</a></li>
          <li><a href="/search">Search</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
      </nav>
    </>
  );
}
```

---

## Summary of Key Decisions

| Topic | Recommendation |
|---|---|
| Dark mode variant | `@custom-variant dark (&:where(.dark, .dark *));` |
| Custom component dark styles | `@variant dark { ... }` inside `@layer components` |
| Color tokens | `@theme` with `--color-lcars-*` in oklch format |
| Light/dark color switching | Use `dark:` prefix utilities (Approach A) — define both light and dark palette tokens in `@theme` |
| FOUC prevention | Synchronous inline `<script>` in `<head>` of `index.html` |
| localStorage key | `"theme"` — values: `"light"`, `"dark"`, or absent for auto |
| Auto mode | Check `matchMedia('(prefers-color-scheme: dark)')` in inline script + `change` event listener in React |
| Color palette | oklch-based legally distinct palette with amber/sunset/peach/violet/blue/ice hues |
| Hamburger menu | `<button>` with `aria-expanded`, `aria-controls`, `Escape` key handling, focus return |
| Menu animation | `max-height` + `opacity` transition, 200ms, with `motion-reduce:transition-none` |
