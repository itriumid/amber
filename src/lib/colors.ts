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

/**
 * A ticked box in its list's color: a pale wash of the color inside an edge of it, and the tick in
 * it too, never a solid fill (light is light, dark is dark). Every category color reaches 4.5:1 on
 * both surfaces, and still more than 3:1 on its own wash, as a tick needs. A task with no category
 * keeps the pink one.
 */
export const TICKED: Record<Color, { box: string; tick: string }> = {
	rose: { box: 'checked:border-cat-rose checked:bg-cat-rose/20', tick: 'text-cat-rose' },
	sage: { box: 'checked:border-cat-sage checked:bg-cat-sage/20', tick: 'text-cat-sage' },
	sand: { box: 'checked:border-cat-sand checked:bg-cat-sand/20', tick: 'text-cat-sand' },
	blue: { box: 'checked:border-cat-blue checked:bg-cat-blue/20', tick: 'text-cat-blue' },
	teal: { box: 'checked:border-cat-teal checked:bg-cat-teal/20', tick: 'text-cat-teal' },
	lavender: {
		box: 'checked:border-cat-lavender checked:bg-cat-lavender/20',
		tick: 'text-cat-lavender'
	}
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
