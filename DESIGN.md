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
    fontSize: '0.6875rem'
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: '0.1em'
rounded:
  focus: '4px'
  mark: '2px'
  plate: '4px'
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
    rounded: '{rounded.sm}'
    padding: '12px 24px'
  button-secondary:
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.sm}'
    padding: '12px 24px'
  button-small:
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '36px'
  button-icon:
    textColor: '{colors.muted-gray}'
    rounded: '{rounded.sm}'
    size: '32px'
  input-field:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '10px 12px'
  tray:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.sm}'
  task-slip:
    textColor: '{colors.off-white}'
    typography: '{typography.body}'
    padding: '10px 12px'
  task-slip-hover:
    backgroundColor: '{colors.graphite-border}'
  specimen:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.sm}'
    padding: '12px'
  label-plate:
    textColor: '{colors.muted-gray}'
    typography: '{typography.label}'
    rounded: '{rounded.plate}'
    padding: '2px 8px'
  drawer:
    backgroundColor: '{colors.graphite-surface}'
    typography: '{typography.body-small}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '40px'
  drawer-current:
    backgroundColor: '{colors.off-white}'
    textColor: '{colors.graphite}'
  search-field:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '10px 40px'
  chip:
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '36px'
  chip-chosen:
    backgroundColor: '{colors.off-white}'
    textColor: '{colors.graphite}'
  notice:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.md}'
    padding: '12px'
  toast:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '8px 8px 8px 20px'
---

# Design System: Amber

## Overview

**Creative North Star: "Rhodonite in Hand", kept in a specimen cabinet**

Amber is a piece of rhodonite: dense graphite stone with one pink vein running through it. The
stone is everything you see at rest: graphite page, a slightly lighter graphite surface, quiet
gray words. The vein is pastel pink, and it only shows where something matters right now: the one
main action, the box you just ticked, the words your search found, the thing that has focus.

The stone is kept the way minerals are, in a specimen cabinet, after the stones Amber and
Rhodonite are named for. Places are drawers, a list's tasks are label slips ruled in a tray, names
of sections are framed labels, and an achieved dream sits on a shelf as a specimen with its
collection label. The cabinet lends type, density, shape and one move; navigation and controls
stay the ones people already know, and the search bar is the familiar one from every list app.

It is a working surface, used daily and quickly, so density is moderate and the hierarchy is
plain: a page heading, framed section labels, trays of slips. Personality lives in small tactile
moments: a round checkbox whose tick draws itself in, a dream carried from the tray onto the
Achieved shelf, an Undo message that slides up from the bottom. Everything has a reduced-motion
version that simply appears.

Dark is the default stone (the `:root` values); light mode is the same stone in daylight, chosen
by the system, with the pink line deepened to deep rose and focus drawn in graphite so both stay
visible on white.

**Key Characteristics:**

- Graphite and off-white, with a single pink accent that always means something.
- Flat surfaces separated by tone and hairline borders; shadows only on what floats.
- Small corners (6px, 4px on labels): drawers, trays and plates, not pills. Round only for what's
  ticked.
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
  white. The edge of pink buttons and ticked boxes.

### Neutral

- **Graphite** (`graphite`): the dark page, and the text color in light mode and on pink.
- **Graphite Surface** (`graphite-surface`): drawers, trays, specimens, sheets and the Undo
  message.
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
can't be taken for the accent. Each reaches 4.5:1 on the page and on cards in both modes. A list's
color names it: a small dot (8–10px) beside a tag or category and on its drawer; its section's
framed label in that color, words, frame and dot; and the edge of each of its tasks' empty
checkboxes, so a task shows which list it's in. Ticked, a box is pink whatever its list. New
categories start with the next color not in use; "No color" stays a choice. Never as fills behind
text, and never as a thick edge on a row or card.

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
- **Label** (600, 0.6875rem, 0.1em tracking, uppercase), in a framed plate: the names of
  sidebar groups ("Categories", "Tags"), of sections in a list, and of the Achieved shelf.

### Named Rules

**The 16px on Touch Rule.** On a touch screen, fields are 16px text, or Safari zooms the page.

**The One Exception Rule.** A sync code, and a link to the list, are set in the system's monospace
font, where telling a 0 from an O matters more than the typeface. Nothing else uses it.

**The Weight Not Size Rule.** Hierarchy inside the list comes from weight and muted color, not
new sizes: a section heading is 0.875rem semibold, not a bigger font.

## Layout

A centered column up to 72rem wide, with 16px gutters on phones and 24px from 640px up. From 768px
a 15rem sidebar (lists, categories, tags, and the quiet actions below them) sits beside the list
with a 32px gap; below that the sidebar moves into a sheet opened from the menu button in the
header.

The header wraps: Amber's icon and the wordmark on the left, search taking up to 28rem on the
right, and on a phone the search bar on a line of its own, full width. Nothing else sits in the
header; the link to Itrium is in the footer's last line. The main column runs
headline, notices, the Any/Open/Done switch while searching, quick add, then sections spaced 32px
apart, each a framed label over a tray. Slips have 10px × 12px padding and 12px between checkbox
and text. Spacing follows Tailwind's 4px scale.
The footer sits at the bottom of the page behind a hairline, with generous bottom padding so the
Undo message never covers the last row.

**The Wrap, Don't Squeeze Rule.** Rows and bars use `flex-wrap` with minimum widths in rem. At 200%
text, move buttons, the Add button and the search field drop to their own line; words are never
crushed.

**The 44px Finger Rule.** On a coarse pointer every target reaches 44px, through an invisible
layer around the control, so the drawing and the layout stay the same size.

## Elevation & Depth

Flat by default. Depth at rest is tonal: the page is graphite, a drawer, tray or specimen is one
step lighter (`graphite-surface`), and hairline borders separate them. A slip under the pointer
takes a half-tone of the hairline color. Shadows are reserved for things
that float above the page and will go away.

### Shadow Vocabulary

- **Floating message** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`):
  the Undo message at the bottom of the screen.
- **Sheet** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`, over a `rgb(0 0 0 / 0.5)`
  backdrop): dialogs, and a step's menu on a touch screen (over a `rgb(0 0 0 / 0.4)` backdrop).

### Named Rules

**The Shadow Means Floating Rule.** Nothing that stays in the page's flow casts a shadow. If it
has a shadow, it is modal or transient.

## Shapes

Three silhouettes, each with a meaning. **Small rectangles** (6px) are the cabinet: buttons,
fields, drawers, trays, specimens, the Undo message, icon buttons, tag chips; framed labels and
counts are 4px. **Circles** are states: the checkbox, category and tag dots, color swatches.
**Large soft corners** are only for sheets, which round the corners that face the page (top on a
phone, left on a wide screen), and the standard search bar (12px). Focus outlines are 2px, 3px
away, with a 4px corner.

## Components

### Buttons

Calm, square-cornered, and clearly edged.

- **Shape:** 6px corners.
- **Primary:** pastel pink fill with a deep-rose edge in light mode, graphite text, semibold,
  12px × 24px. One per view. Hover dims to 85% opacity. Quick add's Add is pink only while there's
  something to add; empty, it's outlined and muted, so pink never sits on the page looking dead.
- **Secondary:** transparent with a 1px control edge, medium weight; hover fills with the page
  color. Every Add has the same shape: a plus and the word.
- **Small:** the secondary style at 36px tall and 16px sides, for actions inside notices and
  sheets.
- **Icon:** 32px (44px on touch), muted gray, turns text-colored on a page-colored fill on hover.
  Move buttons in a row stay hidden until the row is hovered or focused, and always show on touch.
- **Disabled:** 50% opacity, not-allowed cursor.

### Chips

- **Style:** a task's tags in its details: 36px tall, 6px corners, a control edge, the tag's
  color dot before the name.
- **State:** chosen fills with the text color, the text takes the page color, and a check replaces
  the dot (see the Graphite Chosen Rule); unchosen fills with the page color on hover.

### Checkbox (signature)

A real checkbox drawn as a 24px circle (20px small) with a 2px control edge. Ticked, it fills
pastel pink with a deep-rose edge and a graphite tick that draws itself in over 300ms (stroke
dash), with the fill fading in over 200ms. Reduced motion shows it at once. The space around it
ticks it too.

### Task Row (signature)

A slip in its tray: checkbox edged in its list's color, title as a button that opens the task,
and a meta line beneath where tags are small framed labels with their dot. The checkbox, the
title's first line and the row's buttons share one line's middle, with 12px above and below,
ruled from the next slip by a hairline. Under the pointer it takes a half-tone tint. Done tasks
show muted with a 1px strike-through, in a tray of their own under the fold. Search matches are marked in pink with graphite text. Slips
slide in and out and flip into new order when moved. The whole list is one Tab stop: arrows go
from slip to slip, Enter opens, Space ticks, Delete deletes with Undo.

### Achieved Shelf (signature)

On a bucket list, achieved dreams leave the tray for a shelf set in under it with a hairline on
its left, so it reads as that list's shelf: framed "Achieved (n)", or "Achieved in Someday (n)"
where a page shows several lists. Specimens sit in a grid (two across from 640px): a surface block
with a control edge and 16px padding, the dream in semibold at 1.125rem and a collection label
framed beneath, "Achieved" and the date. A dream ticked in the tray is carried onto the shelf over
450ms and arrives with its edge in deep rose, fading to the usual edge over 1.6s; under reduced
motion it simply appears. Everywhere else, in search results and its details, a bucket list's
done task is said as achieved, never struck through.

### Kind of List

A two-way switch, To-do list or Bucket list, with one line saying what it means. It appears below
the new-category field as a name is typed, and at the top of a category's editor.

### Step and Task Menus

With a mouse, a step's or a task's move buttons sit beside it, shown on hover or focus, and off
(30% opacity) at the ends of its list. On a touch screen they are one More button per row, opening
a menu that names the step or task and labels each action: Move up, Move down, and Make a task of
this step or Delete step for a step, Delete task for a task.

### Inputs / Fields

- **Style:** page-colored fill, 1px control edge, 8px corners, 10px × 12px padding, 0.875rem text
  (16px on touch), muted placeholder.
- **Focus:** the global focus outline (pink on graphite, graphite on paper), 3px offset.
- **Search:** the one field drawn the way every list app draws it: 12px corners, the surface
  tone, body-size text, a magnifier inside on the left and a clear button inside on the right.
  Full width on its own line on a phone, up to 28rem in the header from 640px.

### Cards / Containers

The cabinet has no free-floating cards; its containers each hold one kind of thing.

- **Trays** (6px corners): a list's slips on the surface tone, with a hairline edge and hairline
  rules between slips. No padding of their own; each slip carries 10px × 12px.
- **Specimens** (6px corners): an achieved dream on the surface tone with a control edge and 12px
  padding.
- **Notices** (8px corners): the update offer, the backup reminder and a problem, on the surface
  tone with a hairline edge (a control edge and a warning sign for a problem), 12px padding.
- **Shadow Strategy:** none; see Elevation.

### Navigation

The sidebar is a column of drawers: each place a 40px drawer front (44px on touch) with a hairline
edge on the surface tone, a color dot for categories, and its open count framed on it in tabular
figures. Hover strengthens the edge; the open drawer is pulled out in graphite (off-white in dark
mode) with the text in the page color. Group names are framed labels, not headings, so the page's
own heading comes first in the outline. Quiet actions (install, sync, back up, shortcuts) sit
below in muted text; Keyboard shortcuts shows only with a mouse or a trackpad, or while the
single-key shortcuts are off. Edit buttons appear on hover or focus, always on touch, and places
that can't be edited keep the same gap so every count lines up.

### Sheets

Native modal dialogs. On a phone a sheet rises from the bottom (up to 92% of the height, top
corners rounded); from 640px it is a 28rem panel on the right, full height, left corners rounded.
A sticky header holds the title, which names what's edited ("Category: Home"), and a close
button, over a hairline. A sheet whose point is one action (Get a code, Bring it in) opens with
focus on it; otherwise, with a mouse, on its first field, and on a touch screen on Close, so no
on-screen keyboard comes up unasked. Main actions in sheets use the one primary button.

### Undo Message

A message floating 16px above the bottom of the screen, 8px corners: surface fill, control edge, small text, an
underlined Undo and a round dismiss button. It slides up 16px over 200ms, stays while hovered or
focused, and leaves after six seconds. While a sheet is open it shows at the end of that sheet
instead, in its own place rather than floating, since an open dialog makes the page unreachable
and a floating message would cover the sheet's controls. Ctrl or ⌘ with Z undoes there too.

### Section Headings

A framed label: small uppercase tracked text in a 4px plate, in the category's color (words,
frame and dot) or, without one, muted with a control edge. Shown when a page has more than one
section, or while searching.

## Do's and Don'ts

### Do:

- **Do** take every color from the tokens in `src/app.css`; both modes are defined there.
- **Do** keep the cabinet to type, density, shape and its one move; controls stay standard.
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
- **Don't** put shadows on drawers, trays, slips or anything in the page's flow.
- **Don't** reach for pills; the cabinet's corners are small.
- **Don't** squeeze rows at large text; let them wrap.
- **Don't** use category colors as fills behind text.
- **Don't** redraw, recolor or stretch the Itrium logo files; they are copies from the brand
  assets.
