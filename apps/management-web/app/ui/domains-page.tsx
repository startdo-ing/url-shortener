import type { ManagedDomain } from "../models/domain.ts"
import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

export interface DomainsPageProps {
	domains: ManagedDomain[]
	errorMessage?: string
	noticeMessage?: string
	viewer: Viewer
}

export function DomainsPage() {
	return ({
		domains,
		errorMessage,
		noticeMessage,
		viewer
	}: DomainsPageProps) => (
		<Layout title="Domains" viewer={viewer}>
			<section>
				<h1>Domains</h1>
				{noticeMessage ? (
					<p className="banner banner--notice">{noticeMessage}</p>
				) : null}
				{errorMessage ? (
					<p className="banner banner--error">{errorMessage}</p>
				) : null}
				<p>
					Configure redirect hostnames like <strong>c.anh.pw</strong> or{" "}
					<strong>go.startdo.ing</strong>. Set one as primary so it becomes the
					default when creating new short links.
				</p>

				<div className="card card--section">
					<h2>Add domain</h2>
					<form action={routes.domains.mutate.href()} method="post">
						<input name="intent" type="hidden" value="create" />
						<div className="form-row">
							<label>
								Hostname
								<input
									name="host"
									placeholder="go.startdo.ing"
									required
									type="text"
								/>
							</label>
						</div>
						<div className="form-actions">
							<button type="submit">Add domain</button>
						</div>
					</form>
				</div>

				{domains.length === 0 ? (
					<p>No domains yet. Add one above to start creating short links.</p>
				) : (
					<table className="data-table">
						<thead>
							<tr>
								<th>Host</th>
								<th>Status</th>
								<th>Verification</th>
								<th>Links</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{domains.map((domain) => (
								<tr key={domain.id}>
									<td>
										<strong>{domain.host}</strong>
										{domain.isPrimary ? (
											<>
												{" "}
												<span className="badge badge--primary">primary</span>
											</>
										) : null}
									</td>
									<td>
										<span
											className={`badge badge--${domain.isActive ? "active" : "disabled"}`}
										>
											{domain.isActive ? "active" : "disabled"}
										</span>
									</td>
									<td>
										<span
											className={`badge badge--${domain.verificationStatus}`}
										>
											{domain.verificationStatus}
										</span>
										{domain.verificationError ? (
											<p className="table-meta">{domain.verificationError}</p>
										) : null}
										{domain.verificationCheckedAt ? (
											<p className="table-meta">
												Checked {domain.verificationCheckedAt}
											</p>
										) : null}
									</td>
									<td>{domain.linkedShortLinkCount}</td>
									<td>
										<div className="row-actions">
											<form action={routes.domains.mutate.href()} method="post">
												<input
													name="domainId"
													type="hidden"
													value={domain.id}
												/>
												<input name="intent" type="hidden" value="verify" />
												<button type="submit">Verify DNS</button>
											</form>
											{!domain.isPrimary ? (
												<form
													action={routes.domains.mutate.href()}
													method="post"
												>
													<input
														name="domainId"
														type="hidden"
														value={domain.id}
													/>
													<input
														name="intent"
														type="hidden"
														value="set-primary"
													/>
													<button data-variant="secondary" type="submit">
														Set as primary
													</button>
												</form>
											) : null}
											<form action={routes.domains.mutate.href()} method="post">
												<input
													name="domainId"
													type="hidden"
													value={domain.id}
												/>
												<input
													name="intent"
													type="hidden"
													value={domain.isActive ? "disable" : "enable"}
												/>
												<button data-variant="secondary" type="submit">
													{domain.isActive ? "Disable" : "Enable"}
												</button>
											</form>
											<form action={routes.domains.mutate.href()} method="post">
												<input
													name="domainId"
													type="hidden"
													value={domain.id}
												/>
												<input name="intent" type="hidden" value="delete" />
												<input name="label" type="hidden" value={domain.host} />
												<button
													data-variant="secondary"
													disabled={domain.linkedShortLinkCount > 0}
													type="submit"
												>
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
