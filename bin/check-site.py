#!/usr/bin/env python3
"""Check every page against the rules that keep the site findable.

Brief §2.2 lists files that must stay in sync with each other, and they drift
silently: a page missing from the sitemap, a visible FAQ that no longer matches
its JSON-LD, a description long enough to be cut off mid-sentence. This script
catches those before they ship. Standard library only, so it runs anywhere
without an install step.

    python3 bin/check-site.py          # exit 1 on any error
"""

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.mailgi.xyz"
SKIP = {"404.html"}            # served on errors, never indexed
NOT_IN_LLMS = set()            # pages deliberately left out of llms.txt
TITLE_MAX, DESC_MAX = 60, 160

errors = []


def err(page, msg):
    errors.append(f"{page}: {msg}")


def text(fragment):
    """Visible text of an HTML fragment, whitespace collapsed."""
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.links, self.hrefs, self.h1 = {}, {}, [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta[key] = a.get("content", "")
        elif tag == "link" and a.get("rel"):
            self.links[a["rel"]] = a.get("href", "")
        elif tag == "a" and a.get("href"):
            self.hrefs.append(a["href"])
        elif tag == "h1":
            self.h1 += 1


def jsonld_nodes(src, page):
    nodes = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S):
        try:
            data = json.loads(block)
        except json.JSONDecodeError as e:
            err(page, f"JSON-LD does not parse: {e}")
            continue
        for item in data if isinstance(data, list) else [data]:
            nodes.extend(item.get("@graph", [item]))
    return nodes


def url_for(name):
    return f"{SITE}/" if name == "index.html" else f"{SITE}/{name}"


def main():
    pages = sorted(p.name for p in ROOT.glob("*.html") if p.name not in SKIP)
    sitemap = (ROOT / "sitemap.xml").read_text()
    llms = (ROOT / "llms.txt").read_text()
    lastmods = dict(re.findall(r"<loc>(.*?)</loc>\s*<lastmod>(.*?)</lastmod>", sitemap))
    locs = re.findall(r"<loc>(.*?)</loc>", sitemap)

    for loc in locs:
        if loc not in lastmods:
            err("sitemap.xml", f"{loc} has no <lastmod>")
        target = loc[len(SITE) + 1:] or "index.html"
        if not (ROOT / target).exists():
            err("sitemap.xml", f"{loc} points at a file that does not exist")

    for name in pages:
        src = (ROOT / name).read_text()
        p = Page()
        p.feed(src)
        url = url_for(name)

        title = text((re.search(r"<title>(.*?)</title>", src, re.S) or [None, ""])[1])
        desc = p.meta.get("description", "")
        if not title:
            err(name, "no <title>")
        elif len(title) > TITLE_MAX:
            err(name, f"title is {len(title)} chars (max {TITLE_MAX}): {title}")
        if not desc:
            err(name, "no meta description")
        elif len(desc) > DESC_MAX:
            err(name, f"description is {len(desc)} chars (max {DESC_MAX})")
        if p.links.get("canonical") != url:
            err(name, f"canonical is {p.links.get('canonical')!r}, expected {url}")
        if p.h1 != 1:
            err(name, f"{p.h1} <h1> elements, expected 1")
        for key in ("og:title", "og:description", "og:url", "og:image", "twitter:card"):
            if key not in p.meta:
                err(name, f"missing {key}")
        if p.meta.get("og:url", url) != url:
            err(name, f"og:url is {p.meta['og:url']}, expected {url}")

        if url not in locs:
            err(name, "not in sitemap.xml")
        if name not in NOT_IN_LLMS and url not in llms and name != "index.html":
            err(name, "not linked from llms.txt")

        nodes = jsonld_nodes(src, name)
        modified = [n["dateModified"] for n in nodes if "dateModified" in n]
        if modified and url in lastmods and lastmods[url] != max(modified):
            err(name, f"sitemap lastmod {lastmods[url]} != JSON-LD dateModified {max(modified)}")

        # Visible FAQ and FAQPage JSON-LD say the same things in two places by
        # design (brief §2.2); the questions must match one for one.
        faq = [n for n in nodes if n.get("@type") == "FAQPage"]
        visible = [text(re.sub(r'<span class="numeral">.*?</span>', "", s))
                   for s in re.findall(r"<details[^>]*>\s*<summary[^>]*>(.*?)</summary>", src, re.S)]
        if faq:
            declared = [q["name"] for q in faq[0]["mainEntity"]]
            for q in declared:
                if q not in visible:
                    err(name, f"FAQ JSON-LD question not visible on the page: {q!r}")
            for q in visible:
                if q not in declared:
                    err(name, f"visible FAQ question missing from JSON-LD: {q!r}")

        for href in p.hrefs:
            if href.startswith(SITE):
                href = href[len(SITE):] or "/"
            if not href.startswith("/") or href.startswith("//"):
                continue
            path = href.split("#")[0].split("?")[0]
            target = ROOT / (path.lstrip("/") or "index.html")
            if not target.exists() and not target.with_suffix(".html").exists():
                err(name, f"broken internal link {href}")

    if errors:
        print("\n".join(errors))
        print(f"\n{len(errors)} problem(s)")
        sys.exit(1)
    print(f"ok: {len(pages)} pages")


if __name__ == "__main__":
    main()
