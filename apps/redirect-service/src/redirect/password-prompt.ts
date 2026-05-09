export function renderPasswordPrompt(
	host: string,
	slug: string,
	invalid = false
): string {
	const escapedHost = escapeHtml(host)
	const escapedSlug = escapeHtml(slug)
	const action = `/${encodeURIComponent(slug)}`

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Protected Link</title>
	<style>
		:root {
			--color-primary: #191918;
			--color-secondary: #8c877d;
			--color-tertiary: #c26b5b;
			--color-neutral: #f7f6f3;
			--color-surface: #ffffff;
			--radius-sm: 4px;
			--radius-md: 6px;
			--radius-lg: 10px;
			--space-sm: 8px;
			--space-md: 16px;
			--space-lg: 32px;
		}

		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			min-height: 100vh;
			display: grid;
			place-items: center;
			padding: var(--space-lg);
			background: var(--color-neutral);
			color: var(--color-primary);
			font-family: Inter, "Segoe UI", sans-serif;
			font-size: 0.95rem;
			line-height: 1.6;
		}

		main {
			width: min(100%, 460px);
			background: var(--color-surface);
			border: 1px solid #e9e6df;
			border-radius: var(--radius-lg);
			padding: 24px;
			box-shadow: 0 8px 24px rgba(25, 25, 24, 0.06);
		}

		h1 {
			margin: 0 0 var(--space-sm);
			font-size: 2rem;
			line-height: 1.15;
			letter-spacing: -0.02em;
		}

		p {
			margin: 0 0 var(--space-md);
			color: var(--color-secondary);
		}

		.target {
			color: var(--color-primary);
			font-weight: 600;
		}

		.error {
			margin: 0 0 var(--space-md);
			padding: var(--space-sm) 10px;
			border: 1px solid #e7b5ac;
			border-radius: var(--radius-sm);
			background: #fff5f3;
			color: #9f4132;
			font-size: 0.88rem;
		}

		form {
			display: grid;
			gap: 14px;
		}

		label {
			display: grid;
			gap: 6px;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.02em;
			text-transform: uppercase;
			color: var(--color-secondary);
		}

		input {
			width: 100%;
			border: 1px solid #d4d0c7;
			border-radius: var(--radius-md);
			padding: 12px;
			color: var(--color-primary);
			background: #fff;
			font: inherit;
		}

		input:focus {
			outline: 2px solid #e2a497;
			outline-offset: 1px;
			border-color: #c88a7e;
		}

		button {
			border: 0;
			border-radius: var(--radius-md);
			padding: 12px 20px;
			background: var(--color-tertiary);
			color: #fff;
			font: inherit;
			font-weight: 600;
			cursor: pointer;
		}

		button:hover {
			filter: brightness(0.95);
		}
	</style>
</head>
<body>
  <main>
    <h1>Protected Link</h1>
		<p>
			Enter password to continue to
			<span class="target">${escapedHost}/${escapedSlug}</span>.
		</p>
		${invalid ? '<p class="error">Invalid password.</p>' : ""}
    <form method="post" action="${action}">
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit">Continue</button>
    </form>
  </main>
</body>
</html>`
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}
