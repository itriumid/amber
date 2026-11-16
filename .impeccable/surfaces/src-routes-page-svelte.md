---
version: 1
slug: 'src-routes-page-svelte'
primary_target: 'src/routes/+page.svelte'
related_targets: []
---

# Amber: the list (whole app surface)

Scope: the one page at `/` and its sheets. Mode: Operate. Audience: the general public, on a phone first, keeping everyday to-dos and a bucket list that lives only in their browser.

Job: add, tick and find tasks in seconds; keep dreams, and see the ones achieved.

Constraints: Rhodonite colors only (graphite, one pastel pink for the primary action and focus); Plus Jakarta Sans; WCAG 2.2 AA; 44px touch targets; no inline styles; nothing loaded from another domain. Standard web controls throughout.

## Direction contract

THESIS: Amber is a specimen cabinet for a life: categories are labelled drawers, tasks are label slips in a tray, and an achieved dream is kept like a specimen with its collection label. It refuses the category default of rounded cards floating in a sidebar app.

OWN-WORLD: Graphite cabinet ground; drawer fronts in the surface gray with a small framed label (name and count) and a hairline edge; slips as ruled rows on a tray, not cards; collection labels as a hairline-framed block with the name in weight and the date in muted text; pink only on the primary Add and focus. Plus Jakarta Sans, label text small and tracked, slips in regular weight. Square-ish 4–6px corners, not pills.

STORY: The visitor opens a drawer, adds a slip, ticks it. On a bucket-list drawer a ticked dream moves to the Achieved shelf as a specimen with its date, never into a plain Done fold.

FIRST VIEWPORT: Header with Amber's icon, the wordmark, and the category standard's search bar (wide, rounded, its own full-width line on a phone); beside the list on a wide screen, a column of drawer fronts for places, with the open drawer pulled out in graphite (in a sheet from the menu button on a phone, since Operate surfaces keep standard navigation); the page heading; quick add at the head of the list, not at the bottom on a phone, because the Undo message owns the bottom edge; the open drawer's sections as framed labels over trays of slips; on a bucket list, the Achieved shelf of specimens below its tray.

FORM: Specimen cabinet, position 1 on the ordered list (taken over the roll's assignment, the tear-off calendar at 5), fused with the category standard's search bar at the user's request. seed:f20dd845d64617e1

SIGNATURE MOVE: Achieving a dream files it: the slip lifts out of the tray and lands on the Achieved shelf as a specimen with a collection label stamped with the date, under reduced motion it simply appears there.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
