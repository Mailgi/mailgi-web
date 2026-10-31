#!/usr/bin/env bash
# Tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) that pages changed.
# Bing's index is what ChatGPT search and Copilot read from, so a page Bing
# hasn't crawled is a page those assistants can't cite. Google ignores IndexNow;
# it reads sitemap.xml.
#
# The key is not a secret: IndexNow proves ownership by fetching it from
# https://www.mailgi.xyz/fe93e7cc883db5bd049b9b11bbb7b222.txt.
#
# Usage, after a deploy is live:
#   bin/indexnow.sh                          # every URL in sitemap.xml
#   bin/indexnow.sh /faq.html /docs.html     # just these

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

KEY=fe93e7cc883db5bd049b9b11bbb7b222
HOST=www.mailgi.xyz

if [ $# -gt 0 ]; then
  urls=$(printf 'https://%s%s\n' "$HOST" "$@")
else
  urls=$(sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' sitemap.xml)
fi

list=$(printf '%s\n' $urls | sed 's/.*/"&"/' | paste -sd, -)
curl -sS -o /dev/null -w "IndexNow: HTTP %{http_code}\n" -X POST https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[$list]}"
