/* Cookie consent banner (#76).
 *
 * Two buttons, no preferences screen. That is a deliberate product decision
 * (simplicity over granularity), not an oversight: the only cookies in play
 * are the GTM container's, so a category picker would offer a choice that has
 * exactly one axis.
 *
 * WHY THE MARKUP IS INJECTED RATHER THAN SERVER-RENDERED, on a site whose
 * whole rule is server-rendered HTML: that rule exists so AI crawlers can read
 * the *content* (docs/website-brief.md §2.1). A consent notice is the one
 * thing on the page you actively do not want crawled, quoted or indexed.
 * Injecting it means the raw HTML a crawler fetches is untouched, and it
 * guarantees the "no layout shift" requirement for free — nothing in the
 * document flow changes, on load or ever.
 *
 * Consent state is applied on EVERY page load, not just when the banner is
 * shown. A returning visitor who accepted last week has to have consent
 * re-granted before the container decides what to store, otherwise the
 * container sees the `denied` defaults from gtm.js and quietly stores nothing.
 *
 * Only the Google container is gated on this. PostHog is cookieless and
 * attribution.js writes only sessionStorage, so neither waits for consent —
 * gating them would cost us all measurement of declining visitors in exchange
 * for no privacy gain.
 */
(function () {
  "use strict";

  var KEY = "mailgi_consent";
  var GRANTED = "granted";
  var DENIED = "denied";

  /* Stored in a cookie scoped to .mailgi.xyz rather than localStorage, so the
   * choice spans www and app. Accepting here and being asked again on the
   * dashboard is a seam worth one cookie to close — and since cookies are
   * accepted by decision anyway, there is no principled reason to avoid this
   * one. It records the visitor's own preference and tracks nothing.
   *
   * Local dev falls back to localStorage: the Domain attribute below does not
   * apply on localhost and Secure is dropped over plain http, so without a
   * fallback the banner would be undismissable in dev.
   */
  var COOKIE_DOMAIN = ".mailgi.xyz";
  var MAX_AGE = 60 * 60 * 24 * 365;   /* 12 months */

  function onProdDomain() {
    var h = window.location.hostname;
    return h === "mailgi.xyz" || h.slice(-("." + "mailgi.xyz").length) === ".mailgi.xyz";
  }

  /* Hardened browsers throw on storage access rather than returning null, and
   * a consent banner must never be the thing that breaks the page. Every
   * access is guarded and the fallback is "ask again" — the safe direction to
   * fail in. */
  function read() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)mailgi_consent=([^;]*)/);
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {
      /* fall through to storage */
    }
    try {
      return window.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function write(value) {
    if (onProdDomain()) {
      try {
        document.cookie =
          KEY + "=" + encodeURIComponent(value) +
          "; Domain=" + COOKIE_DOMAIN +
          "; Path=/; Max-Age=" + MAX_AGE +
          "; SameSite=Lax; Secure";
        return;
      } catch (e) {
        /* fall through to storage */
      }
    }
    try {
      window.localStorage.setItem(KEY, value);
    } catch (e) {
      /* no-op: the banner reappears next visit, nothing else breaks */
    }
  }

  /* gtm.js publishes the shim. If it somehow has not run, fall back to a
   * direct dataLayer push rather than throwing — the container reads the
   * queue either way. */
  function gtag() {
    if (typeof window.mailgiGtag === "function") {
      window.mailgiGtag.apply(null, arguments);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function applyGranted() {
    gtag("consent", "update", {
      ad_storage: GRANTED,
      ad_user_data: GRANTED,
      ad_personalization: GRANTED,
      analytics_storage: GRANTED,
      functionality_storage: GRANTED,
      personalization_storage: GRANTED,
    });
  }

  var stored = read();

  if (stored === GRANTED) {
    applyGranted();
    return;
  }
  if (stored === DENIED) {
    /* Defaults from gtm.js are already denied; nothing to do but stay quiet. */
    return;
  }

  /* ── the banner ──────────────────────────────────────────────────────────
   * Styling uses the tokens at the top of styles.css so this reads as part of
   * the site rather than a bolted-on widget. Ink ground with off-white text
   * matches the dark bands the pages already use as a device.
   *
   * Not role="dialog": it is not modal, it blocks nothing, and announcing it
   * as a dialog would imply focus is trapped. A labelled region is the honest
   * description.
   */
  function render() {
    var wrap = document.createElement("div");
    wrap.id = "consent";
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Cookie consent");

    var text = document.createElement("p");
    text.className = "consent-text";
    text.textContent =
      "We’d like to set cookies to measure our advertising — they tell us " +
      "which ads bring people here. Declining changes nothing about how the site works.";

    var actions = document.createElement("div");
    actions.className = "consent-actions";

    function button(label, cls, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    }

    function dismiss() {
      wrap.parentNode && wrap.parentNode.removeChild(wrap);
    }

    /* Decline first in the DOM and in reading order. Accept carries the solid
     * treatment because it is the affirmative action, but the choice is not
     * hidden or made harder to reach — a banner that buries Decline is the
     * pattern regulators object to, and it is also just rude. */
    actions.appendChild(
      button("Decline", "consent-btn consent-decline", function () {
        write(DENIED);
        dismiss();
      }),
    );
    actions.appendChild(
      button("Accept", "consent-btn consent-accept", function () {
        write(GRANTED);
        applyGranted();
        dismiss();
      }),
    );

    wrap.appendChild(text);
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
