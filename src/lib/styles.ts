// Class lists shared by every page. Pink (the primary button) marks the one main action, and
// every control has an edge that reaches 3:1, so people can find it.
export const primaryButton =
	'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButton =
	'inline-flex items-center justify-center gap-2 rounded-full border border-control-border px-6 py-3 text-sm font-medium transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50';
export const smallButton =
	'inline-flex min-h-9 items-center justify-center rounded-full border border-control-border px-4 text-sm font-medium transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50';
export const field =
	'w-full rounded-lg border border-control-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted';
export const label = 'mb-1.5 block text-sm font-medium';
export const card = 'rounded-2xl border border-border bg-surface p-5 sm:p-6';
export const cardHeading = 'mb-4 text-lg font-semibold';
