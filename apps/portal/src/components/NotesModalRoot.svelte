<script lang="ts">
  import { onMount } from "svelte";
  import { renderNotesMarkdown } from "../lib/render-notes";

  let dialogEl = $state<HTMLDialogElement | null>(null);
  let innerHtml = $state("");
  let lastFocus = $state<HTMLElement | null>(null);

  function utf8FromB64(b64: string): string {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function close() {
    dialogEl?.close();
  }

  function onDialogClose() {
    innerHtml = "";
    lastFocus?.focus();
    lastFocus = null;
  }

  function trapTab(e: KeyboardEvent) {
    if (!dialogEl?.open || e.key !== "Tab") return;
    const sel =
      'button:not([disabled]), [href], textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';
    const nodes = [...dialogEl.querySelectorAll<HTMLElement>(sel)];
    if (nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-notes-open]");
      if (!el) return;
      e.preventDefault();
      const b64 = el.getAttribute("data-notes-b64");
      if (b64 == null || b64 === "") return;
      try {
        innerHtml = renderNotesMarkdown(utf8FromB64(b64));
      } catch {
        innerHtml = "<p>Could not decode notes.</p>";
      }
      lastFocus = document.activeElement as HTMLElement;
      dialogEl?.showModal();
      queueMicrotask(() => {
        dialogEl?.querySelector<HTMLElement>("button[data-close-notes]")?.focus();
      });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  });
</script>

<dialog
  bind:this={dialogEl}
  class="notes-dialog"
  aria-labelledby="notes-dialog-title"
  aria-modal="true"
  onclick={(e) => {
    if (e.target === e.currentTarget) close();
  }}
  onkeydown={(e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    trapTab(e);
  }}
  onclose={onDialogClose}
>
  <div class="notes-dialog__panel">
    <header class="notes-dialog__head">
      <h2 id="notes-dialog-title">Notes</h2>
      <button type="button" class="notes-dialog__close" data-close-notes onclick={close}>Close</button>
    </header>
    <div class="notes-preview notes-dialog__body">
      {@html innerHtml}
    </div>
  </div>
</dialog>

<style>
  .notes-dialog {
    padding: 0;
    border: none;
    max-width: min(720px, 96vw);
    width: 100%;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }
  .notes-dialog::backdrop {
    background: rgba(15, 17, 18, 0.45);
  }
  .notes-dialog__panel {
    padding: 16px 20px 20px;
  }
  .notes-dialog__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .notes-dialog__head h2 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 500;
  }
  .notes-dialog__close {
    font: inherit;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--tertiary, #00a36c);
    text-decoration: underline;
    padding: 4px 8px;
  }
  .notes-dialog__body {
    max-height: min(70vh, 560px);
    overflow: auto;
    padding: 12px;
    border: 1px solid #e8e9ea;
    border-radius: 5px;
    background: var(--neutral, #fafaf8);
  }
</style>
