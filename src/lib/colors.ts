// Tailwind only builds classes it can see written out, so each color's classes are spelled in full.
import type { Color } from './model/list';

export const COLOR_NAMES: Record<Color, string> = {
	// Saved as "rose" in lists already, so the key stays; the color shown is coral.
	rose: 'Coral',
	sage: 'Sage',
	sand: 'Sand',
	blue: 'Blue',
	teal: 'Teal',
	lavender: 'Lavender'
};

export const DOT: Record<Color, string> = {
	rose: 'bg-cat-rose',
	sage: 'bg-cat-sage',
	sand: 'bg-cat-sand',
	blue: 'bg-cat-blue',
	teal: 'bg-cat-teal',
	lavender: 'bg-cat-lavender'
};

export const EDGE: Record<Color, string> = {
	rose: 'border-cat-rose',
	sage: 'border-cat-sage',
	sand: 'border-cat-sand',
	blue: 'border-cat-blue',
	teal: 'border-cat-teal',
	lavender: 'border-cat-lavender'
};

/** A section's framed label in its category's color: the words, the frame and the dot. */
export const PLATE: Record<Color, string> = {
	rose: 'border-cat-rose text-cat-rose',
	sage: 'border-cat-sage text-cat-sage',
	sand: 'border-cat-sand text-cat-sand',
	blue: 'border-cat-blue text-cat-blue',
	teal: 'border-cat-teal text-cat-teal',
	lavender: 'border-cat-lavender text-cat-lavender'
};
