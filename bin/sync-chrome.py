#!/usr/bin/env python3
"""Copy the shared nav and footer into every page.

There is no build step (brief §3), so the nav and footer are written out in
full on every page. Edit them once in bin/chrome/, run this, commit the result.
The served HTML stays plain, complete and crawler-readable; this only saves
hand-editing the same block in every file.

The current page's own link gets aria-current="page".

    python3 bin/sync-chrome.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = Path(__file__).resolve().parent / "chrome"
BLOCKS = {
    "nav": (re.compile(r'<nav class="nav shell">.*?</nav>', re.S), (CHROME / "nav.html").read_text().strip()),
    "footer": (re.compile(r'<footer class="footer">.*?</footer>', re.S), (CHROME / "footer.html").read_text().strip()),
}


def mark_current(nav, name):
    href = "/" if name == "index.html" else f"/{name}"
    # The first plain link to this page (not the brand logo, not the menu trigger).
    pattern = re.compile(rf'(<a href="{re.escape(href)}")(>)')
    return pattern.sub(r'\1 aria-current="page"\2', nav, count=1)


def main():
    changed = []
    for page in sorted(ROOT.glob("*.html")):
        src = page.read_text()
        out = src
        for key, (pattern, block) in BLOCKS.items():
            if key == "nav":
                block = mark_current(block, page.name)
            out = pattern.sub(lambda _: block, out, count=1)
        if out != src:
            page.write_text(out)
            changed.append(page.name)
    print("updated:", ", ".join(changed) if changed else "nothing")


if __name__ == "__main__":
    main()
