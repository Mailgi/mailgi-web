/* Pins the consent cookie contract.  node test/consent.test.js
 *
 * No framework and no dependencies, deliberately: this site has no build step
 * (docs/website-brief.md §3) and one assertion file is not a reason to acquire
 * a toolchain. Plain node, exits non-zero on failure.
 *
 * WHY THIS EXISTS AT ALL. The cookie carries `Secure`, so on localhost and in
 * any jsdom harness the code takes the localStorage fallback branch instead —
 * which means the cookie path is exercised *only in production*. A mismatch
 * between this file's attribute string and the dashboard's would therefore not
 * fail any test; it would surface as visitors being re-prompted when they cross
 * from www.mailgi.xyz to app.mailgi.xyz, with no error anywhere. The string is
 * pinned here so a drift is a test failure rather than a support ticket.
 *
 * And WHY NOT jsdom: its cookie jar serves from localhost and silently rejects
 * both `Domain=.mailgi.xyz` and `Secure`. A test that writes through the real
 * jar and then reads it back can pass while asserting on nothing. This fakes
 * the hostname and intercepts the `document.cookie` setter, so what is checked
 * is the exact string the browser would receive.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "consent.js"), "utf8");

let failures = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) console.log(`        expected: ${expected}\n        actual:   ${actual}`);
}
function checkMatch(name, actual, re) {
  const ok = re.test(actual);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) console.log(`        ${re} did not match: ${actual}`);
}

/* Minimal DOM. Only what consent.js touches — an element stub deep enough for
 * the banner to build, and a document.cookie setter we can observe. */
function makeEnv({ hostname, cookie = "", storage = {} }) {
  const written = { cookies: [], storage: {} };
  const listeners = {};

  function el(tag) {
    return {
      tagName: (tag || "").toUpperCase(),
      children: [],
      style: {},
      id: "",
      className: "",
      textContent: "",
      type: "",
      parentNode: null,
      setAttribute() {},
      addEventListener(ev, fn) { this["on:" + ev] = fn; },
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { this.children = this.children.filter((x) => x !== c); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    };
  }

  const body = el("body");
  const doc = {
    readyState: "complete",
    body,
    createElement: el,
    addEventListener(ev, fn) { listeners[ev] = fn; },
    getElementById: () => null,
    get cookie() { return cookie; },
    set cookie(v) { written.cookies.push(v); },
  };

  const win = {
    location: { hostname, search: "", pathname: "/", href: "https://" + hostname + "/" },
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { written.storage[k] = v; },
      removeItem: (k) => { delete storage[k]; },
    },
    dataLayer: [],
  };

  const sandbox = { window: win, document: doc, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { win, doc, body, written };
}

console.log("consent cookie contract");

/* ── 1. the exact attribute string, on a production hostname ─────────────── */
{
  const { body, written } = makeEnv({ hostname: "www.mailgi.xyz" });
  const banner = body.children[0];
  const accept = banner.children[1].children[1];      // actions -> [Decline, Accept]
  accept["on:click"]();

  check("Accept writes exactly one cookie", written.cookies.length, 1);
  const c = written.cookies[0] || "";
  check("  name=value", c.split(";")[0], "mailgi_consent=granted");
  checkMatch("  Domain=.mailgi.xyz", c, /;\s*Domain=\.mailgi\.xyz(;|$)/);
  checkMatch("  Path=/", c, /;\s*Path=\/(;|$)/);
  checkMatch("  SameSite=Lax", c, /;\s*SameSite=Lax(;|$)/);
  checkMatch("  Secure", c, /;\s*Secure(;|$)/);
  checkMatch("  Max-Age is 12 months", c, /;\s*Max-Age=31536000(;|$)/);
  check("  no localStorage write on prod host", Object.keys(written.storage).length, 0);
}

/* ── 2. Decline persists too — an unrecorded Decline re-prompts forever ──── */
{
  const { body, written } = makeEnv({ hostname: "www.mailgi.xyz" });
  const banner = body.children[0];
  banner.children[1].children[0]["on:click"]();       // Decline
  check("Decline writes a cookie", written.cookies.length, 1);
  check("  value is denied", (written.cookies[0] || "").split(";")[0], "mailgi_consent=denied");
}

/* ── 3. localhost takes the storage fallback, never the cookie ──────────── */
{
  const { body, written } = makeEnv({ hostname: "localhost" });
  const banner = body.children[0];
  banner.children[1].children[1]["on:click"]();       // Accept
  check("localhost writes no cookie", written.cookies.length, 0);
  check("  falls back to localStorage", written.storage.mailgi_consent, "granted");
}

/* ── 4. read precedence: a cookie set on www must win on app ─────────────── */
{
  const { body, win } = makeEnv({
    hostname: "app.mailgi.xyz",
    cookie: "mailgi_consent=granted",
    storage: { mailgi_consent: "denied" },            // stale local value
  });
  check("stored choice suppresses the banner", body.children.length, 0);
  const updates = win.dataLayer.filter((a) => a[0] === "consent" && a[1] === "update");
  check("  and re-grants consent on load", updates.length, 1);
  check("  cookie beats localStorage", updates.length ? updates[0][2].ad_storage : null, "granted");
}

/* ── 5. a declined visitor is never granted ─────────────────────────────── */
{
  const { body, win } = makeEnv({ hostname: "www.mailgi.xyz", cookie: "mailgi_consent=denied" });
  check("declined: no banner", body.children.length, 0);
  check("  and no consent update", win.dataLayer.filter((a) => a[0] === "consent").length, 0);
}

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
