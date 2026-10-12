// Permanent, random identifiers for everything in a list, made on the device. 16 random bytes in base64url:
// two devices will never make the same one.

export function newIdentifier(bytes = 16): string {
	const random = crypto.getRandomValues(new Uint8Array(bytes));
	let binary = '';
	for (const byte of random) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
