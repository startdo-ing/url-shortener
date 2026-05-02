import { describe, expect, test } from "bun:test";
import { extractTargetPreviewFromHtml } from "./unfurl-meta";

describe("extractTargetPreviewFromHtml — R-024", () => {
  test("OG + twitter fallbacks persisted shape", () => {
    const html = `<!doctype html>
<head>
<meta property="og:title" content="OG &amp; Title" />
<meta property="og:description" content="Hello world desc" />
<meta property="og:image" content="/pic.png" />
<meta property="og:site_name" content="mysite" />
</head>`;
    const { preview, documentTitle } = extractTargetPreviewFromHtml(
      html,
      "https://news.example/article",
    );
    expect(documentTitle).toBe("OG & Title");
    expect(preview.title).toBe("OG & Title");
    expect(preview.description).toBe("Hello world desc");
    expect(preview.imageUrl).toBe("https://news.example/pic.png");
    expect(preview.siteName).toBe("mysite");
  });

  test("falls back to <title>", () => {
    const html = "<html><head><title>Plain &lt;title&gt;</title></head></html>";
    const { preview } = extractTargetPreviewFromHtml(html, "https://x.test/");
    expect(preview.title).toBe("Plain <title>");
  });

  test("twitter:title when no og:title", () => {
    const html = `<meta name="twitter:title" content="Tw" />`;
    const { preview } = extractTargetPreviewFromHtml(html, "https://t.co/a");
    expect(preview.title).toBe("Tw");
  });
});
