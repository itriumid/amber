// SvelteKit catches errors while a page renders and shows the error page instead, without telling
// the console. Saying it there is how the browser tests notice.
import type { HandleClientError } from '@sveltejs/kit/hooks';

export const handleError: HandleClientError = ({ error }) => {
	console.error(error);
};
