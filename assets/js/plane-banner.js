// ===== Plane banner =====
// The plane flies along a continuously changing, smooth path. The links trail
// behind it as plain text, following the same curved path and rotating to the
// local tangent so the group reads like fabric being towed through the air.
(function () {
  "use strict";

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function init() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 720) return;

    var stage = document.querySelector(".hero");
    var linksContainer = document.getElementById("bannerLinks");
    if (!stage || !linksContainer) return;

    var links = Array.prototype.slice.call(
      linksContainer.querySelectorAll(".pill-link")
    );
    if (!links.length) return;

    linksContainer.classList.add("banner-mode");

    links.forEach(function (link) {
      link.classList.add("banner-link");
      stage.appendChild(link);
    });

    var plane = document.createElement("div");
    plane.className = "plane-rig";
    plane.setAttribute("aria-hidden", "true");
    plane.innerHTML =
      '<svg class="plane-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M31 4h3l4 24 19 8v5l-19-3-3 12 8 7v3l-10-5-10 5v-3l8-7-3-12-19 3v-5l19-8 4-24z" fill="var(--ink)"/>' +
      "</svg>";
    stage.appendChild(plane);

    var w = 0;
    var h = 0;

    function measure() {
      var rect = stage.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
    }

    measure();
    window.addEventListener("resize", measure);

    function randomPoint() {
      var marginX = Math.min(100, w * 0.12);
      var marginY = Math.min(85, h * 0.14);
      return {
        x: marginX + Math.random() * Math.max(1, w - marginX * 2),
        y: marginY + Math.random() * Math.max(1, h - marginY * 2)
      };
    }

    var pos = { x: w / 2, y: h * 0.42 };
    var target = randomPoint();
    var heading = Math.random() * Math.PI * 2;
    var turnVelocity = 0;
    var speed = 0.082;

    // Measure the actual text widths so the links sit naturally one after
    // another instead of relying on a fixed offset.
    var linkWidths = links.map(function (link) {
      return link.getBoundingClientRect().width;
    });

    var bannerOffsets = [];
    var runningOffset = 33;
    var gap = 28;

    linkWidths.forEach(function (width) {
      runningOffset += width / 2;
      bannerOffsets.push(runningOffset);
      runningOffset += width / 2 + gap;
    });

    // A distance-based trail means the banner keeps its spacing even while
    // the plane changes speed slightly or bends through a turn.
    var trailMax = 1500;
    var trail = [];
    var trailDistance = 0;
    var initialStep = speed * 16.67;

    for (var i = trailMax - 1; i >= 0; i--) {
      var seedDistance = i * initialStep;
      trail.push({
        x: pos.x - Math.cos(heading) * seedDistance,
        y: pos.y - Math.sin(heading) * seedDistance,
        d: -seedDistance,
        angle: heading
      });
    }

    // Catmull-Rom interpolation turns the sampled flight path into a smooth
    // curve. This is what keeps the text from making visible angular bends.
    function smoothPointAtDistance(distance) {
      if (trail.length < 4) return trail[trail.length - 1];

      var first = trail[0];
      var last = trail[trail.length - 1];
      if (distance <= first.d) return first;
      if (distance >= last.d) return last;

      var hi = 1;
      while (hi < trail.length && trail[hi].d < distance) hi++;
      var p0 = trail[Math.max(0, hi - 2)];
      var p1 = trail[Math.max(0, hi - 1)];
      var p2 = trail[Math.min(trail.length - 1, hi)];
      var p3 = trail[Math.min(trail.length - 1, hi + 1)];

      var span = Math.max(0.0001, p2.d - p1.d);
      var t = clamp((distance - p1.d) / span, 0, 1);
      var t2 = t * t;
      var t3 = t2 * t;

      function interpolate(a, b, c, d) {
        return 0.5 * (
          2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3
        );
      }

      var x = interpolate(p0.x, p1.x, p2.x, p3.x);
      var y = interpolate(p0.y, p1.y, p2.y, p3.y);

      // Derivative of the Catmull-Rom curve gives the exact local direction
      // for the text rotation.
      var dx = 0.5 * (
        (p2.x - p0.x) +
        2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t +
        3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2
      );
      var dy = 0.5 * (
        (p2.y - p0.y) +
        2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t +
        3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2
      );

      return {
        x: x,
        y: y,
        angle: Math.atan2(dy, dx)
      };
    }

    var lastT = null;

    function frame(t) {
      if (lastT == null) lastT = t;
      var dt = Math.min(40, t - lastT);
      lastT = t;

      var dx = target.x - pos.x;
      var dy = target.y - pos.y;
      var distanceToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distanceToTarget < 65) {
        target = randomPoint();
      }

      var desired = Math.atan2(dy, dx);
      var angleDifference = normalizeAngle(desired - heading);

      // Smooth steering: turn velocity changes gradually, avoiding sharp
      // direction changes that would make the banner look like a polygon.
      var desiredTurn = clamp(angleDifference * 0.0017, -0.0018, 0.0018);
      turnVelocity += (desiredTurn - turnVelocity) * Math.min(1, dt * 0.0045);
      turnVelocity = clamp(turnVelocity, -0.0024, 0.0024);
      heading += turnVelocity * dt;

      var oldX = pos.x;
      var oldY = pos.y;
      pos.x += Math.cos(heading) * speed * dt;
      pos.y += Math.sin(heading) * speed * dt;

      // Turn the plane back toward the page instead of letting it disappear.
      var edge = 55;
      if (pos.x < edge || pos.x > w - edge) {
        target.x = w / 2 + (w / 2 - pos.x) * 0.8;
      }
      if (pos.y < edge || pos.y > h - edge) {
        target.y = h / 2 + (h / 2 - pos.y) * 0.8;
      }
      pos.x = clamp(pos.x, 18, Math.max(18, w - 18));
      pos.y = clamp(pos.y, 18, Math.max(18, h - 18));

      trailDistance += Math.sqrt(
        Math.pow(pos.x - oldX, 2) + Math.pow(pos.y - oldY, 2)
      );

      trail.push({
        x: pos.x,
        y: pos.y,
        d: trailDistance,
        angle: heading
      });
      if (trail.length > trailMax) trail.shift();

      var planeDeg = (heading * 180) / Math.PI + 90;
      plane.style.transform =
        "translate(" + (pos.x - 17) + "px," + (pos.y - 17) + "px) rotate(" + planeDeg + "deg)";

      links.forEach(function (link, index) {
        var point = smoothPointAtDistance(trailDistance - bannerOffsets[index]);
        var angleDeg = (point.angle * 180) / Math.PI;

        link.style.transform =
          "translate(" + point.x + "px," + point.y + "px) translate(-50%, -50%) rotate(" + angleDeg + "deg)";
      });

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
