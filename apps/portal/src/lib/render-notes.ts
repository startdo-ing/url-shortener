import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import sanitizeHtml from "sanitize-html";

const mdIt = new MarkdownIt({ html: false, linkify: true, breaks: false })
  .disable(["image"])
  .use(taskLists, { enabled: false, label: false });

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "input",
];

/** R-028 — excerpt for list rows (markdown source, not HTML). */
export function plainNotesExcerpt(source: string, maxChars = 280): string {
  const t = source.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

/** R-027 / ADR-0004 — Markdown → sanitized HTML for Preview + modal. */
export function renderNotesMarkdown(source: string): string {
  const raw = mdIt.render(source ?? "");
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "rel", "target"],
      code: ["class"],
      pre: ["class"],
      input: ["type", "disabled", "checked", "class"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemesByTag: {
      a: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attribs) => ({
        tagName: "a",
        attribs: {
          href: attribs.href,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
    exclusiveFilter(frame) {
      if (frame.tag === "h4" || frame.tag === "h5" || frame.tag === "h6") return true;
      if (frame.tag === "a" && frame.attribs.href) {
        const h = frame.attribs.href.trim();
        if (!/^https?:\/\//i.test(h)) return true;
      }
      if (frame.tag === "input") {
        const t = (frame.attribs.type ?? "").toLowerCase();
        if (t !== "checkbox") return true;
      }
      return false;
    },
  });
}

export const NOTES_MARKDOWN_MAX_BYTES = 64 * 1024;

export function notesMarkdownTooLarge(source: string | null | undefined): boolean {
  if (source == null || source === "") return false;
  return new TextEncoder().encode(source).length > NOTES_MARKDOWN_MAX_BYTES;
}
