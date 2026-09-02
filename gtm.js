/* Google Tag Manager container for the marketing site (#75).
 *
 * One container is the single measurement entry point: Google Ads and GA4 get
 * connected from the GTM UI rather than by editing this file again. That is
 * the whole reason it replaced a hand-rolled gtag.js — every subsequent
 * measurement change becomes a UI change, not a deploy.
 *
 * Configure IN THE GTM UI, deliberately not here:
 *   - cross-domain linking www.mailgi.xyz <-> app.mailgi.xyz
 *   - the Google Ads and GA4 tags themselves
 *   - conversion triggers
 *
 * Do NOT report a conversion from this site. The conversion is signup, and it
 * happens on the dashboard, which reports it itself. Firing one on a
 * landing-page click would train automated bidding to buy traffic that never
 * signs up — the most expensive mistake available in this setup.
 *
 * Consent: all four Consent Mode v2 signals are declared `denied` BEFORE the
 * container loads, so the container sets nothing on a first visit. consent.js
 * renders the banner and flips them on Accept. The ordering below is the load-
 * bearing part — defaults must be in the dataLayer before the container reads
 * it, which is why they are pushed synchronously at the top of this file
 * rather than after the script tag is appended.
 *
 * Inert until GTM_ID is filled in: nothing is fetched and no cookie is set
 * while it is blank, so this ships safely before the container exists.
 */
(function () {
  "use strict";

  /* Fill in when the container exists, e.g. "GTM-XXXXXXX". While blank this
   * file installs the consent defaults and the dataLayer event bridge, but
   * loads no third-party script and sets no cookie. */
  var GTM_ID = "GTM-5M7R9FL4";

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  /* Exposed so consent.js can update consent without re-declaring the shim
   * and risking a second, differently-behaved copy. */
  window.mailgiGtag = gtag;

  /* Consent Mode v2. Denied by default, for everyone, before anything loads —
   * the safe default is also the lawful one, and it means an EU visitor who
   * never answers the banner is never tracked by Google.
   *
   * security_storage is intentionally granted: it covers fraud prevention and
   * is not advertising or analytics storage. The four that matter for #76 are
   * the four the banner flips. */
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500,
  });

  /* url_passthrough keeps the gclid on the URL while consent is denied, so a
   * declined visitor is still attributable in Google's own reporting without a
   * cookie. attribution.js does the equivalent for our first-party record. */
  gtag("set", "url_passthrough", true);
  /* Redact ad click ids from any network call made before consent is granted. */
  gtag("set", "ads_data_redaction", true);

  /* ── dataLayer bridge for the intent events ──────────────────────────────
   *
   * GTM triggers on dataLayer events, so the same three intents PostHog
   * records are pushed here too. PostHog keeps its own calls in analytics.js
   * — this does not replace them, and removing either breaks a different
   * dashboard.
   *
   * NOTE: the `app.mailgi.xyz` and `SKILL.md` href substrings are now matched
   * in TWO files, here and in analytics.js. That is the click contract in
   * docs/website-brief.md §2.4 — if you restructure CTA markup, re-check both
   * or one of them silently stops counting.
   *
   * Own listeners rather than a hook into analytics.js, so neither file can
   * break the other. Bubble phase, after attribution.js has already decorated
   * the href in the capture phase. */
  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.indexOf("app.mailgi.xyz") !== -1) {
      window.dataLayer.push({ event: "clicked_dashboard", source_page: window.location.pathname });
    } else if (href.indexOf("SKILL.md") !== -1) {
      window.dataLayer.push({ event: "clicked_skill_md", source_page: window.location.pathname });
    }
  });

  /* `toggle` does not bubble, hence the capture phase. Only the opening of a
   * question is interesting; closing one is not. */
  document.addEventListener(
    "toggle",
    function (event) {
      var el = event.target;
      if (!el || el.tagName !== "DETAILS" || !el.open) return;
      var summary = el.querySelector("summary");
      window.dataLayer.push({
        event: "opened_faq",
        question: summary ? (summary.textContent || "").trim().slice(0, 120) : "",
        source_page: window.location.pathname,
      });
    },
    true,
  );

  /* ── container ───────────────────────────────────────────────────────────
   * Everything above works with no container. Only this last step needs one,
   * and it is skipped entirely while GTM_ID is blank. */
  if (!GTM_ID) return;

  /* Consumed by consent.js, which must not ask for permission to do something
   * this file is not doing. Published AFTER the guard above, so its presence
   * means "a container is loading and will want to store things" — which is a
   * different question from whether the gtag shim exists. consent.js falls
   * back to a direct dataLayer push when the shim is missing, so keying the
   * banner off the shim would conflate the two and break that fallback. */
  window.mailgiGtmEnabled = true;

  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
  document.head.appendChild(s);
})();
