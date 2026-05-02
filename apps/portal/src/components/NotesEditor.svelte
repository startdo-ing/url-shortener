<script lang="ts">
  import { renderNotesMarkdown } from "../lib/render-notes";

  interface Props {
    initialMarkdown?: string;
    fieldName?: string;
  }

  let { initialMarkdown = "", fieldName = "notes_markdown" }: Props = $props();

  type Tab = "write" | "preview";
  let tab = $state<Tab>("write");
  let value = $state(initialMarkdown);

  const previewHtml = $derived(tab === "preview" ? renderNotesMarkdown(value) : "");
</script>

<div class="notes-editor">
  <div class="notes-editor__tabs" role="tablist" aria-label="Notes editor">
    <button
      type="button"
      class="notes-editor__tab"
      role="tab"
      aria-selected={tab === "write"}
      onclick={() => (tab = "write")}
    >
      Write
    </button>
    <button
      type="button"
      class="notes-editor__tab"
      role="tab"
      aria-selected={tab === "preview"}
      onclick={() => (tab = "preview")}
    >
      Preview
    </button>
  </div>
  <textarea
    id="notes_markdown_field"
    class="notes-editor__textarea"
    class:notes-editor__textarea--hidden={tab === "preview"}
    name={fieldName}
    rows={10}
    tabindex={tab === "preview" ? -1 : 0}
    bind:value
  ></textarea>
  {#if tab === "preview"}
    <div class="notes-preview notes-editor__preview" role="tabpanel" aria-label="Markdown preview">
      {@html previewHtml}
    </div>
  {/if}
</div>

<style>
  .notes-editor {
    margin-bottom: 8px;
  }
  .notes-editor__tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .notes-editor__tab {
    font: inherit;
    padding: 6px 12px;
    border: 1px solid var(--secondary, #6f7478);
    border-radius: 5px;
    background: var(--surface, #fff);
    cursor: pointer;
    color: var(--primary, #0f1112);
  }
  .notes-editor__tab[aria-selected="true"] {
    border-color: var(--tertiary, #00a36c);
    font-weight: 500;
  }
  .notes-editor__textarea {
    width: 100%;
    max-width: 480px;
    padding: 8px;
    border: 1px solid var(--secondary, #6f7478);
    border-radius: 5px;
    font: inherit;
    min-height: 160px;
    resize: vertical;
  }
  .notes-editor__textarea--hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .notes-editor__preview {
    min-height: 160px;
    max-width: 480px;
    padding: 12px;
    border: 1px solid var(--secondary, #6f7478);
    border-radius: 5px;
    background: var(--neutral, #fafaf8);
  }
</style>
