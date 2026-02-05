# NC Fish Log Style Guide

A comprehensive design system documentation for the NC Fish Log mobile application.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Border Radius](#border-radius)
6. [Shadows](#shadows)
7. [Components](#components)
8. [Layout Patterns](#layout-patterns)
9. [Icons](#icons)
10. [Usage Examples](#usage-examples)

---

## Design Philosophy

The NC Fish Log app uses an **ocean-themed design system** that evokes the feeling of coastal North Carolina waters. The design combines:

- **Deep ocean blues** for primary actions and branding
- **Coastal teal accents** for secondary elements
- **Pearl white surfaces** for cards and inputs
- **Subtle water-like borders** with depth illusion
- **Skeuomorphic touches** like highlights and shadows for tactile feel

---

## Color System

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| `primary` | `#0B548B` | Primary buttons, headers, links, brand color |
| `primaryDark` | `#063A5D` | Pressed states, gradients, bottom borders |
| `primaryLight` | `#C3E0F7` | Light backgrounds, highlights |

### Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| `secondary` | `#06747F` | Secondary buttons, accents, teal elements |
| `secondaryLight` | `#A2E5EF` | Light teal backgrounds |

### Accent Color

| Name | Hex | Usage |
|------|-----|-------|
| `accent` | `#FF7F25` | Highlights, attention-grabbing elements |

### Status Colors

| Name | Hex | Usage |
|------|-----|-------|
| `success` | `#2E7D4B` | Success states, confirmations, seaweed green |
| `warning` | `#F9A825` | Warnings, caution, life jacket yellow |
| `warningLight` | `#FFF8E1` | Warning backgrounds |
| `error` | `#D32F2F` | Errors, destructive actions, buoy red |
| `danger` | `#D32F2F` | Alias for error |
| `dangerLight` | `#FFEBEE` | Error backgrounds |
| `info` | `#1A7AAD` | Informational messages |

### Neutral Colors

| Name | Hex | Usage |
|------|-----|-------|
| `white` | `#FFFFFF` | Pure white |
| `background` | `#E5F4FF` | App background, subtle watery blue |
| `card` | `#FFFFFF` | Card backgrounds |
| `lightGray` | `#E1F5FE` | Light blue-gray elements |
| `lightestGray` | `#F0F8FF` | Lightest backgrounds |
| `mediumGray` | `#B0BEC5` | Disabled states, muted elements |
| `darkGray` | `#546E7A` | Secondary text, icons |
| `black` | `#263238` | Primary text, nearly black with blue undertone |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| `textPrimary` | `#263238` | Primary body text |
| `textSecondary` | `#546E7A` | Secondary text, captions |
| `textTertiary` | `#78909C` | Placeholders, hints |

### Ocean-Specific Colors

| Name | Hex | Usage |
|------|-----|-------|
| `oceanDeep` | `#042C5C` | Deep shadows, dark accents |
| `oceanSurface` | `#85C5E5` | Water-like borders |
| `sandyShore` | `#F5DEB3` | Sandy/beach elements |
| `coralAccent` | `#FF7F50` | Coral highlights |
| `seaweedGreen` | `#2E8B57` | Nature/success accents |
| `pearlWhite` | `#F5F7F8` | Card surfaces, inputs |
| `seafoamGreen` | `#71EEB8` | Light green accents |

### Utility Colors

| Name | Value | Usage |
|------|-------|-------|
| `border` | `#B2DEF9` | Default borders |
| `divider` | `#D6EBF7` | Divider lines |
| `overlay` | `rgba(3, 37, 65, 0.5)` | Modal overlays |
| `shadow` | `rgba(7, 52, 94, 0.22)` | Shadow color |
| `transparent` | `transparent` | Transparent backgrounds |

---

## Typography

### Type Scale

| Style | Size | Weight | Letter Spacing | Usage |
|-------|------|--------|----------------|-------|
| `largeTitle` | 32px | Bold | 0.25 | Hero titles, splash screens |
| `title` | 24px | Bold | 0 | Page titles |
| `h1` | 28px | Bold | 0.25 | Large headings |
| `h2` | 24px | Bold | 0.15 | Section headings |
| `h3` | 20px | 600 | 0.15 | Card titles |
| `h4` | 18px | 600 | 0.1 | Subsection titles |
| `heading` | 20px | Bold | 0.15 | General headings |
| `subheading` | 18px | 600 | 0.1 | Subheadings |
| `subtitle` | 16px | 500 | 0.15 | Subtitles, meta info |
| `body` | 16px | Normal | 0.5 | Body text (line-height: 24) |
| `bodySmall` | 14px | Normal | 0.25 | Smaller body text (line-height: 20) |
| `caption` | 12px | 400 | 0.4 | Captions, labels |
| `buttonText` | 16px | 600 | 1 | Button labels |
| `buttonTextSmall` | 14px | 600 | 0.75 | Small button labels |
| `sectionTitle` | 18px | 700 | 0.1 | Section headers |

### Font Weights

- **Bold (700)**: Titles, headings, important labels
- **Semi-bold (600)**: Buttons, subheadings, emphasis
- **Medium (500)**: Subtitles, navigation items
- **Regular (400)**: Body text, descriptions

---

## Spacing

The spacing system uses a consistent scale based on multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `xxs` | 4px | Minimal spacing, inline elements |
| `xs` | 8px | Tight spacing, between related elements |
| `sm` | 12px | Small gaps, icon padding |
| `md` | 16px | Standard spacing, card padding |
| `lg` | 24px | Section spacing, larger gaps |
| `xl` | 32px | Major sections, screen padding |
| `xxl` | 48px | Extra large spacing, hero areas |
| `screenHorizontal` | 16px | Standard horizontal screen padding |
| `screenVertical` | 24px | Standard vertical screen padding |

### Spacing Guidelines

- **Card padding**: `spacing.md` (16px)
- **Section margins**: `spacing.lg` (24px)
- **Between cards**: `spacing.md` (16px)
- **Icon to text**: `spacing.sm` (12px)
- **Text line gaps**: `spacing.xs` (8px)

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Small chips, badges |
| `sm` | 8px | Buttons, small cards |
| `md` | 12px | Cards, inputs, modals |
| `lg` | 16px | Large cards, panels |
| `xl` | 24px | Pills, rounded containers |
| `circle` | 9999px | Circular elements, avatars |

---

## Shadows

Shadows use a blue-tinted color (`rgba(7, 52, 94, 0.22)`) to maintain the ocean theme.

### Shadow Levels

**Small Shadow** (iOS)
```javascript
shadowColor: 'rgba(7, 52, 94, 0.22)',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.25,
shadowRadius: 2.0,
// Android: elevation: 3
```

**Medium Shadow** (iOS)
```javascript
shadowColor: 'rgba(7, 52, 94, 0.22)',
shadowOffset: { width: 0, height: 3 },
shadowOpacity: 0.3,
shadowRadius: 4.0,
// Android: elevation: 5
```

**Large Shadow** (iOS)
```javascript
shadowColor: 'rgba(7, 52, 94, 0.22)',
shadowOffset: { width: 0, height: 5 },
shadowOpacity: 0.35,
shadowRadius: 6.5,
// Android: elevation: 10
```

---

## Components

### Buttons

#### Primary Button
- Background: `colors.primary` (#0B548B)
- Text: White
- Border: 1px `colors.primaryDark`, 3px bottom for depth
- Border radius: `borderRadius.md` (12px)
- Padding: 16px vertical, 24px horizontal

#### Secondary Button
- Background: `colors.secondary` (#06747F)
- Text: White
- Same border/depth treatment as primary

#### Outline Button
- Background: Translucent water surface
- Border: 2px `colors.primary`
- Text: `colors.primary`

#### Text Button
- Background: Transparent
- Text: `colors.primary`
- No border

#### Status Buttons
- **Success**: `colors.seaweedGreen` background
- **Warning**: `colors.warning` background, dark text
- **Error**: `colors.error` background

#### Disabled Button
- Background: `colors.mediumGray`
- Text: `colors.darkGray`

### Cards

Cards use a pearl-white background with subtle borders that create depth.

#### Basic Card
```javascript
backgroundColor: colors.pearlWhite,
borderRadius: borderRadius.md, // 12px
padding: spacing.md, // 16px
borderWidth: 1,
borderColor: colors.oceanSurface,
borderTopColor: 'rgba(255, 255, 255, 0.85)', // Pearl highlight
borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep shadow
```

#### Elevated Card
Same as basic, but with:
- `borderBottomWidth: 3`
- `shadows.medium`

#### Highlighted Card (Left Border Accent)
```javascript
borderLeftWidth: 4,
borderLeftColor: colors.primary,
```

#### Status Cards
- **Info**: Light blue background with blue left border
- **Success**: Light green background with green left border
- **Warning**: Light amber background with yellow left border
- **Error**: Light red background with red left border

### Form Inputs

```javascript
height: 52,
borderWidth: 1.5,
borderColor: colors.oceanSurface,
borderRadius: borderRadius.md, // 12px
paddingHorizontal: spacing.md, // 16px
backgroundColor: colors.pearlWhite,
```

#### Focused State
- Border: 2px `colors.primary`
- Light blue tint background

#### Error State
- Border: `colors.error`
- Light red tint background

### Modals

- Background: White or `colors.pearlWhite`
- Border radius: `borderRadius.lg` (16px) at top
- Overlay: `colors.overlay` (rgba(3, 37, 65, 0.5))
- Slide up from bottom animation

---

## Layout Patterns

### Screen Layout
```javascript
flex: 1,
backgroundColor: colors.background, // #E5F4FF
```

### Header
- Background: `colors.primary` (#0B548B)
- Text: White
- Optional: WaveBackground component for subtle pattern

### Content Area
- Horizontal padding: `spacing.screenHorizontal` (16px)
- Card margins: `spacing.md` (16px)

### Footer
- Background: `colors.primaryDark` (#063A5D)
- Text: White/light
- Safe area padding

### Scrollable Lists
- Pull-to-refresh: Tint color `colors.primary`
- Loading indicators: `colors.primary`
- Empty states: Centered, with icon and message

---

## Icons

The app uses **Feather Icons** from `@expo/vector-icons`.

### Common Icon Sizes
- Small: 16px
- Default: 20px
- Medium: 24px
- Large: 32px
- Hero: 48px

### Icon Colors
- On primary background: White
- On light background: `colors.primary` or `colors.darkGray`
- Disabled: `colors.mediumGray`

### Achievement Icons (by category)
| Code | Icon | Color |
|------|------|-------|
| `rewards_entered` | gift | #9C27B0 (Purple) |
| `first_report` | flag | #4CAF50 (Green) |
| `reports_10` | trending-up | #2E7D32 |
| `reports_50` | award | #1B5E20 |
| `reports_100` | star | #004D40 |
| `photo_first` | camera | #E91E63 (Pink) |
| `streak_*` | zap | #FF9800 (Orange) |
| `species_all_5` | list | #2196F3 (Blue) |

---

## Usage Examples

### Importing Styles
```typescript
import { colors, spacing, borderRadius, typography, shadows } from '../styles/common';
```

### Creating Component Styles
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  title: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
});
```

### Gradient Example (License Card)
```typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={[colors.primary, colors.primaryDark]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradientCard}
>
  {/* Content */}
</LinearGradient>
```

### Required/Highlighted State
```typescript
// Full border for required items
requiredCard: {
  borderWidth: 2,
  borderColor: '#00897B', // Teal
},

// Left border accent
highlightedCard: {
  borderLeftWidth: 4,
  borderLeftColor: colors.primary,
},
```

---

## Accessibility Notes

- Maintain minimum touch targets of 44x44px
- Ensure sufficient color contrast (4.5:1 for text)
- Use semantic headings
- Provide alternative text for images
- Support dynamic type sizes where possible

---

## File Structure

```
src/
  styles/
    common.ts          # Core design tokens and shared styles
    homeScreenStyles.ts
    fishingLicenseScreenStyles.ts
    ...
  components/
    *.tsx              # Components with local StyleSheet.create()
  screens/
    *.tsx              # Screens with local StyleSheet.create()
```

---

*This style guide is based on the NC Fish Log app design system as of January 2025.*
