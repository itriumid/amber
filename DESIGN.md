---
name: Amber
description: Itrium's lists, kept on your device. A specimen cabinet in Rhodonite, graphite with one vein of pink.
colors:
  graphite: '#2b2b2b'
  graphite-surface: '#343434'
  graphite-cabinet: '#262626'
  graphite-border: '#474747'
  off-white: '#f2f2f2'
  muted-gray: '#aaaaaa'
  control-edge: '#8a8a8a'
  pastel-pink: '#febfca'
  on-pink: '#2b2b2b'
  paper: '#fafafa'
  paper-surface: '#ffffff'
  paper-cabinet: '#f0f0f0'
  paper-border: '#e4e4e4'
  paper-tray-edge: '#e4e4e4'
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
  lg: '16px'
  xl: '24px'
  2xl: '32px'
  3xl: '40px'
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
    size: '36px'
  input-field:
    backgroundColor: '{colors.graphite}'
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '10px 12px'
  search-field:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '10px 40px'
  cabinet:
    backgroundColor: '{colors.graphite-cabinet}'
    rounded: '{rounded.md}'
    padding: '12px 0 12px 10px'
    width: '15rem'
  drawer:
    textColor: '{colors.muted-gray}'
    typography: '{typography.body-small}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '40px'
  drawer-open:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
  tray:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.md}'
    padding: '28px 32px 128px'
  tray-tab:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  section-tray:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.sm}'
  task-slip:
    textColor: '{colors.off-white}'
    typography: '{typography.body}'
    padding: '12px'
  task-slip-hover:
    backgroundColor: '{colors.graphite-border}'
  specimen:
    backgroundColor: '{colors.graphite-surface}'
    rounded: '{rounded.sm}'
    padding: '16px'
  label-plate:
    textColor: '{colors.muted-gray}'
    typography: '{typography.label}'
    rounded: '{rounded.plate}'
    padding: '2px 8px'
  chip:
    textColor: '{colors.off-white}'
    typography: '{typography.body-small}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '36px'
  chip-chosen:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
  segment-chosen:
    backgroundColor: '{colors.graphite-surface}'
    textColor: '{colors.off-white}'
    rounded: '{rounded.plate}'
    height: '36px'
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

**Creative North Star: "Rhodonite in Hand", kept in a specimen cabinet whose open drawer is the list**

Amber is a piece of rhodonite: dense graphite stone with one pink vein running through it. In the
stone's own colors, everything at rest is quiet: the page, a surface one step off it, gray words.
The vein is pastel pink, and it only shows where something matters right now: the one main action,
the box you just ticked (in its list's color, when it has one), the words your search found, the
thing that has focus.

The stone is kept the way minerals are, in a specimen cabinet, after the stones Amber and Rhodonite
are named for. The sidebar is the cabinet's body, one step under the page, with a drawer front for
each place. The drawer you choose slides out and becomes the tray you work in: on a wide screen the
open drawer and the main area are one surface in one tone with no seam between them, and on a phone
the open place's name is a tab on top of that tray. Inside the tray, a list's tasks are
label slips ruled in smaller trays, names of sections are framed labels, and an achieved dream sits
on a shelf as a specimen with its collection label. The cabinet lends type, density, shape and one
move; navigation and controls stay the ones people already know, and the search bar is the familiar
one from every list app.

It is a working surface, used daily and quickly, so density is moderate and the hierarchy is plain:
a page heading, framed section labels, trays of slips. Personality lives in small tactile moments:
the drawer sliding out into its tray, a round checkbox whose tick draws itself in, a dream carried
from the tray onto the Achieved shelf, an Undo message that slides up from the bottom. Everything
has a reduced-motion version that simply appears.

Light is entirely light and dark is entirely dark. Dark is the default (the `:root` values); light
mode, chosen by the system or in Settings, is the same cabinet in daylight: pale body, white open
drawer and tray with a pale hairline round the tray, graphite words, the pink line deepened to deep
rose and focus drawn in graphite so both stay visible on white. Neither mode borrows a surface from
the other.

**Key Characteristics:**

- One continuous world per mode: no dark panel in light mode, no light panel in dark mode.
- The open drawer and the tray are one surface in the surface tone, joined with no seam and no
  outline; closed drawers are plain labels on the cabinet.
- Graphite and off-white, with a single pink accent that always means something.
- Flat surfaces separated by tone and hairline borders; shadows only on what floats.
- Small corners (6px and 8px, 4px on labels): drawers, trays and plates, not pills. Round only for
  what's ticked.
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
  white. The edge of pink buttons and ticked boxes, and the edge a dream arrives on the shelf with.

### Neutral

- **Graphite** (`graphite`): the dark page, and the text color in light mode and on pink.
- **Graphite Surface** (`graphite-surface`, light `paper-surface`): the open drawer (and a closed
  one under the pointer), the tray, the smaller trays inside it, specimens, notices, sheets and the
  Undo message.
- **Graphite Cabinet** (`graphite-cabinet`, light `paper-cabinet`): the cabinet's body only, one
  step under the page, so the open drawer stands out of it.
- **Graphite Border** (`graphite-border`, light `paper-border`): hairlines that divide and that
  nothing depends on (the cabinet, the smaller trays, the footer rule, the sheet header).
- **Paper Tray Edge** (`paper-tray-edge`, `--tray-edge`): the tray's and the phone tab's 1px edge in
  light mode, so the white tray doesn't melt into the near-white page. In dark mode it is
  `transparent`: the tone step alone separates the tray. Never the text color.
- **Control Edge** (`control-edge`, light `control-edge-light`): the edge of a field or button,
  which people need to see to find it; 3:1 against both the page and a surface.
- **Off-White** (`off-white`): text on graphite, the open drawer's words, and the frame of its
  count in dark mode.
- **Muted Gray** (`muted-gray`, light `muted-gray-light`): secondary text, counts, hints, idle icon
  buttons.
- **Paper** (`paper`): the light mode's page.

### Category colors

Coral, Sage, Sand, Blue, Teal and Lavender (`cat-*`, with deeper `cat-*-light` versions for light
mode). Coral is saved as `rose` in existing lists, so the key stays; it moved off pink's hue so it
can't be taken for the accent. Each reaches 4.5:1 on the page and on surfaces in both modes. A
list's color names it: a small dot (10px) on its drawer, on the phone's tab and beside a tag or
category; its section's framed label in that color, words, frame and dot ("· Bucket list" added for
a bucket list, and a small star on its drawer, from the start; "· Locked list" and a small lock for
a locked list); the "Done (n)" that folds its done tasks away, in its words alone, unframed, so it
reads as part of the list rather than a list beside it; its Achieved shelf's framed label, in the
same color; and the edge of each of its tasks' empty checkboxes, so a task shows which list it's
in. Ticked, a box takes a pale wash of its list's color, never a solid fill; with no color, pink. New categories start with the next color not in use;
"No color" stays a choice.

### Named Rules

**The One Vein Rule.** Pink marks one kind of thing at a time: the primary action, the ticked state
of a task with no list color (one in a colored list is ticked in that color), the found words, or
focus. It is never decoration, never a background wash, never a heading color.
If a screen has two pink buttons, one of them is wrong.

**The Graphite-on-Pink Rule.** Text on pink is graphite. Pastel pink is never text on a light
background.

**The No Pink Category Rule.** Pink is not a category color; it would compete with focus and the
main action.

**The Light Is Light Rule.** Light mode is entirely light and dark mode entirely dark (the owner's
rule, 18 November 2026). No surface, drawer or chosen option is filled with the text color. The
open drawer is told by the surface tone, semibold words in the text color and its join with the
tray, not by an outline (the owner's decision, 19 November 2026); anything chosen is marked by an
outline in the text color on the surface tone. That includes a square box that's on: its edge and
tick turn the text color, and it isn't filled.

**The Outlined Chosen Rule.** Something chosen (a segment of the Any/Open/Done switch, the kind of
list or the theme, a tag on a task) keeps the surface tone and takes an outline in the text color
(a 1.5px ring inside a segment; on a tag, its 1px edge plus a 1px ring inside, 2px in all and
no jump in size), with semibold words; a tag also swaps its dot for a check. Pink
stays for ticked, found, focused and the main action.

## Typography

**Body Font:** Plus Jakarta Sans Variable (with ui-sans-serif, system-ui, sans-serif), served from
Amber's own site.

**Character:** a single humanist geometric sans from Jakarta's Tokotype, used at every role. It is
friendly at text sizes and tightens neatly when bold for headings. No second typeface.

### Hierarchy

- **Headline** (700, 1.875rem, tight tracking): the open place's name at the top of the tray; on a
  phone it steps down to 1.25rem on the tray's tab. One per page.
- **Wordmark** (700, 1.25rem, tight tracking): "Amber" in the header.
- **Title** (600, 1rem): sheet titles; a specimen's dream steps up to 1.125rem.
- **Body** (400, 1rem, 1.75 line height): task titles, the thing people actually read; quick add
  and search are body size too.
- **Body Small** (400 to 600, 0.875rem): buttons, fields, drawers, notices and the footer. The open
  drawer and chosen options are semibold.
- **Meta** (400, 0.75rem): the line under a task (done date, category, tags, steps count), counts on
  drawers, and hints, in muted gray.
- **Label** (600, 0.6875rem, 0.1em tracking, uppercase), in a framed plate: the names of the
  cabinet's groups ("Categories", "Tags"), of sections in a list, and of the Achieved shelf.

### Named Rules

**The 16px on Touch Rule.** On a touch screen, fields are 16px text, or Safari zooms the page.

**The One Exception Rule.** A sync code, a recovery code and a link to the list are set in the
system's monospace font, where telling a 0 from an O matters more than the typeface. Nothing else
uses it.

**The Weight Not Size Rule.** Hierarchy inside the tray comes from weight, framed labels and muted
color, not new sizes: a section's name is a small framed label, not a bigger heading.

## Layout

A centered column up to 72rem wide, with 16px gutters on phones and 24px from 640px up. The header
wraps: Amber's mark (a drop of resin with a tick kept inside it, pink on Itrium's graphite tile, the
family's frame, with no outline of its own) and the wordmark on the left, search taking up to 28rem
on the right, and on a phone the search bar on a line of its own, full width. Nothing else sits in
the header; the link to Itrium is in the footer's last line.

From 768px the cabinet (15rem) and the tray sit side by side with no gap: the cabinet has no right
edge, and the open drawer runs 1px over the cabinet's side straight into the tray, whose hairline
(in light mode) closes that side. The tray is at least 70% of the screen's height, with 32px inside
at the sides, 28px at the top, and 40px of page below it. Below 768px the cabinet moves into the
Lists sheet, opened from the menu button in the header, and the tray fills the column under its tab,
with 16px inside.

Inside the tray: the heading row (the place's name, its pencil, and Select), notices, the
Any/Open/Done switch while searching, quick add, then sections 24px apart, each a framed label over
a smaller tray of slips. Slips have 12px padding and 12px between checkbox and text. Spacing follows
Tailwind's 4px scale. The footer sits at the bottom of the page behind a hairline, with generous
bottom padding so the Undo message never covers the last row.

**The Wrap, Don't Squeeze Rule.** Rows and bars use `flex-wrap` with minimum widths in rem. At 200%
text, move buttons, the Add button and the search field drop to their own line; words are never
crushed.

**The 44px Finger Rule.** On a coarse pointer every target reaches 44px, through an invisible layer
around the control, so the drawing and the layout stay the same size. Drawer fronts grow to 44px.

## Elevation & Depth

Flat by default. Depth at rest is tonal: the cabinet's body sits one step under the page, the open
drawer and the tray are the surface tone, and hairlines separate them (the tray's only in light
mode). The open drawer is told apart from the closed ones by tone, weight, the text color and its
join with the tray, not by an outline or by height. The tone step alone is under 3:1; the weight and
the text color carry it. A slip
under the pointer takes a half-tone of the hairline color. Shadows are reserved for things that
float above the page and will go away.

### Shadow Vocabulary

- **Floating message** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`):
  the Undo message and the selection bar at the bottom of the screen.
- **Lifted task** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`):
  a task while it's being dragged, with a control-edge outline.
- **Sheet** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`, over a `rgb(0 0 0 / 0.5)`
  backdrop): dialogs, and a step's menu on a touch screen (over a `rgb(0 0 0 / 0.4)` backdrop).

### Named Rules

**The Shadow Means Floating Rule.** Nothing that stays in the page's flow casts a shadow: not the
cabinet, a drawer, the tray or a slip. If it has a shadow, it is modal, transient or in the hand.

## Shapes

Three silhouettes, each with a meaning. **Small rectangles** are the cabinet: drawer fronts,
buttons, the smaller trays, specimens and icon buttons at 6px; the cabinet's body, the tray, its
tab, fields, notices and the Undo message at 8px; framed labels, counts and chosen segments at 4px.
**Circles** are states: the checkbox, category and tag dots, color swatches. **Large soft corners**
are only for sheets (16px), which round the corners that face the page (top on a phone, left on a
wide screen), and the standard search bar (12px).

Where the open drawer meets the tray, the corners give way: the drawer loses its right corners and
runs 1px over the tray's edge, the tray keeps its top-left corner square, and on a phone the tab
loses its bottom edge and the tray its top-left corner, so the join reads as one surface with no
seam. Focus outlines are 2px, 3px away, with a 4px corner.

## Components

### Buttons

Calm, square-cornered, and clearly edged.

- **Shape:** 6px corners.
- **Primary:** pastel pink fill with a deep-rose edge in light mode, graphite text, semibold, 12px
  by 24px. One per view. Hover dims to 85% opacity. Quick add's Add is pink only while there's
  something to add; empty, it's outlined and muted, so pink never sits on the page looking dead.
- **Secondary:** transparent with a 1px control edge, medium weight; hover fills with the page
  color. Every Add has the same shape: a plus and the word.
- **Small:** the secondary style at 36px tall and 16px sides, for actions inside notices, sheets and
  the selection bar.
- **Icon:** 36px (44px on touch), muted gray, turns text-colored on a page-colored fill on hover.
  Move buttons in a row and pencils on drawers stay hidden until hovered or focused, and always show
  on touch.
- **Disabled:** 50% opacity, not-allowed cursor.

### Chips

- **Style:** a task's tags in its details: 36px tall, 6px corners, a control edge, the tag's color
  dot before the name.
- **State:** chosen keeps the surface tone with a 2px outline in the text color (its edge plus a
  1px ring inside), semibold, and a
  check in place of the dot (the Outlined Chosen Rule); unchosen fills with the page color on hover.

### Segmented Switches

The Any/Open/Done switch while searching, the kind of list, and the theme: one control with a 1px
control edge and 2px to 4px inside, each option 36px tall (44px on touch) with 4px corners. The chosen
option keeps the surface tone and takes a 1.5px ring inside it in the text color, semibold; never a
fill.

### Checkbox (signature)

A real checkbox drawn as a 24px circle (20px small) with a 2px edge, in the list's color for a task
in a colored list. Ticked, a task in a colored list takes a pale wash of its list's color (20%)
inside an edge of that color, with the tick in it too (`TICKED` in colors.ts; every tick reaches at
least 3.99:1 on its wash, in both modes); a task with no color, and a step, fills pastel pink with a
deep-rose edge and a graphite tick. The tick draws itself in over 300ms (stroke dash), with the fill
fading in over 200ms. Reduced motion shows it at once. The space around it ticks it too. The round
box means ticked off, so it's only for tasks and steps; an entry in a locked list
has none, since a secret isn't something to tick off.

**Square box** (`Box.svelte`): for everything else that's on or off, a setting, an acknowledgement
or a choice, and the 20px square of choosing tasks: 4px corners, 2px control edge, and when on, the
edge and a tick in the text color on the surface, never a fill.

### The Cabinet and its Drawers (signature)

The cabinet is the sidebar: a body in the cabinet tone with a hairline edge and 8px corners, 12px
inside at top and bottom and 10px at the left. Group names are framed labels, not headings, so the
page's own heading comes first in the outline. Each place is a drawer front, 40px tall (44px on
touch) with 6px corners, holding the place's button (its
color dot, its name, a star for a bucket list or a lock for a locked list), its open count framed in
tabular figures, and its pencil. Places that can't be edited keep the pencil's room, so every count
lines up. Closed drawers are plain labels on the cabinet: no edge, no fill, muted words and a count
framed in the hairline color; under the pointer a front appears, the surface tone and the text
color. They stop 10px short of the cabinet's right side.

The open drawer alone takes the tray's surface tone, semibold in the text color, its count framed in
the text color; no outline, in either mode. Beside the list it slides out 1px over the cabinet's
side straight into the tray, its right corners square, so the two are one surface with no seam: the
move is its margin, corners and colors changing together over 200ms, `cubic-bezier(0.16, 1, 0.3,
1)`, and at once under reduced motion. In the Lists sheet on a phone, the cabinet has all four edges
and corners, and the open drawer has the surface tone and semibold but nothing to join.

Below the cabinet, outside it, quiet actions (install, sync, back up, settings) sit in muted text
and take the surface tone on hover. Settings holds the theme and the single-key shortcuts setting,
and, with a mouse or a trackpad, the list of keyboard shortcuts.

### The Tray (signature)

The main area is the open drawer's tray: the surface tone with a 1px `tray-edge` (a pale hairline
in light mode, none in dark, where the tone step alone sets it off the page), 8px corners except
where the drawer joins it. No outline in the text color. On a wide screen the drawer meets its
top-left edge. On a phone the open place's color dot, its name, its count framed in the text color
and its pencil form a tab on top of the tray, edged the same way with no bottom edge, overlapping
the tray's edge by 1px; Select sits beside the tab, on the page. Everything about the open place is
inside the tray.

### Task Row (signature)

A slip in a smaller tray: 6px corners, the surface tone, a hairline edge and hairline rules between
slips. A slip holds a checkbox edged in its list's color, its title as a button that opens the task,
and a meta line beneath where tags are small framed labels with their dot. The checkbox, the title's
first line and the row's buttons share one line's middle. Under the pointer it takes a half-tone
tint. Done tasks show muted with a 1px strike-through, in a tray of their own under the fold. Search
matches are marked in pink with graphite text. Slips slide in and out and flip into new order when
moved. The whole list is one Tab stop: arrows go from slip to slip, Enter opens, Space ticks, Delete
deletes with Undo.

### Achieved Shelf (signature)

On a bucket list, achieved dreams leave the tray for a shelf set in under it with a hairline on its
left, so it reads as that list's shelf: framed in the list's color, "Achieved (n)", or "Achieved in
Someday (n)" where a page shows several lists. Specimens sit in a grid (two across from 640px): a
surface block with a control edge, 6px corners and 16px padding, the dream in semibold at 1.125rem
and a collection label framed beneath, "Achieved" and the date. A dream ticked in the tray is carried
onto the shelf over 450ms and arrives with its edge in deep rose, fading to the usual edge over
1.6s; under reduced motion it simply appears. Everywhere else, in search results and its details, a
bucket list's done task is said as achieved, never struck through.

### Kind of List

A three-way segmented switch, To-do list, Bucket list or Locked list (with a small lock), and one
line saying what the chosen one means. It appears below the new-category field as a name is typed,
and at the top of a category's editor. Locked list is never the default. Choosing it asks for a
passphrase first, in its own sheet, and the switch stays where it was until the list is locked;
leaving a locked list needs it open.

### Locked List

A locked list (docs/locked-lists.md) has a bar at the top of its section, the surface tone with a
hairline edge, 8px corners: a lock (an open one while it's open), one line of state, and one small
button, Open or Lock. Closed, it shows only its count, and no quick add; nothing of its entries is on
the page. Open, an entry shows its name and, under it, its notes as ten muted dots, with Reveal (an
eye, crossed out and pressed while revealed, one entry at a time) and Copy, always shown, on any
screen, kept on one line with the row's other controls. An entry's sheet is titled "Entry:" and its
name, says "Encrypted in" its list, starts on Reveal, hides the notes and steps behind it, and has
no tags. Locking asks for the passphrase twice (or shown), says what it protects and what it
doesn't, and then shows the recovery code once, in monospace, with Copy (cleared from the clipboard
after 30 seconds) and a checkbox that has to be ticked before Done; no message with Undo shows under
it. A new passphrase or a new recovery code, from the list's editor, shows its code the same way.

### Step and Task Menus

With a mouse, a step's or a task's move buttons sit beside it, shown on hover or focus, and off (30%
opacity) at the ends of its list. On a touch screen they are one More button per row, opening a menu
that names the step or task and labels each action: Move up, Move down, and Make a task of this step
or Delete step for a step, Delete task for a task.

### Dragging

A task can be dragged to a new place in its list: with a mouse by a grip of six dots at its left
edge, shown on hover; on a touch screen by holding it for 450ms, then moving. The task lifts (the
surface tone, the lifted-task shadow and a control-edge outline: it's in the hand, so it may cast a
shadow), the others slide 150ms to make room, and letting go puts it there as one change with Undo,
re-sorting at once rather than sliding it in again. Escape puts it back. Holding a task while
choosing tasks doesn't drag it. Keyboard and screen-reader moves stay as they are.

### Selection

"Select" beside the page heading turns on choosing tasks. Each task's round box becomes a square
one (a choice, not a task ticked off), and the title chooses too. A bar floats 16px above the bottom
of the screen, up to 40rem wide, 8px corners, the surface tone with a control edge and the floating
shadow: the count, then Select all, Mark done, Move to (a native select of categories), Delete and
Cancel, all small buttons; the bar has the one Cancel, and Select hides while choosing. On a phone
it's two rows on purpose: the count, Select all and Cancel, then Mark done, Move to and Delete
sharing the second row evenly; the list leaves room for it at the end. Select all chooses the open
tasks that show a box, never done ones folded away or dreams on the shelf. Each action is one change
with one Undo, said when the bar has gone; deleting several keeps a copy of the list first. Mark
done reads Mark achieved when every chosen task is in a bucket list. Escape leaves, even with focus
on a box.

### Inputs / Fields

- **Style:** page-colored fill, 1px control edge, 8px corners, 10px by 12px padding, 0.875rem text
  (16px on touch), muted placeholder. Quick add is body size with 12px top and bottom.
- **Focus:** the global focus outline (pink on graphite, graphite on paper), 3px offset.
- **Problem:** a field with a problem (`aria-invalid`) takes its edge and a 1px ring in the text
  color, never pink, and the problem sits right under it, after the warning sign. A passphrase
  field says when Caps Lock is on.
- **Theme:** System, Light or Dark (the brand's names), a segmented switch in Settings. Kept in
  this browser and applied before the page is drawn (`static/theme.js`). Choosing one fades the
  whole page from the old theme to the new over 400ms (a view transition), so a dark screen never
  turns white at once; under reduced motion it changes at once. A device switching on its own
  changes at once too: its colors have changed before the page hears of it.
- **Quick add:** a #word makes a tag and an @ followed by a category's name puts the task in that
  category, said in the hint under it until the list has a tag and then whenever quick add has
  focus; its line stays either way, so nothing moves. An @ that names no category stays in the
  title, and the message says so.
- **Search:** the one field drawn the way every list app draws it: 12px corners, the surface tone
  with a control edge, body-size text, a magnifier inside on the left and a clear button inside on
  the right. Full width on its own line on a phone, up to 28rem in the header from 640px.

### Cards / Containers

The cabinet has no free-floating cards; its containers each hold one kind of thing.

- **The tray and the smaller trays:** see The Tray and Task Row. The smaller trays carry no padding
  of their own; each slip carries 12px.
- **Specimens:** see Achieved Shelf.
- **Notices** (8px corners): the update offer, the backup reminder and a problem, inside the tray,
  on the surface tone with a hairline edge (a control edge and a warning sign for a problem), 12px
  padding.
- **Shadow Strategy:** none; see Elevation & Depth.

### Sheets

Native modal dialogs on the surface tone with a hairline edge. On a phone a sheet rises from the
bottom (up to 92% of the height, top corners rounded at 16px); from 640px it is a 28rem panel on the
right, full height, left corners rounded. A sticky header holds the title, which names what's edited
("Category: Home"), and a close button, over a hairline. A sheet whose point is one action (Get a
code, Bring it in) opens with focus on it; otherwise, with a mouse, on its first field, and on a
touch screen on Close, so no on-screen keyboard comes up unasked. Main actions in sheets use the one
primary button.

### Undo Message

A message floating 16px above the bottom of the screen, 8px corners: surface fill, control edge,
small text, an underlined Undo and a round dismiss button. It slides up 16px over 200ms, stays while
hovered or focused, and leaves after six seconds. While a sheet is open it shows at the end of that
sheet instead, in its own place rather than floating, since an open dialog makes the page
unreachable and a floating message would cover the sheet's controls. It shows only where it was
raised: a message from one sheet doesn't follow into the next, where its Undo would undo something
out of sight. With large text its words wrap, and Undo moves to a line of its own. Ctrl or ⌘ with Z
undoes there too.

### Section Headings

A framed label: small uppercase tracked text in a 4px plate, in the category's color (words, frame
and dot) or, without one, muted with a control edge. Shown when a page has more than one section, or
while searching.

## Do's and Don'ts

### Do:

- **Do** take every color from the tokens in `src/app.css`; both modes are defined there.
- **Do** keep each mode one world: light surfaces in light mode, graphite surfaces in dark mode.
- **Do** mark a chosen option with a 1.5px outline in the text color, semibold, on the surface tone.
- **Do** mark the open drawer by the surface tone, semibold and the text color, and keep it and the
  tray one surface, with no seam and no outline where they meet.
- **Do** keep the cabinet to type, density, shape and its one move; controls stay standard.
- **Do** keep pink to one meaning per moment, with graphite text on it and deep rose for pink lines
  in light mode.
- **Do** give every control a 3:1 edge (`control-edge`) and every target 44px on touch.
- **Do** separate surfaces by tone and hairline; add a shadow only to something that floats.
- **Do** pair every transition with `motion-reduce` so it appears instantly instead.
- **Do** use Tailwind classes; inline styles and `data:` URLs are blocked by the
  Content-Security-Policy.

### Don't:

- **Don't** fill a drawer, a chosen option or any surface with the text color, in either mode.
- **Don't** outline the open drawer, the tray or the phone's tab in the text color, or give closed
  drawers an edge or fill at rest.
- **Don't** split the page into a dark sidebar beside a light page, or the reverse.
- **Don't** use pink as text on a light background, as decoration, or as a category color.
- **Don't** use black (`#000000`) for text or surfaces; graphite is `#2b2b2b`.
- **Don't** add a second typeface or load fonts from another domain.
- **Don't** put shadows on the cabinet, drawers, the tray, slips or anything in the page's flow.
- **Don't** reach for pills; the cabinet's corners are small.
- **Don't** squeeze rows at large text; let them wrap.
- **Don't** use category colors as fills behind text, or as a thick edge on a row or card.
- **Don't** redraw, recolor or stretch the Itrium logo files; they are copies from the brand assets.
