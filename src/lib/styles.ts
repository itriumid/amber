// Class lists shared by every page. Amber is drawn as a specimen cabinet: drawers, trays of label
// slips and framed labels, so corners are small (6px), not pills. Pink (the primary button) marks
// the one main action, and
// every control has an edge that reaches 3:1, so people can find it: on pink, that's the deep rose
// of --accent-edge, since pastel pink is 1.5:1 on a light page. Under reduced motion nothing fades.
export const primaryButton =
	'inline-flex items-center justify-center gap-2 rounded-md border border-accent-edge bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
export const secondaryButton =
	'inline-flex items-center justify-center gap-2 rounded-md border border-control-border px-6 py-3 text-sm font-medium transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
/**
 * On a touch screen, the space a finger can hit reaches at least 44px: an invisible layer centered on
 * the control, so what's seen and the layout stay as they are. The control needs a position
 * (`relative`, or `absolute` already), and room around it, so no two targets overlap.
 */
export const touchTarget =
	'pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2';
export const smallButton = `relative inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-control-border px-4 text-sm font-medium transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${touchTarget}`;
/** On touch screens the text is 16px: Safari on iOS zooms the page into anything smaller. */
export const touchText = 'pointer-coarse:text-base';
export const field = `w-full rounded-lg border border-control-border bg-bg px-3 py-2.5 text-sm ${touchText} text-text placeholder:text-muted`;
export const label = 'mb-1.5 block text-sm font-medium';
export const card = 'rounded-2xl border border-border bg-surface p-5 sm:p-6';
export const cardHeading = 'mb-4 text-lg font-semibold';
/** A framed label, as on a specimen drawer: the names of sections and shelves. */
export const labelPlate =
	'inline-flex items-center gap-1.5 rounded-sm border border-control-border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-widest text-muted uppercase';
/** A tray of slips: a list's tasks, ruled one from the next. */
export const tray = 'rounded-md border border-border bg-surface divide-y divide-border';
