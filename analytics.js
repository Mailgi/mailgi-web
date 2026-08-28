/* Website analytics (#55).
 *
 * The loader below is PostHog's own current snippet, pasted verbatim from
 * the project's setup page — don't hand-edit it; replace it wholesale if
 * PostHog issues a new one.
 *
 * The project API key is public by design: it only permits *writing* events,
 * never reading data, and PostHog intends it to ship in a browser bundle.
 * That's why it's committed here rather than injected at deploy time.
 *
 * Config choices worth knowing about:
 *
 * - persistence: "sessionStorage" — no cookie, so no cross-site tracking and
 *   nothing persisted beyond the tab session. Note this is a deliberate
 *   middle ground: "memory" would be maximally private but assigns a new
 *   anonymous id on *every page load*, which makes unique-visitor counts
 *   meaningless — and "how many people are finding us" is the whole question
 *   this is here to answer.
 *
 * - autocapture: false — these are static marketing pages. A pageview plus
 *   the two outbound clicks that signal intent is the useful signal;
 *   recording every click would be more data and less insight.
 *
 * - session recording off — nothing sensitive on these pages today, but it's
 *   off by default on both surfaces so it can't get switched on by accident
 *   (see the dashboard's analytics.ts for the case where it genuinely matters).
 */
(function () {
  var POSTHOG_KEY = "phc_nGKKLpWd6d9zuDQ7XfBVqnfp79SLmmru6iQqRnDkeN88";
  var POSTHOG_HOST = "https://eu.i.posthog.com";

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="jo Bo Ho init ul hl al ol fl Sa ll gl rl capture getExtension dl No kl calculateEventProperties wl register register_once register_for_session unregister unregister_for_session Tl sl Sl getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Ml identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset El shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty xl bl createPersonProfile setInternalOrTestUser Cl Uo zo opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing ml debug xa Rn getPageViewId captureTraceFeedback captureTraceMetric Xo".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    persistence: 'sessionStorage',
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
  });

  // The two clicks that actually indicate intent, rather than every link.
  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.indexOf("app.mailgi.xyz") !== -1) posthog.capture("clicked_dashboard");
    else if (href.indexOf("SKILL.md") !== -1) posthog.capture("clicked_skill_md");
  });
})();
