/* ============================================================
   Sliding Puzzle — landing page interactions
   - A real, playable 3x3 sliding puzzle (move-based shuffle,
     so it is always solvable — just like the game).
   - Sticky-nav shadow, mobile menu, scroll reveal, lightbox, keyboard play.
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
    // Keep keyboard focus on the board across the rebuild (arrow-key play).
    var hadFocus = puzzleEl.contains(document.activeElement) || document.activeElement === puzzleEl;
    puzzleEl.innerHTML = "";
    for (var pos = 0; pos < board.length; pos++) {
      var value = board[pos];
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.tabIndex = -1;  // the container is the single keyboard stop
      tile.style.setProperty("--img", "url(" + HERO_IMG + ")");
      if (value === BLANK) {
        tile.classList.add("blank");
        tile.setAttribute("aria-hidden", "true");
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
    if (hadFocus) puzzleEl.focus();
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

  function moveByKey(key) {
    // Arrow = the direction a tile slides into the blank (mirrors the game).
    var blank = blankPos();
    var r = Math.floor(blank / SIZE), c = blank % SIZE, target = -1;
    if (key === "ArrowUp" && r < SIZE - 1) target = blank + SIZE;        // tile below slides up
    else if (key === "ArrowDown" && r > 0) target = blank - SIZE;        // tile above slides down
    else if (key === "ArrowLeft" && c < SIZE - 1) target = blank + 1;    // tile right slides left
    else if (key === "ArrowRight" && c > 0) target = blank - 1;          // tile left slides right
    if (target >= 0) { tryMove(target); return true; }
    return false;
  }

  if (puzzleEl) {
    puzzleEl.tabIndex = 0;  // single keyboard stop; arrow keys play (moveByKey)
    var img = new Image();
    img.onload = shuffle;
    img.onerror = shuffle;   // still playable if the image is missing
    img.src = HERO_IMG;
    var sBtn = document.getElementById("shuffle-btn");
    var rBtn = document.getElementById("reset-btn");
    if (sBtn) sBtn.addEventListener("click", shuffle);
    if (rBtn) rBtn.addEventListener("click", reset);
    puzzleEl.addEventListener("keydown", function (e) {
      if (e.key.indexOf("Arrow") === 0 && moveByKey(e.key)) e.preventDefault();
    });
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
    // Trap Tab inside the dialog (only the close button is focusable).
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); lightboxClose.focus(); }
    });
  }
  // Escape closes the lightbox first, otherwise the open mobile menu.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (lightbox && !lightbox.hidden) { closeLightbox(); return; }
    if (menu && menu.classList.contains("open")) {
      menu.classList.remove("open");
      if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
    }
  });

  /* ---------- Scroll reveal ---------- */
  var revealTargets = document.querySelectorAll(
    ".feature-card, .shot, .stat, .how-steps li, .dl-steps li, .timeline li, .band-lead, .daily-copy, .story-copy, .daily-shot"
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
