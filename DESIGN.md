---
name: Amber
description: Itrium's lists, kept on your device. Graphite with one vein of pink.
colors:
  graphite: '#2b2b2b'
  graphite-surface: '#343434'
  graphite-border: '#474747'
  off-white: '#f2f2f2'
  muted-gray: '#aaaaaa'
  control-edge: '#8a8a8a'
  pastel-pink: '#febfca'
  on-pink: '#2b2b2b'
  paper: '#fafafa'
  paper-surface: '#ffffff'
  paper-border: '#e4e4e4'
  muted-gray-light: '#6b6b6b'
  control-edge-light: '#767676'
  deep-rose: '#c46475'
  cat-rose: '#f59a7f'
  cat-sage: '#a9c9a0'
  cat-sand: '#e6cf98'
  cat-blue: '#9fb5d8'
  cat-teal: '#9dcec7'
  cat-lavender: '#c3b1e1'
  cat-rose-light: '#a8452a'
  cat-sage-light: '#3f7339'
  cat-sand-light: '#7f6216'
  cat-blue-light: '#3a5f93'
  cat-teal-light: '#2f7069'
  cat-lavender-light: '#6a4c9c'
typography:
  headline:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  wordmark:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.75
  body-small:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  meta:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: 'Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: '0.1em'
rounded:
  focus: '4px'
  mark: '2px'
  sm: '6px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '20px'
  xl: '24px'
  2xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.pastel-pink}'
    textColor: '{colors.on-pink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.full}'
    padding: '12px 24px'
  button-secondary:
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.full}'
    padding: '12px 24px'
  button-small:
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.full}'
    padding: '0 16px'
    height: '36px'
  button-icon:
    textColor: '{colors.muted-gray}'
    rounded: '{rounded.full}'
    size: '32px'
  input-field:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '10px 12px'
  task-row:
    textColor: '{colors.off-white}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '8px'
  task-row-hover:
    backgroundColor: '{colors.graphite-surface}'
  nav-item:
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 12px'
    height: '40px'
  nav-item-current:
    backgroundColor: '{colors.graphite-surface}'
  card:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.xl}'
    padding: '20px'
  toast:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.full}'
    padding: '8px 8px 8px 20px'
---

# Design System: Amber

## Overview

**Creative North Star: "Rhodonite in Hand"**

Amber is a piece of rhodonite: dense graphite stone with one pink vein running through it. The
stone is everything you see at rest: graphite page, a slightly lighter graphite card, quiet gray
words. The vein is pastel pink, and it only shows where something matters right now: the one main
action, the box you just ticked, the words your search found, the thing that has focus. Hold the
interface and it should feel calm, cool and solid, with color reserved for meaning.

It is a working surface, used daily and quickly, so density is moderate and the hierarchy is
plain: a page heading, sections marked by a thin colored edge, and rows of tasks. Personality
lives in small tactile moments rather than in decoration: a round checkbox whose tick draws itself
in, a row that lifts into a card under the pointer, an Undo message that slides up from the bottom.
Everything has a reduced-motion version that simply appears.

Dark is the default stone (the `:root` values); light mode is the same stone in daylight, chosen
by the system, with the pink line deepened to deep rose and focus drawn in graphite so both stay
visible on white.

**Key Characteristics:**

- Graphite and off-white, with a single pink accent that always means something.
- Flat surfaces separated by tone and hairline borders; shadows only on what floats.
- Pills for actions, soft corners for containers, round for anything ticked.
- One typeface, Plus Jakarta Sans, at a small set of sizes and weights.
- Every control has an edge people can find (3:1), and every color meets level AA in both modes.

## Colors

A near-monochrome graphite palette (Rhodonite, Itrium's own) with one pastel pink accent and six
muted category colors that help people sort, never decorate.

### Primary

- **Pastel Pink** (`pastel-pink`): the vein. The primary button, the quick add's Add button, a
  ticked checkbox's fill, search highlights, text selection, and the focus outline in dark mode.
  Text on it is always graphite (`on-pink`), never white.
- **Deep Rose** (`deep-rose`): pink drawn as a line in light mode, where pastel pink is 1.5:1 on
  white. The edge of pink buttons and ticked boxes, and the left edge of a warning notice.

### Neutral

- **Graphite** (`graphite`): the dark page, and the text color in light mode and on pink.
- **Graphite Surface** (`graphite-surface`): cards, sheets, the Undo message, a hovered row, the
  current sidebar item.
- **Graphite Border** (`graphite-border`): hairlines that divide and that nothing depends on
  (card edges, the footer rule, the sheet header).
- **Control Edge** (`control-edge`, light `control-edge-light`): the edge of a field or button,
  which people need to see to find it; 3:1 against both the page and a card.
- **Off-White** (`off-white`): text on graphite.
- **Muted Gray** (`muted-gray`, light `muted-gray-light`): secondary text, counts, hints, idle
  icon buttons.
- **Paper / Paper Surface / Paper Border** (`paper`, `paper-surface`, `paper-border`): the light
  mode's page, card and hairline.

### Category colors

Coral, Sage, Sand, Blue, Teal and Lavender (`cat-*`, with deeper `cat-*-light` versions for light
mode). Coral is saved as `rose` in existing lists, so the key stays; it moved off pink's hue so it
can't be taken for the accent. Each reaches 4.5:1 on the page and on cards in both modes. They appear as small dots
(8–10px) beside a tag or category, and as the 2px left edge of a section heading. Never as fills
behind text.

### Named Rules

**The One Vein Rule.** Pink marks one kind of thing at a time: the primary action, the ticked
state, the found words, or focus. It is never decoration, never a background wash, never a
heading color. If a screen has two pink buttons, one of them is wrong.

**The Graphite-on-Pink Rule.** Text on pink is graphite. Pastel pink is never text on a light
background.

**The No Pink Category Rule.** Pink is not a category color; it would compete with focus and the
main action.

**The Graphite Chosen Rule.** Something chosen (a tag on a task, the Any/Open/Done switch) fills
with the text color and shows a check. Pink stays for ticked, found, focused and the main action.

## Typography

**Body Font:** Plus Jakarta Sans Variable (with ui-sans-serif, system-ui, sans-serif), served
from Amber's own site.

**Character:** a single humanist geometric sans from Jakarta's Tokotype, used at every role. It
is friendly at text sizes and tightens neatly when bold for headings. No second typeface.

### Hierarchy

- **Headline** (700, 1.875rem, tight tracking): the current list's name at the top of the page.
  One per page.
- **Wordmark** (700, 1.25rem, tight tracking): "Amber" in the header.
- **Title** (600, 1rem): sheet titles; card headings step up to 1.125rem.
- **Body** (400, 1rem, 1.75 line height): task titles, the thing people actually read.
- **Body Small** (400–600, 0.875rem): buttons, fields, sidebar items, section headings (600),
  notices and the footer.
- **Meta** (400, 0.75rem): the line under a task (done date, category, tags, steps count) and
  hints, in muted gray.
- **Label** (600, 0.75rem, 0.1em tracking, uppercase): sidebar group labels ("Categories",
  "Tags") only.

### Named Rules

**The 16px on Touch Rule.** On a touch screen, fields are 16px text, or Safari zooms the page.

**The Weight Not Size Rule.** Hierarchy inside the list comes from weight and muted color, not
new sizes: a section heading is 0.875rem semibold, not a bigger font.

## Layout

A centered column up to 72rem wide, with 16px gutters on phones and 24px from 640px up. From 768px
a 15rem sidebar (lists, categories, tags, and the quiet actions below them) sits beside the list
with a 32px gap; below that the sidebar moves into a sheet opened from the menu button in the
header.

The header wraps: the wordmark on the left, search taking up to 20rem on the right. The main
column runs headline, notices, the Open/Done switch, quick add, then sections spaced 32px apart.
Rows have 8px padding and 12px between checkbox and text. Spacing follows Tailwind's 4px scale.
The footer sits at the bottom of the page behind a hairline, with generous bottom padding so the
Undo message never covers the last row.

**The Wrap, Don't Squeeze Rule.** Rows and bars use `flex-wrap` with minimum widths in rem. At 200%
text, move buttons, the Add button and the search field drop to their own line; words are never
crushed.

**The 44px Finger Rule.** On a coarse pointer every target reaches 44px, through an invisible
layer around the control, so the drawing and the layout stay the same size.

## Elevation & Depth

Flat by default. Depth at rest is tonal: the page is graphite, a card or hovered row is one step
lighter (`graphite-surface`), and hairline borders separate them. Shadows are reserved for things
that float above the page and will go away.

### Shadow Vocabulary

- **Floating message** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`):
  the Undo message at the bottom of the screen.
- **Sheet** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`, over a `rgb(0 0 0 / 0.5)`
  backdrop): dialogs.

### Named Rules

**The Shadow Means Floating Rule.** Nothing that stays in the page's flow casts a shadow. If it
has a shadow, it is modal or transient.

## Shapes

Three silhouettes, each with a meaning. **Pills** (fully rounded) are actions: buttons, the
Open/Done switch, the Undo message, icon buttons. **Circles** are states: the checkbox, category
and tag dots. **Soft rectangles** are containers and places: cards and sheets at 16px, task rows
at 12px, fields and sidebar items at 8px. Sheets round only the corners that face the page (top
on a phone, left on a wide screen). Focus outlines are 2px, 3px away, with a 4px corner.

## Components

### Buttons

Calm, round, and clearly edged.

- **Shape:** pill (fully rounded).
- **Primary:** pastel pink fill with a deep-rose edge in light mode, graphite text, semibold,
  12px × 24px. One per view. Hover dims to 85% opacity.
- **Secondary:** transparent with a 1px control edge, medium weight; hover fills with the page
  color.
- **Small:** the secondary style at 36px tall and 16px sides, for actions inside notices and
  sheets.
- **Icon:** 32px circle (44px on touch), muted gray, turns text-colored on a page-colored fill
  on hover. Move buttons in a row stay hidden until the row is hovered or focused, and always
  show on touch.
- **Disabled:** 50% opacity, not-allowed cursor.

### Checkbox (signature)

A real checkbox drawn as a 24px circle (20px small) with a 2px control edge. Ticked, it fills
pastel pink with a deep-rose edge and a graphite tick that draws itself in over 300ms (stroke
dash), with the fill fading in over 200ms. Reduced motion shows it at once. The space around it
ticks it too.

### Task Row (signature)

Checkbox, title as a button that opens the task, and a meta line beneath. At rest it has no
background; under the pointer it lifts into a card (surface fill, hairline edge, 12px corners).
Done tasks show muted with a 1px strike-through. Search matches are marked in pink with graphite
text. Rows slide in and out and flip into new order when moved.

### Inputs / Fields

- **Style:** page-colored fill, 1px control edge, 8px corners, 10px × 12px padding, 0.875rem text
  (16px on touch), muted placeholder.
- **Focus:** the global focus outline (pink on graphite, graphite on paper), 3px offset.
- **Search:** a magnifier inside on the left, a clear button inside on the right.

### Cards / Containers

- **Corner Style:** 16px.
- **Background:** `graphite-surface` (`paper-surface` in light).
- **Shadow Strategy:** none; see Elevation.
- **Border:** 1px hairline.
- **Internal Padding:** 20px, 24px from 640px.

### Navigation

The sidebar is a list of places: 40px rows (44px on touch), 8px corners, 0.875rem text, a color
dot for categories, and an open-count in muted tabular figures on the right. Hover fills with the
surface color; the current place keeps that fill and goes semibold. Group labels are small
uppercase tracked muted text. Quiet actions (install, sync, back up, shortcuts) sit below in muted
text. Edit buttons appear on hover or focus, always on touch.

### Sheets

Native modal dialogs. On a phone a sheet rises from the bottom (up to 92% of the height, top
corners rounded); from 640px it is a 28rem panel on the right, full height, left corners rounded.
A sticky header holds the title and a round close button, over a hairline.

### Undo Message

A pill floating 16px above the bottom of the screen: surface fill, control edge, small text, an
underlined Undo and a round dismiss button. It slides up 16px over 200ms, stays while hovered or
focused, and leaves after six seconds. While a sheet is open it shows at the end of that sheet
instead, in its own place rather than floating, since an open dialog makes the page unreachable
and a floating message would cover the sheet's controls. Ctrl or ⌘ with Z undoes there too.

### Section Headings

Small semibold text with a 2px left edge in the category's color (hairline gray without one) and
a matching dot.

## Do's and Don'ts

### Do:

- **Do** take every color from the tokens in `src/app.css`; both modes are defined there.
- **Do** keep pink to one meaning per moment, with graphite text on it and deep rose for pink
  lines in light mode.
- **Do** give every control a 3:1 edge (`control-edge`) and every target 44px on touch.
- **Do** separate surfaces by tone and hairline; add a shadow only to something that floats.
- **Do** pair every transition with `motion-reduce` so it appears instantly instead.
- **Do** use Tailwind classes; inline styles and `data:` URLs are blocked by the
  Content-Security-Policy.

### Don't:

- **Don't** use pink as text on a light background, as decoration, or as a category color.
- **Don't** use black (`#000000`) for text or surfaces; graphite is `#2b2b2b`.
- **Don't** add a second typeface or load fonts from another domain.
- **Don't** put shadows on cards, rows or anything in the page's flow.
- **Don't** squeeze rows at large text; let them wrap.
- **Don't** use category colors as fills behind text.
- **Don't** redraw, recolor or stretch the Itrium logo files; they are copies from the brand
  assets.
