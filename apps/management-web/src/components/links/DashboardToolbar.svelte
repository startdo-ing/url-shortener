<script lang="ts">
interface Props {
	selectedDomainId?: string
	selectedStatus?: string
	query?: string
	pageSize: number
	pageSizes: number[]
}

const {
	selectedDomainId,
	selectedStatus,
	query = "",
	pageSize,
	pageSizes
}: Props = $props()

let formEl: HTMLFormElement

let searchTimer: ReturnType<typeof setTimeout> | undefined

function submitForm() {
	clearTimeout(searchTimer)
	formEl.requestSubmit()
}

function handleSearchInput() {
	clearTimeout(searchTimer)
	searchTimer = setTimeout(submitForm, 250)
}
</script>

<form bind:this={formEl} action="/dashboard" method="get" class="dashboard-toolbar" id="dashboard-toolbar">
	<input name="domainId" type="hidden" value={selectedDomainId ?? ""} />
	<div class="dashboard-toolbar__left">
		<label>
			Status
			<select name="status" onchange={submitForm}>
				<option value="" selected={!selectedStatus}>All</option>
				<option value="active" selected={selectedStatus === "active"}>Active</option>
				<option value="disabled" selected={selectedStatus === "disabled"}>Disabled</option>
			</select>
		</label>
	</div>

	<div class="dashboard-toolbar__center">
		<label>
			Search
			<span class="search-input-wrap">
				<span aria-hidden="true" class="search-input-wrap__icon">🔎</span>
				<input
					name="query"
					placeholder="Search slug, target URL, or domain"
					type="search"
					value={query}
					oninput={handleSearchInput}
					onchange={submitForm}
				/>
			</span>
		</label>
	</div>

	<div class="dashboard-toolbar__right">
		<label>
			Page Size
			<select name="pageSize" onchange={submitForm}>
				{#each pageSizes as size (size)}
					<option value={String(size)} selected={pageSize === size}>{size}</option>
				{/each}
			</select>
		</label>
	</div>
</form>
