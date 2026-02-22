# Design System: Kinetic Typography

## Overview

AstroFlim sử dụng **Kinetic Typography** design style - một phong cách bold, năng động với typography làm trung tâm. Mọi element đều cảm thấy alive thông qua motion (marquees), reactive motion (hover states), hoặc scroll-triggered motion.

## Design Philosophy

**Core Principle**: Typography is not decoration—it is the entire visual structure. Text becomes image, headline becomes hero, motion becomes rhythm.

**Aesthetic Vibe**: High-energy brutalism meets kinetic poster design. Confidence through scale. Urgency through motion. Clarity through contrast.

## Color Architecture

### Foundation Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#09090B` | Rich black - `--foreground` | main background |
| `#FAFAFA` | Off-white - primary text |
| `--muted` | `#27272A` | Dark gray - secondary surfaces |
| `--muted-foreground` | `#A1A1AA` | Zinc 400 - body text, descriptions |
| `--accent` | `#DFE104` | Acid yellow - highlights, CTAs |
| `--accent-foreground` | `#000000` | Pure black on accent |
| `--border` | `#3F3F46` | Zinc 700 - structural lines |

### Color Usage

- **Acid yellow** (#DFE104): Dùng sparingly nhưng boldly cho hero text highlights, hover states, focus rings, marquee backgrounds
- **Muted foreground** (Zinc 400): Cho tất cả secondary text
- **Border color**: Cho tất cả structural lines
- **Background numbers & inactive elements**: Trong muted tone để tạo depth layers

### CSS Variables

```css
:root {
  --background: #09090B;
  --foreground: #FAFAFA;
  --muted: #27272A;
  --muted-foreground: #A1A1AA;
  --accent: #DFE104;
  --accent-foreground: #000000;
  --border: #3F3F46;
}
```

## Typography System

### Font Selection

- **Primary**: "Space Grotesk" (preferred - strong geometric shapes)
- **Fallback**: system-ui, sans-serif

### Scale Hierarchy

| Element | Class | Size |
|---------|-------|------|
| Hero/Display | `text-[clamp(3rem,12vw,14rem)]` | Fluid viewport-based |
| Section Headings | `text-5xl md:text-7xl lg:text-8xl` | 48-80px |
| Card Titles | `text-2xl md:text-3xl lg:text-4xl` | 24-48px |
| Body | `text-lg md:text-xl lg:text-2xl` | 18-24px |
| Labels | `text-sm md:text-base` | 14-16px |
| Massive Numbers | `text-[6rem] md:text-[8rem]` | 96-192px |

### Type Treatment Rules

- **ALL display text** (headings, buttons, labels): UPPERCASE
- **Body text**: Normal case for readability
- **Tracking**: `tracking-tighter` on large display, `tracking-tight` on body
- **Leading**: `leading-[0.8]` for display headlines, `leading-tight` for body

## Shape Language

### Border Radius

- **Default**: `0px` - completely sharp corners
- **Exception**: `rounded-sm` (2px) cho subtle softening

### Border Styling

- **Width**: `border-2` (2px) for emphasis, `border` (1px) for subtle
- **Style**: Always solid
- **Color**: Use `border-[#3F3F46]` consistently

### Shadows

- **NO drop shadows** - flat design
- Depth created through color layering

## Component Patterns

### Buttons

```html
<!-- Primary -->
<button class="uppercase tracking-tighter font-bold bg-[#DFE104] text-black hover:scale-105 transition-all">
  CTA Button
</button>

<!-- Outline -->
<button class="uppercase tracking-tighter font-bold border-2 border-[#3F3F46] bg-transparent text-white hover:bg-white hover:text-black transition-all">
  Outline Button
</button>
```

### Cards

```html
<div class="border-2 border-[#3F3F46] bg-[#09090B] p-8 hover:bg-[#DFE104] hover:border-[#DFE104] transition-all group">
  <h3 class="text-3xl uppercase tracking-tighter text-white group-hover:text-black">
    Card Title
  </h3>
  <p class="text-[#A1A1AA] group-hover:text-black/80">
    Description text
  </p>
</div>
```

## Animation System

### Marquees

- Speed: 60-100 cho stats, 30-50 cho testimonials
- No gradients on edges
- Linear easing (constant speed)

### Hover Effects

- **Scale**: Buttons scale 1.05
- **Translation**: Text translate horizontally
- **Color Floods**: Cards invert color scheme (black → yellow)
- **Duration**: 300ms cho smooth transitions

### Scroll Animations

- Parallax scale transforms
- Sticky positioning cho cards
- Opacity reveals

## Responsive Approach

- **Mobile**: Single column, reduced text sizes với clamp()
- **Tablet**: Two-column layouts
- **Desktop**: Three-column, full dramatic scale

Dùng `clamp()` cho hero text để đảm bảo dramatic effect trên mọi device.

## Anti-Patterns

- **Colors**: Không dùng pure black/white, mid-tone grays, gradients
- **Typography**: Không dùng serif, small headings, mixed case
- **Layout**: Không center-align body text, small max-widths
- **Shape**: Không rounded corners > 2px, soft shadows
- **Motion**: Không pause marquees, subtle transitions

## File Structure

```
src/
├── styles/
│   └── globals.css      # Design tokens & base styles
├── layouts/
│   └── Layout.astro     # Font imports & global layout
└── components/          # UI components sử dụng tokens
```

## Implementation Notes

1. Import Space Grotesk font trong `Layout.astro`
2. Update CSS variables trong `globals.css`
3. Extend Tailwind config với custom colors
4. Use `group` classes cho coordinated hover effects
5. Apply `uppercase tracking-tighter` cho all headings & buttons
