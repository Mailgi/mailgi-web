/* Live system status for the footer indicator.
 *
 * The design calls for a green pulsing dot reading "all systems online".
 * Hardcoding that would be a claim the page cannot back up — and it would be
 * a lie precisely when it matters most, during an outage. Since the API
 * already exposes a real readiness check that covers both Postgres and the
 * mail server, the indicator reflects it instead.
 *
 * Degrades honestly: the static HTML ships "system status" in a neutral
 * state, so a crawler or a JS-less visitor sees a plain link rather than an
 * unverified boast, and a failed fetch simply leaves it that way.
 */
(function () {
  var el = document.getElementById("status");
  if (!el) return;
  var label = el.querySelector(".status-text");

  fetch("https://api.mailgi.xyz/health/ready", { mode: "cors", cache: "no-store" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (body) {
      if (!body) {
        el.setAttribute("data-state", "down");
        label.textContent = "degraded";
        return;
      }
      var checks = body.checks || {};
      var allOk =
        body.status === "ok" &&
        Object.keys(checks).every(function (k) {
          return checks[k] === "ok";
        });
      el.setAttribute("data-state", allOk ? "ok" : "down");
      label.textContent = allOk ? "all systems online" : "degraded";
    })
    .catch(function () {
      // Network error tells us nothing reliable about the API's health —
      // it could equally be the visitor's connection — so say nothing
      // rather than assert an outage.
      el.setAttribute("data-state", "unknown");
      label.textContent = "system status";
    });
})();
