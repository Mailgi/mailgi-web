/* Ad attribution and cross-domain handoff.
 *
 * Why this file exists: the marketing site and the dashboard are separate
 * origins (www.mailgi.xyz and app.mailgi.xyz), and both analytics setups are
 * deliberately cookieless -- sessionStorage on this site, memory on the
 * dashboard. That is the right privacy posture (see analytics.js), but it
 * means a visitor who arrives from an ad and then clicks through to sign up
 * arrives at the dashboard as an unattributable stranger. Every signup would
 * look organic and no ad spend could ever be judged.
 *
 * So the click identifiers travel in the URL instead of in storage: captured
 * here, stashed for the tab session, and appended to every app.mailgi.xyz
 * link at click time. The dashboard reads them back off its own URL.
 *
 * This file is NOT Google's tag and does not replace it. Google's own
 * measurement now arrives via the GTM container in gtm.js (#75), which does
 * set cookies and is gated on consent (#76). An earlier version of this
 * comment argued against ever loading gtag.js and for staying cookieless;
 * that decision was reversed by the owner in favour of native Google Ads
 * measurement and remarketing, so treat this file as the *first-party*
 * record that sits alongside the container rather than as an alternative to
 * it.
 *
 * That first-party copy still earns its place, for two reasons that survive
 * the reversal: a developer audience blocks the Google tag at a high rate, so
 * the container misses conversions this does not; and this runs regardless of
 * consent, because it only writes sessionStorage and sets no cookie. When a
 * visitor declines, this is the only attribution that exists.
 *
 * Load order matters: this file must run BEFORE analytics.js, which reads
 * window.MailgiAttribution and registers it as PostHog super properties so
 * every event -- including the pageview -- carries the campaign that produced
 * it. Both are `defer`, which preserves document order.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mailgi_attribution";

  /* Paid click identifiers, one per network. gclid is ordinary Google Ads;
   * gbraid/wbraid are what Google sends instead when the click came from an
   * iOS app or web-to-app context and gclid is unavailable. Capturing only
   * gclid would silently lose that traffic. msclkid/fbclid/ttclid cost
   * nothing to carry and mean we are not re-editing this file the first time
   * a non-Google channel is tried. */
  var CLICK_IDS = ["gclid", "gbraid", "wbraid", "msclkid", "fbclid", "ttclid"];
  var UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  /* Values go into URLs and into an analytics store, so they are length-capped
   * and stripped of anything that is not plausibly a campaign identifier. A
   * real gclid is ~100 chars of base64url; UTM values we set ourselves. This
   * is defence against a crafted inbound link, not against our own ads. */
  var MAX_VALUE_LENGTH = 256;
  function clean(value) {
    if (typeof value !== "string") return null;
    var trimmed = value.trim().slice(0, MAX_VALUE_LENGTH);
    if (!trimmed) return null;
    return /^[\w .\-|/+:=%]+$/.test(trimmed) ? trimmed : null;
  }

  /* Private browsing and hardened settings throw on storage access rather
   * than returning null, and an analytics nicety must never break the page. */
  function readStored() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function writeStored(value) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* no-op: attribution degrades to page-scoped, the page still works */
    }
  }

  function fromCurrentUrl() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var isPaid = false;

    CLICK_IDS.forEach(function (key) {
      var value = clean(params.get(key));
      if (value) {
        found[key] = value;
        isPaid = true;
      }
    });
    UTM_PARAMS.forEach(function (key) {
      var value = clean(params.get(key));
      if (value) {
        found[key] = value;
        isPaid = true;
      }
    });

    return isPaid ? found : null;
  }

  /* Referrer host only -- never the full referring URL, which can carry the
   * other site's own query string and is more than we need to tell paid from
   * organic from referral. */
  function referrerHost() {
    if (!document.referrer) return null;
    try {
      var host = new URL(document.referrer).hostname;
      return host === window.location.hostname ? null : host;
    } catch (e) {
      return null;
    }
  }

  /* Last non-direct touch wins, scoped to the tab session: a URL carrying
   * campaign parameters always overwrites what was stored, because someone
   * who clicks a second ad is being acquired by that second campaign. In the
   * absence of parameters we keep whatever the session already had, so
   * attribution survives internal navigation from the landing page to
   * pricing to the signup click -- which is the entire point.
   */
  function resolve() {
    var fresh = fromCurrentUrl();
    if (!fresh) {
      var stored = readStored();
      if (stored) return stored;
      fresh = {};
    }

    fresh.landing_page = window.location.pathname;
    var ref = referrerHost();
    if (ref) fresh.referrer_host = ref;

    writeStored(fresh);
    return fresh;
  }

  var attribution = resolve();
  window.MailgiAttribution = attribution;

  /* The handoff. Decoration happens at click time rather than on load so that
   * the HTML crawlers and AI agents fetch stays clean -- the site's whole
   * discovery strategy rests on server-rendered markup, and baking a gclid
   * into every rendered CTA would put campaign junk into indexed pages and
   * into anything that quotes them.
   *
   * Existing parameters on the link win: a hand-written ?invite= or a
   * deliberate ?plan= is intent, and attribution must not clobber it.
   */
  var HANDOFF_KEYS = CLICK_IDS.concat(UTM_PARAMS);

  function decorate(link) {
    var href = link.getAttribute("href") || "";
    if (href.indexOf("app.mailgi.xyz") === -1) return;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (e) {
      return;
    }

    var changed = false;
    HANDOFF_KEYS.forEach(function (key) {
      if (attribution[key] && !url.searchParams.has(key)) {
        url.searchParams.set(key, attribution[key]);
        changed = true;
      }
    });
    if (changed) link.setAttribute("href", url.toString());
  }

  /* Capture phase, so the href is rewritten before analytics.js's own
   * bubble-phase listener reads it and before the browser follows it. Both
   * listeners match on the app.mailgi.xyz substring, which decoration
   * preserves -- see the analytics contract in docs/website-brief.md. */
  document.addEventListener(
    "click",
    function (event) {
      var link = event.target && event.target.closest && event.target.closest("a[href]");
      if (link) decorate(link);
    },
    true,
  );

  /* Middle-click, ctrl-click and "copy link address" never fire a click
   * event, so those paths would hand off an undecorated URL. auxclick covers
   * the first two; contextmenu covers the third. */
  document.addEventListener("auxclick", function (event) {
    var link = event.target && event.target.closest && event.target.closest("a[href]");
    if (link) decorate(link);
  }, true);
  document.addEventListener("contextmenu", function (event) {
    var link = event.target && event.target.closest && event.target.closest("a[href]");
    if (link) decorate(link);
  }, true);
})();
