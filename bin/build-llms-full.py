#!/usr/bin/env python3
"""Write llms-full.txt: every guide, comparison and reference page as plain text.

llms.txt is the index; llms-full.txt is the content, for a model that would
rather read one file than follow twenty links. It is generated from the pages
themselves, so it cannot say anything the site doesn't — run this after
changing a page and commit the result. There is no build step at deploy.

    python3 bin/build-llms-full.py
"""

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.mailgi.xyz"
SKIP = {"404.html", "privacy.html"}
BLOCK = {"h1": "# ", "h2": "\n## ", "h3": "\n### "}


def page_text(src):
    main = re.search(r"<main[^>]*>(.*?)</main>", src, re.S).group(1)
    # Navigation and calls to action are not content.
    main = re.sub(r'<section class="rule-top related">.*?</section>', "", main, flags=re.S)
    main = re.sub(r'<div class="hero-actions">.*?</div>', "", main, flags=re.S)
    main = re.sub(r'<section class="rule-top">\s*<div class="shell"[^>]*text-align:center">.*?</section>', "", main, flags=re.S)
    main = re.sub(r"<script.*?</script>|<style.*?</style>", "", main, flags=re.S)
    main = re.sub(r'<span class="numeral">.*?</span>', "", main, flags=re.S)
    main = re.sub(r'<div class="numeral">.*?</div>', "", main, flags=re.S)
    # Code stays verbatim; everything else is flattened to prose.
    codes = []

    def keep(m):
        codes.append(html.unescape(m.group(1)))
        return f"\n\x00{len(codes) - 1}\x00\n"

    main = re.sub(r'<pre class="code">(.*?)</pre>', keep, main, flags=re.S)
    for tag, prefix in BLOCK.items():
        main = re.sub(rf"<{tag}[^>]*>", "\n" + prefix, main)
    main = re.sub(r"<summary[^>]*>", "\n\nQ: ", main)
    main = re.sub(r'<p class="a">', "\nA: ", main)
    main = re.sub(r"<tr[^>]*>", "\n| ", main)
    main = re.sub(r"</t[hd]>", " | ", main)
    main = re.sub(r"<li[^>]*>", "\n- ", main)
    main = re.sub(r"<(p|div|section)[^>]*>", "\n", main)
    main = re.sub(r'<a href="(/[^"]*|https?://[^"]*)"[^>]*>(.*?)</a>', lambda m: f"{m.group(2)} ({SITE + m.group(1) if m.group(1).startswith('/') else m.group(1)})", main, flags=re.S)
    main = re.sub(r"<[^>]+>", "", main)
    main = html.unescape(main)
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in main.split("\n")]
    out = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    return re.sub(r"\x00(\d+)\x00", lambda m: "```\n" + codes[int(m.group(1))] + "\n```", out)


def render():
    sitemap = (ROOT / "sitemap.xml").read_text()
    order = [l[len(SITE) + 1:] or "index.html" for l in re.findall(r"<loc>(.*?)</loc>", sitemap)]
    parts = [
        "# Mailgi — full site text\n",
        "> Email infrastructure for AI agents. Every page of www.mailgi.xyz as plain text, generated from the HTML.",
        f"> Index: {SITE}/llms.txt · API reference for agents: {SITE}/SKILL.md\n",
    ]
    for name in order:
        if not name.endswith(".html") or name in SKIP:
            continue
        src = (ROOT / name).read_text()
        url = f"{SITE}/" if name == "index.html" else f"{SITE}/{name}"
        modified = re.findall(r'"dateModified":\s*"([^"]+)"', src)
        stamp = f" (updated {max(modified)})" if modified else ""
        parts.append(f"\n\n---\n\nSource: {url}{stamp}\n\n{page_text(src)}")
    return "\n".join(parts).rstrip() + "\n"


def main():
    (ROOT / "llms-full.txt").write_text(render())


if __name__ == "__main__":
    main()
