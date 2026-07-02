(function () {
  var script = document.currentScript;
  if (!script) return;

  var siteKey = script.getAttribute("data-site");
  if (!siteKey) return;

  var origin;
  try {
    origin = new URL(script.src).origin;
  } catch {
    return;
  }
  if (!origin) return;

  var COLLECT_URL = origin + "/api/collect";
  var HEARTBEAT_URL = origin + "/api/heartbeat";
  var HEARTBEAT_INTERVAL = 15000;

  function getVisitorId() {
    var key = "sm_vid";
    try {
      var id = localStorage.getItem(key);
      if (!id) {
        id =
          window.crypto && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(16) + Math.random().toString(16).slice(2);
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return "anon-" + Math.random().toString(16).slice(2);
    }
  }

  var visitorId = getVisitorId();
  var lastPath = null;

  function send(url, payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    try {
      fetch(url, {
        method: "POST",
        body: body,
        headers: { "Content-Type": "text/plain" },
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }

  function trackPageview() {
    var path = location.pathname + location.search;
    if (path === lastPath) return;
    lastPath = path;
    send(COLLECT_URL, {
      siteKey: siteKey,
      visitorId: visitorId,
      path: path,
      referrer: document.referrer || null,
    });
  }

  trackPageview();

  var origPushState = history.pushState;
  history.pushState = function () {
    var result = origPushState.apply(this, arguments);
    trackPageview();
    return result;
  };

  var origReplaceState = history.replaceState;
  history.replaceState = function () {
    var result = origReplaceState.apply(this, arguments);
    trackPageview();
    return result;
  };

  window.addEventListener("popstate", trackPageview);

  var heartbeatTimer = null;

  function sendHeartbeat() {
    send(HEARTBEAT_URL, { siteKey: siteKey, visitorId: visitorId });
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () {
      if (document.visibilityState === "visible") sendHeartbeat();
    }, HEARTBEAT_INTERVAL);
  }

  startHeartbeat();

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") sendHeartbeat();
  });

  window.addEventListener("pagehide", sendHeartbeat);
})();
