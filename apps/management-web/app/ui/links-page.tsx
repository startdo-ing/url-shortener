import type {
	LinkDomainOption,
	LinkFilters,
	ManagedShortLink
} from "../models/link.ts"
import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

const HTTP_CODE_LABELS: Record<301 | 302 | 307, string> = {
	301: "301 Moved Permanently",
	302: "302 Found",
	307: "307 Temporary Redirect",
}

export interface LinksPageProps {
	domains: LinkDomainOption[]
	errorMessage?: string
	filters: LinkFilters
	links: ManagedShortLink[]
	noticeMessage?: string
	viewer: Viewer
}

export function LinksPage() {
	return ({
		domains,
		errorMessage,
		filters,
		links,
		noticeMessage,
		viewer
	}: LinksPageProps) => (
		<Layout title="Links" viewer={viewer}>
			<section>
				<h1>Short Links</h1>
				{noticeMessage ? (
					<p className="banner banner--notice">{noticeMessage}</p>
				) : null}
				{errorMessage ? (
					<p className="banner banner--error">{errorMessage}</p>
				) : null}
				<p>
					Create, search, update, and delete redirect links for the configured
					domains.
				</p>

				<div className="card card--section">
					<h2>Filter</h2>
					<form action={routes.links.index.href()} method="get">
						<div className="form-row">
							<label>
								Search
								<input
									defaultValue={filters.query}
									name="query"
									placeholder="Search slug, target URL, or domain"
									type="search"
								/>
							</label>
						</div>
						<div className="form-row">
						<span>Domain</span>
						<div className="radio-group">
							<label>
								<input
									defaultChecked={!filters.domainId}
									name="domainId"
									type="radio"
									value=""
								/>
								All domains
							</label>
							{domains.map((domain) => (
								<label key={domain.id}>
									<input
										defaultChecked={filters.domainId === domain.id}
										name="domainId"
										type="radio"
										value={domain.id}
									/>
									{domain.host}
								</label>
							))}
						</div>
						</div>
						<div className="form-row">
						<span>Status</span>
						<div className="radio-group">
							<label>
								<input
									defaultChecked={!filters.status}
									name="status"
									type="radio"
									value=""
								/>
								All
							</label>
							<label>
								<input
									defaultChecked={filters.status === "active"}
									name="status"
									type="radio"
									value="active"
								/>
								Active
							</label>
							<label>
								<input
									defaultChecked={filters.status === "disabled"}
									name="status"
									type="radio"
									value="disabled"
								/>
								Disabled
							</label>
						</div>
						</div>
						<div className="form-actions">
							<button type="submit">Apply filters</button>
						</div>
					</form>
				</div>

				<div style="margin-bottom: var(--spacing-md)">
					<button
						id="create-link-btn"
						type="button"
					>
						Create Link
					</button>
				</div>

				<dialog id="create-link-dialog">
					<div class="dialog-header">
						<h2>Create Link</h2>
						<button
							class="dialog-close"
							id="create-link-close-btn"
							type="button"
							aria-label="Close"
						>
							✕
						</button>
					</div>
					{domains.length === 0 ? (
						<p>Add a domain before creating short links.</p>
					) : (
						<form action={routes.links.mutate.href()} method="post">
							<input name="intent" type="hidden" value="create" />
							<div className="form-row">
								<span>Domain</span>
								<div className="radio-group">
									{domains.map((domain, i) => (
										<label key={domain.id}>
											<input
												defaultChecked={i === 0}
												name="domainId"
												required
												type="radio"
												value={domain.id}
											/>
											{domain.host}
										</label>
									))}
								</div>
							</div>
							<div className="form-row">
								<label>
									Slug
									<input name="slug" placeholder="docs" required type="text" />
								</label>
							</div>
							<div className="form-row">
								<label>
									Target URL
									<input
										name="targetUrl"
										placeholder="https://example.com/docs"
										required
										type="url"
									/>
								</label>
							</div>
							<div className="form-row">
									<span>HTTP code</span>
									<div className="radio-group">
										{([301, 302, 307] as const).map((code) => (
											<label key={code}>
												<input
													defaultChecked={code === 302}
													name="httpCode"
													type="radio"
													value={String(code)}
												/>
												{HTTP_CODE_LABELS[code]}
											</label>
										))}
									</div>
							</div>
							<div className="form-row">
								<span>Status</span>
								<div className="radio-group">
									<label>
										<input defaultChecked name="status" type="radio" value="active" />
										Active
									</label>
									<label>
										<input name="status" type="radio" value="disabled" />
										Disabled
									</label>
								</div>
							</div>
							<div className="form-row">
								<label>
									Expiry (optional)
									<input
										name="expiresAt"
										type="datetime-local"
									/>
								</label>
							</div>
							<div className="form-actions">
								<button type="submit">Create short link</button>
							</div>
						</form>
					)}
				</dialog>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static dialog wiring */}
				<script innerHTML={`
					document.getElementById('create-link-btn').addEventListener('click', function() {
						document.getElementById('create-link-dialog').showModal();
					});
					document.getElementById('create-link-close-btn').addEventListener('click', function() {
						document.getElementById('create-link-dialog').close();
					});
				`} />

				<h2>Existing Links</h2>
				{links.length === 0 ? (
					<p>No short links match the current filters.</p>
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Link</th>
								<th>Target</th>
								<th>Status</th>
								<th>HTTP</th>
								<th>Expires</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{links.map((link) => (
								<tr key={link.id}>
									<td>
										<strong>
											{link.domainHost}/{link.slug}
										</strong>
									</td>
									<td>{link.targetUrl}</td>
									<td>
										<span className={`badge badge--${link.status}`}>
											{link.status}
										</span>
									</td>
									<td>{HTTP_CODE_LABELS[link.httpCode as 301 | 302 | 307] ?? link.httpCode}</td>
									<td>{link.expiresAt ?? "—"}</td>
									<td>
										<div className="row-actions">
											<details>
												<summary>Edit</summary>
												<form action={routes.links.mutate.href()} method="post">
													<input name="intent" type="hidden" value="update" />
													<input name="linkId" type="hidden" value={link.id} />
													<div className="form-row">
															<span>Domain</span>
															<div className="radio-group">
																{domains.map((domain) => (
																	<label key={domain.id}>
																		<input
																			defaultChecked={link.domainId === domain.id}
																			name="domainId"
																			required
																			type="radio"
																			value={domain.id}
																		/>
																		{domain.host}
																	</label>
																))}
															</div>
													</div>
													<div className="form-row">
														<label>
															Slug
															<input
																defaultValue={link.slug}
																name="slug"
																required
																type="text"
															/>
														</label>
													</div>
													<div className="form-row">
														<label>
															Target URL
															<input
																defaultValue={link.targetUrl}
																name="targetUrl"
																required
																type="url"
															/>
														</label>
													</div>
													<div className="form-row">
															<span>HTTP code</span>
															<div className="radio-group">
																{([301, 302, 307] as const).map((code) => (
																	<label key={code}>
																		<input
																			defaultChecked={code === link.httpCode}
																			name="httpCode"
																			type="radio"
																			value={String(code)}
																		/>
																		{HTTP_CODE_LABELS[code]}
																	</label>
																))}
															</div>
													</div>
													<div className="form-row">
															<span>Status</span>
															<div className="radio-group">
																<label>
																	<input
																		defaultChecked={link.status === "active"}
																		name="status"
																		type="radio"
																		value="active"
																	/>
																	Active
																</label>
																<label>
																	<input
																		defaultChecked={link.status === "disabled"}
																		name="status"
																		type="radio"
																		value="disabled"
																	/>
																	Disabled
																</label>
															</div>
														</div>
														<div className="form-row">
															<label>
																Expiry (optional)
																<input
																	defaultValue={link.expiresAt ? link.expiresAt.slice(0, 16) : ""}
																	name="expiresAt"
																	type="datetime-local"
															/>
														</label>
													</div>
													<div className="form-actions">
														<button type="submit">Save changes</button>
													</div>
												</form>
											</details>
											<form action={routes.links.mutate.href()} method="post">
												<input name="intent" type="hidden" value="delete" />
												<input
													name="label"
													type="hidden"
													value={`${link.domainHost}/${link.slug}`}
												/>
												<input name="linkId" type="hidden" value={link.id} />
												<button data-variant="secondary" type="submit">
													Delete
												</button>
											</form>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>
		</Layout>
	)
}
