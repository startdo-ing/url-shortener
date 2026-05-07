import { createDb } from "@url-shortener/shared-db/client"
import {
	clickEvents,
	domains,
	shortLinks
} from "@url-shortener/shared-db/schema"
import { count, desc, eq, inArray } from "drizzle-orm"

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./dev.sqlite"
const db = createDb(DATABASE_PATH)

export interface LinkClickSummary {
	domainHost: string
	slug: string
	targetUrl: string
	totalClicks: number
}

export interface RecentClickEvent {
	occurredAt: string
	domainHost: string
	slug: string
	requestPath: string
	referer: string | null
	countryCode: string | null
}

export interface DashboardStats {
	totalShortLinks: number
	totalClicks: number
	activeLinks: number
	disabledLinks: number
	totalDomains: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const [
		totalShortLinksRow,
		totalClicksRow,
		activeLinksRow,
		disabledLinksRow,
		totalDomainsRow
	] = await Promise.all([
		db.select({ value: count(shortLinks.id) }).from(shortLinks),
		db.select({ value: count(clickEvents.id) }).from(clickEvents),
		db
			.select({ value: count(shortLinks.id) })
			.from(shortLinks)
			.where(eq(shortLinks.status, "active")),
		db
			.select({ value: count(shortLinks.id) })
			.from(shortLinks)
			.where(eq(shortLinks.status, "disabled")),
		db.select({ value: count(domains.id) }).from(domains)
	])

	return {
		totalShortLinks: Number(totalShortLinksRow.at(0)?.value ?? 0),
		totalClicks: Number(totalClicksRow.at(0)?.value ?? 0),
		activeLinks: Number(activeLinksRow.at(0)?.value ?? 0),
		disabledLinks: Number(disabledLinksRow.at(0)?.value ?? 0),
		totalDomains: Number(totalDomainsRow.at(0)?.value ?? 0)
	}
}

export async function listLinkClickTotals(
	linkIds: string[]
): Promise<Record<string, number>> {
	if (linkIds.length === 0) {
		return {}
	}

	const rows = await db
		.select({
			shortLinkId: clickEvents.shortLinkId,
			totalClicks: count(clickEvents.id)
		})
		.from(clickEvents)
		.where(inArray(clickEvents.shortLinkId, linkIds))
		.groupBy(clickEvents.shortLinkId)

	const totals: Record<string, number> = {}
	for (const row of rows) {
		totals[row.shortLinkId] = Number(row.totalClicks)
	}

	return totals
}

export async function listTopClickedLinks(
	limit = 20
): Promise<LinkClickSummary[]> {
	const rows = await db
		.select({
			domainHost: domains.host,
			slug: shortLinks.slug,
			targetUrl: shortLinks.targetUrl,
			totalClicks: count(clickEvents.id)
		})
		.from(clickEvents)
		.innerJoin(shortLinks, eq(clickEvents.shortLinkId, shortLinks.id))
		.innerJoin(domains, eq(shortLinks.domainId, domains.id))
		.groupBy(domains.host, shortLinks.slug, shortLinks.targetUrl)
		.orderBy(desc(count(clickEvents.id)))
		.limit(limit)

	return rows.map((row) => ({
		domainHost: row.domainHost,
		slug: row.slug,
		targetUrl: row.targetUrl,
		totalClicks: Number(row.totalClicks)
	}))
}

export async function listRecentClickEvents(
	limit = 100
): Promise<RecentClickEvent[]> {
	const rows = await db
		.select({
			occurredAt: clickEvents.occurredAt,
			domainHost: domains.host,
			slug: shortLinks.slug,
			requestPath: clickEvents.requestPath,
			referer: clickEvents.referer,
			countryCode: clickEvents.countryCode
		})
		.from(clickEvents)
		.innerJoin(shortLinks, eq(clickEvents.shortLinkId, shortLinks.id))
		.innerJoin(domains, eq(shortLinks.domainId, domains.id))
		.orderBy(desc(clickEvents.occurredAt))
		.limit(limit)

	return rows
}
