/* ============================================================
   Sliding Puzzle — landing page interactions
   - A real, playable 3x3 sliding puzzle (move-based shuffle,
     so it is always solvable — just like the game).
   - Sticky-nav shadow, mobile menu, scroll reveal, copy button.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Interactive puzzle ---------- */
  var SIZE = 3;
  var BLANK = SIZE * SIZE - 1;            // value 8 is the empty tile
  var HERO_IMG = "media/hero.jpg";
  var board = [];                         // board[position] = tile value
  var moves = 0;
  var solved = true;

  var puzzleEl = document.getElementById("puzzle");
  var moveCountEl = document.getElementById("move-count");
  var statusEl = document.getElementById("demo-status");
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function solvedBoard() {
    var a = [];
    for (var i = 0; i < SIZE * SIZE; i++) a.push(i);
    return a;
  }

  function bgPosition(value) {
    // value maps to a slice of the image; (SIZE-1) steps across 0..100%.
    var r = Math.floor(value / SIZE);
    var c = value % SIZE;
    var step = 100 / (SIZE - 1);
    return (c * step) + "% " + (r * step) + "%";
  }

  function render() {
    puzzleEl.innerHTML = "";
    for (var pos = 0; pos < board.length; pos++) {
      var value = board[pos];
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.style.setProperty("--img", "url(" + HERO_IMG + ")");
      if (value === BLANK) {
        tile.classList.add("blank");
        tile.setAttribute("aria-hidden", "true");
        tile.tabIndex = -1;
      } else {
        tile.style.backgroundPosition = bgPosition(value);
        tile.setAttribute("aria-label", "Tile " + (value + 1));
        if (value === pos && !solved) tile.classList.add("solved-cell");
        (function (p) {
          tile.addEventListener("click", function () { tryMove(p); });
        })(pos);
      }
      puzzleEl.appendChild(tile);
    }
    moveCountEl.textContent = moves;
  }

  function blankPos() { return board.indexOf(BLANK); }

  function neighbors(pos) {
    var r = Math.floor(pos / SIZE), c = pos % SIZE, out = [];
    if (r > 0) out.push(pos - SIZE);
    if (r < SIZE - 1) out.push(pos + SIZE);
    if (c > 0) out.push(pos - 1);
    if (c < SIZE - 1) out.push(pos + 1);
    return out;
  }

  function swap(a, b) { var t = board[a]; board[a] = board[b]; board[b] = t; }

  function isSolved() {
    for (var i = 0; i < board.length; i++) if (board[i] !== i) return false;
    return true;
  }

  function tryMove(pos) {
    var blank = blankPos();
    if (neighbors(pos).indexOf(blank) === -1) return;  // not adjacent
    swap(pos, blank);
    moves++;
    if (isSolved()) {
      solved = true;
      statusEl.textContent = "Solved in " + moves + " moves — nice.";
      statusEl.classList.add("win");
    }
    render();
  }

  function shuffle() {
    board = solvedBoard();
    // Move-based scramble (mirrors the game): random valid moves only,
    // never an immediate reversal, so the result is always solvable.
    var last = -1, count = reduceMotion ? 30 : 60;
    for (var i = 0; i < count; i++) {
      var blank = blankPos();
      var opts = neighbors(blank).filter(function (n) { return n !== last; });
      var pick = opts[Math.floor(Math.random() * opts.length)];
      last = blank;
      swap(blank, pick);
    }
    if (isSolved()) swap(0, 1);  // guarantee it doesn't start solved
    moves = 0;
    solved = false;
    statusEl.textContent = "Move tiles into the empty space";
    statusEl.classList.remove("win");
    render();
  }

  function reset() {
    board = solvedBoard();
    moves = 0;
    solved = true;
    statusEl.textContent = "Move tiles into the empty space";
    statusEl.classList.remove("win");
    render();
  }

  if (puzzleEl) {
    var img = new Image();
    img.onload = shuffle;
    img.onerror = shuffle;   // still playable if the image is missing
    img.src = HERO_IMG;
    var sBtn = document.getElementById("shuffle-btn");
    var rBtn = document.getElementById("reset-btn");
    if (sBtn) sBtn.addEventListener("click", shuffle);
    if (rBtn) rBtn.addEventListener("click", reset);
  }

  /* ---------- Sticky nav shadow ---------- */
  var nav = document.getElementById("navbar");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Copy install commands ---------- */
  var copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var code = document.getElementById("install-code");
      var text = code ? code.textContent : "";
      var ok = function () {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 1800);
      };
      var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
      var fail = function () {
        try {
          var range = document.createRange();
          range.selectNodeContents(code);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {}
        copyBtn.textContent = isMac ? "Press Cmd+C" : "Press Ctrl+C";
        setTimeout(function () { copyBtn.textContent = "Copy"; }, 2600);
      };
      var legacyCopy = function () {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          var copied = document.execCommand("copy");
          document.body.removeChild(ta);
          return copied;
        } catch (e) { return false; }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () {
          if (legacyCopy()) { ok(); } else { fail(); }
        });
      } else if (legacyCopy()) {
        ok();
      } else {
        fail();
      }
    });
  }

  /* ---------- Lightbox (click a screenshot to enlarge) ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCap = document.getElementById("lightbox-cap");
  var lightboxClose = document.getElementById("lightbox-close");
  var lastFocused = null;

  function openLightbox(src, caption) {
    if (!lightbox) return;
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = caption || "";
    lightboxCap.textContent = caption || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }
  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  document.querySelectorAll("img.zoomable").forEach(function (img) {
    img.addEventListener("click", function () {
      var fig = img.closest("figure");
      var cap = (fig && fig.querySelector("figcaption"))
        ? fig.querySelector("figcaption").textContent
        : img.alt;
      openLightbox(img.currentSrc || img.src, cap);
    });
  });
  if (lightbox) {
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target === lightboxImg) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealTargets = document.querySelectorAll(
    ".feature-card, .shot, .stat, .step, .timeline li, .band-lead, .daily-copy, .story-copy, .daily-shot"
  );
  if (!reduceMotion && "IntersectionObserver" in window) {
    revealTargets.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }
})();
