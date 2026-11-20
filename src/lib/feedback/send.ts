/** Posts feedback to the real endpoint and returns an error message, or nothing when it was saved. */
export async function sendFeedback(fields: { name?: string; email?: string; message: string }): Promise<string | undefined> {
	const message = fields.message.trim();
	if (message.length < 10) return 'Please write at least 10 characters.';
	try {
		const response = await fetch('/api/feedback', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: fields.name?.trim() ?? '', email: fields.email?.trim() ?? '', message })
		});
		if (response.ok) return;
		const body = await response.json().catch(() => ({}));
		return body.message ?? 'Something went wrong. Please try again.';
	} catch {
		return 'Something went wrong. Please try again.';
	}
}
