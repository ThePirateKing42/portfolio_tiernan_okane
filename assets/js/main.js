// ===== Page enter transition =====
document.addEventListener("DOMContentLoaded", function () {
  requestAnimationFrame(function () {
    document.body.classList.add("page-ready");
  });
});

// Handle back/forward cache (Safari/Firefox bfcache) so the page
// doesn't stay invisible if restored from cache mid-transition.
window.addEventListener("pageshow", function (e) {
  document.body.classList.remove("page-leaving");
  document.body.classList.add("page-ready");
});

// ===== Fast fade/slide transition on internal link clicks =====
document.addEventListener("click", function (e) {
  var link = e.target.closest("a");
  if (!link) return;

  var href = link.getAttribute("href");
  if (!href) return;

  // Skip: external links, new-tab links, mailto/tel, anchors, downloads,
  // and anything already handled (e.g. copy-email buttons).
  if (
    link.target === "_blank" ||
    link.hasAttribute("download") ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("http") ||
    link.classList.contains("js-copy-email")
  ) {
    return;
  }

  e.preventDefault();
  document.body.classList.remove("page-ready");
  document.body.classList.add("page-leaving");

  setTimeout(function () {
    window.location.href = href;
  }, 170);
});

// ===== Copy-email button =====
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".js-copy-email").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var email = btn.getAttribute("data-email");
      if (!email || !navigator.clipboard) return; // fall back to mailto default

      e.preventDefault();
      navigator.clipboard
        .writeText(email)
        .then(function () {
          var original = btn.textContent;
          btn.textContent = "Copied ✓";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("copied");
          }, 1600);
        })
        .catch(function () {
          window.location.href = "mailto:" + email;
        });
    });
  });
});
