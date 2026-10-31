#!/usr/bin/env python3
"""Which AI and search crawlers fetched which pages, from Railway's HTTP logs.

The site moved to Railway so crawler fetches would show up in request logs
(brief §2.1). Railway keeps HTTP logs per deployment, and this site deploys on
every merge, so `railway logs --http` alone only shows the latest deploy. This
walks every deployment in the window instead.

Caveat found on first run (2026-10-31): HTTP logs of replaced deployments were
already empty, so a window only covers deployments still holding logs. For a
real trend, run this on a schedule and keep the output, or add a log drain.

Needs the Railway CLI, logged in (`railway login`). Standard library only.

    python3 bin/crawler-report.py            # last 7 days
    python3 bin/crawler-report.py --days 30
"""

import argparse
import collections
import datetime as dt
import json
import subprocess

PROJECT, SERVICE, ENV = "Mailgi", "mailgi-web", "production"

# Substring of the user agent -> who it is. Order matters: first match wins.
BOTS = [
    ("GPTBot", "OpenAI training"), ("OAI-SearchBot", "ChatGPT search"), ("ChatGPT-User", "ChatGPT user fetch"),
    ("ClaudeBot", "Anthropic training"), ("Claude-SearchBot", "Claude search"), ("Claude-User", "Claude user fetch"),
    ("PerplexityBot", "Perplexity index"), ("Perplexity-User", "Perplexity user fetch"),
    ("Google-Extended", "Gemini"), ("Googlebot", "Google"), ("bingbot", "Bing"), ("Applebot", "Apple"),
    ("meta-externalagent", "Meta AI"), ("Amazonbot", "Amazon"), ("Bytespider", "ByteDance"), ("CCBot", "Common Crawl"),
    ("DuckAssistBot", "DuckDuckGo AI"), ("MistralAI-User", "Mistral"), ("YandexBot", "Yandex"),
]


def railway(*args, check=True):
    return subprocess.run(["railway", *args, "-p", PROJECT, "-s", SERVICE, "-e", ENV],
                          capture_output=True, text=True, check=check).stdout


def deployments(since):
    """Every deployment that was serving at some point in the window: those
    created inside it, plus the one that was live when it opened."""
    rows = json.loads(railway("deployment", "list", "--json", "--limit", "200"))
    rows = [r for r in rows if r["status"] in ("SUCCESS", "REMOVED")]
    rows.sort(key=lambda r: r["createdAt"])
    at = lambda r: dt.datetime.fromisoformat(r["createdAt"].replace("Z", "+00:00"))
    keep = [r for i, r in enumerate(rows) if at(r) >= since or (i + 1 < len(rows) and at(rows[i + 1]) >= since)]
    return [r["id"] for r in keep]


def requests_for(deployment, since):
    # Logs of long-removed deployments can be gone; skip rather than fail.
    out = railway("logs", deployment, "--http", "--json", "-n", "5000", check=False)
    for line in out.splitlines():
        if line.startswith("{"):
            row = json.loads(line)
            if dt.datetime.fromisoformat(row["timestamp"][:26] + "+00:00") >= since:
                yield row


def who(ua):
    for needle, name in BOTS:
        if needle.lower() in (ua or "").lower():
            return name
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    days = ap.parse_args().days
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)

    by_bot = collections.Counter()
    pages = collections.defaultdict(collections.Counter)
    first_seen = {}
    total = 0
    for dep in deployments(since):
        for r in requests_for(dep, since):
            total += 1
            bot = who(r.get("clientUa"))
            if not bot:
                continue
            by_bot[bot] += 1
            pages[bot][r["path"]] += 1
            key = (bot, r["path"])
            first_seen[key] = min(first_seen.get(key, r["timestamp"]), r["timestamp"])

    print(f"Crawler report, last {days} days ({total} requests, {sum(by_bot.values())} from known crawlers)\n")
    for bot, n in by_bot.most_common():
        top = ", ".join(f"{p} ({c})" for p, c in pages[bot].most_common(8))
        print(f"{bot:24} {n:5}  {top}")
    agent_files = [(b, p) for (b, p) in first_seen if p in ("/SKILL.md", "/llms.txt", "/llms-full.txt")]
    print("\nAgent-facing files fetched by:", ", ".join(sorted({f'{b} {p}' for b, p in agent_files})) or "nobody")


if __name__ == "__main__":
    main()
