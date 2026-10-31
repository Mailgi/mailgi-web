#!/usr/bin/env python3
"""Set <lastmod> on every sitemap.xml entry.

A page's lastmod is its JSON-LD dateModified when it has one — that is the
date its content last changed, which is what crawlers want to know — and
otherwise the date of the file's last commit. The URL list, changefreq and
priority are left exactly as written; only <lastmod> is rewritten.

    python3 bin/update-sitemap.py
"""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.mailgi.xyz"


def lastmod(name):
    path = ROOT / name
    dates = []
    if path.suffix == ".html":
        src = path.read_text()
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S):
            data = json.loads(block)
            dates += [n["dateModified"] for n in data.get("@graph", [data]) if "dateModified" in n]
    if dates:
        return max(dates)
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", name],
                         cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out or subprocess.run(["date", "+%Y-%m-%d"], capture_output=True, text=True).stdout.strip()


def main():
    path = ROOT / "sitemap.xml"
    xml = re.sub(r"\s*<lastmod>.*?</lastmod>", "", path.read_text())

    def add(m):
        loc = m.group(1)
        name = loc[len(SITE) + 1:] or "index.html"
        return f"{m.group(0)}\n    <lastmod>{lastmod(name)}</lastmod>"

    path.write_text(re.sub(r"<loc>(.*?)</loc>", add, xml))


if __name__ == "__main__":
    main()
