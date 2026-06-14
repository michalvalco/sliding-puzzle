/* ============================================================
   Sliding Puzzle — landing page interactions
   - A real, playable 3x3 sliding puzzle (move-based shuffle,
     always solvable). Easy first board, smooth slides, win
     celebration, picture/number modes, and a date-seeded Daily.
   - Page theme toggle, sticky nav, mobile menu, lightbox, reveal.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Page theme (light / dark) ---------- */
  var THEME_KEY = "sp-theme";
  var themeBtn = document.getElementById("theme-toggle");
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0f1b2a" : "#a8e6da");
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------- Interactive demo puzzle ---------- */
  var SIZE = 3;
  var BLANK = SIZE * SIZE - 1;            // value 8 is the empty tile
  var GAP = 4;                            // matches .puzzle gap/padding
  var IMAGES = ["media/hero.jpg", "media/puzzle-3.jpg", "media/puzzle-1.jpg", "media/puzzle-2.jpg"];

  var board = [];
  var moves = 0;
  var solved = true;
  var firstMove = false;
  var currentImg = IMAGES[0];
  var currentMode = "picture";           // "picture" | "number"
  var dailyMode = false;

  var puzzleEl = document.getElementById("puzzle");
  var moveCountEl = document.getElementById("move-count");
  var timeEl = document.getElementById("demo-time");
  var statusEl = document.getElementById("demo-status");
  var winCard = document.getElementById("win-card");
  var winStats = document.getElementById("win-stats");
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Timer
  var startTime = 0, timerId = 0;
  function startTimer() { startTime = Date.now(); timerId = setInterval(updateTime, 250); }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = 0; } }
  function elapsed() { return startTime ? (Date.now() - startTime) / 1000 : 0; }
  function fmtTime(s) { var m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ":" + (sec < 10 ? "0" : "") + sec; }
  function updateTime() { if (timeEl) timeEl.textContent = fmtTime(elapsed()); }

  // Seeded RNG for the Daily board (mulberry32) so everyone gets the same one.
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function dateSeed() {
    var d = new Date();
    return (d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) >>> 0;
  }

  function solvedBoard() { var a = []; for (var i = 0; i < SIZE * SIZE; i++) a.push(i); return a; }
  function blankPos() { return board.indexOf(BLANK); }
  function bgPosition(value) {
    var step = 100 / (SIZE - 1);
    return ((value % SIZE) * step) + "% " + (Math.floor(value / SIZE) * step) + "%";
  }
  function neighbors(pos) {
    var r = Math.floor(pos / SIZE), c = pos % SIZE, out = [];
    if (r > 0) out.push(pos - SIZE);
    if (r < SIZE - 1) out.push(pos + SIZE);
    if (c > 0) out.push(pos - 1);
    if (c < SIZE - 1) out.push(pos + 1);
    return out;
  }
  function swap(a, b) { var t = board[a]; board[a] = board[b]; board[b] = t; }
  function isSolved() { for (var i = 0; i < board.length; i++) if (board[i] !== i) return false; return true; }

  function render() {
    var hadFocus = puzzleEl.contains(document.activeElement) || document.activeElement === puzzleEl;
    var blank = blankPos();
    puzzleEl.innerHTML = "";
    for (var pos = 0; pos < board.length; pos++) {
      var value = board[pos];
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.tabIndex = -1;
      if (value === BLANK) {
        tile.classList.add("blank");
        tile.setAttribute("aria-hidden", "true");
      } else if (currentMode === "number") {
        tile.classList.add("num-tile");
        tile.textContent = value + 1;
        tile.setAttribute("aria-label", "Tile " + (value + 1));
      } else {
        tile.style.setProperty("--img", "url(" + currentImg + ")");
        tile.style.backgroundPosition = bgPosition(value);
        tile.setAttribute("aria-label", "Tile " + (value + 1));
      }
      if (value !== BLANK) {
        if (value === pos && !solved) tile.classList.add("solved-cell");
        // Nudge a movable tile until the first move, to invite a click.
        if (!firstMove && !reduceMotion && neighbors(pos).indexOf(blank) !== -1) {
          tile.classList.add("nudge");
        }
        (function (p) { tile.addEventListener("click", function () { tryMove(p); }); })(pos);
      }
      puzzleEl.appendChild(tile);
    }
    if (moveCountEl) moveCountEl.textContent = moves;
    if (hadFocus) puzzleEl.focus();
  }

  function animateSlide(tile, fromPos, toPos) {
    if (!tile || reduceMotion) return;
    var step = tile.offsetWidth + GAP;
    var dCol = (fromPos % SIZE) - (toPos % SIZE);
    var dRow = Math.floor(fromPos / SIZE) - Math.floor(toPos / SIZE);
    tile.style.transition = "none";
    tile.style.transform = "translate(" + (dCol * step) + "px," + (dRow * step) + "px)";
    tile.getBoundingClientRect();  // force reflow
    requestAnimationFrame(function () {
      tile.style.transition = "transform .14s ease";
      tile.style.transform = "translate(0, 0)";
    });
  }

  function tryMove(pos) {
    if (solved && winCard && !winCard.hidden) return;  // ignore while win card shows
    var blank = blankPos();
    if (neighbors(pos).indexOf(blank) === -1) return;
    if (!firstMove) { firstMove = true; startTimer(); }
    swap(pos, blank);
    moves++;
    render();
    animateSlide(puzzleEl.children[blank], pos, blank);
    if (isSolved()) onSolved();
  }

  function moveByKey(key) {
    var blank = blankPos();
    var r = Math.floor(blank / SIZE), c = blank % SIZE, target = -1;
    if (key === "ArrowUp" && r < SIZE - 1) target = blank + SIZE;
    else if (key === "ArrowDown" && r > 0) target = blank - SIZE;
    else if (key === "ArrowLeft" && c < SIZE - 1) target = blank + 1;
    else if (key === "ArrowRight" && c > 0) target = blank - 1;
    if (target >= 0) { tryMove(target); return true; }
    return false;
  }

  function bestKey() { return "sp-best-" + currentMode + "-" + (dailyMode ? "daily" : currentImg); }
  function readBest() {
    try { return JSON.parse(localStorage.getItem(bestKey()) || "null"); } catch (e) { return null; }
  }
  function recordBest(time) {
    var best = readBest();
    if (!best || moves < best.moves || (moves === best.moves && time < best.time)) {
      best = { moves: moves, time: time };
      try { localStorage.setItem(bestKey(), JSON.stringify(best)); } catch (e) {}
    }
    return best;
  }

  function confetti() {
    if (!winCard || reduceMotion) return;
    var colors = ["#5bbfae", "#bfe3f5", "#e0a73e", "#2f6f9f", "#a8e6da"];
    var wrap = puzzleEl.parentNode;
    for (var i = 0; i < 16; i++) {
      var p = document.createElement("span");
      p.className = "confetti-bit";
      p.style.left = (5 + Math.random() * 90) + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.25) + "s";
      p.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      wrap.appendChild(p);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1800); })(p);
    }
  }

  function showWin(time) {
    var best = recordBest(time);
    if (winStats) {
      winStats.textContent = moves + " moves · " + fmtTime(time) +
        (best ? "   ·   best " + best.moves + " · " + fmtTime(best.time) : "");
    }
    if (winCard) winCard.hidden = false;
    confetti();
  }
  function hideWin() { if (winCard) winCard.hidden = true; }

  function onSolved() {
    solved = true;
    stopTimer();
    if (statusEl) { statusEl.textContent = "Solved — nicely done."; statusEl.classList.add("win"); }
    showWin(elapsed());
  }

  function newGame(opts) {
    opts = opts || {};
    board = solvedBoard();
    var rng = opts.daily ? mulberry32(dateSeed()) : Math.random;
    var count = opts.easy ? 5 : (reduceMotion ? 30 : 60);
    var last = -1;
    for (var i = 0; i < count; i++) {
      var blank = blankPos();
      var choices = neighbors(blank).filter(function (n) { return n !== last; });
      var pick = choices[Math.floor(rng() * choices.length)];
      last = blank;
      swap(blank, pick);
    }
    if (isSolved()) swap(0, 1);
    moves = 0;
    solved = false;
    firstMove = false;
    stopTimer();
    startTime = 0;
    if (timeEl) timeEl.textContent = "0:00";
    if (statusEl) {
      statusEl.textContent = opts.daily ? "Today's puzzle — same board for everyone." : "Move tiles into the empty space";
      statusEl.classList.remove("win");
    }
    hideWin();
    render();
  }

  if (puzzleEl) {
    puzzleEl.tabIndex = 0;  // single keyboard stop; arrow keys play (moveByKey)
    var img = new Image();
    img.onload = function () { newGame({ easy: true }); };   // easy first board = quick win
    img.onerror = function () { newGame({ easy: true }); };
    img.src = currentImg;

    var sBtn = document.getElementById("shuffle-btn");
    var rBtn = document.getElementById("reset-btn");
    var dBtn = document.getElementById("daily-toggle");
    var againBtn = document.getElementById("win-again");
    if (sBtn) sBtn.addEventListener("click", function () { newGame({ daily: dailyMode }); });
    if (rBtn) rBtn.addEventListener("click", function () { newGame({ easy: true, daily: dailyMode }); });
    if (againBtn) againBtn.addEventListener("click", function () { newGame({ daily: dailyMode }); puzzleEl.focus(); });
    if (dBtn) {
      dBtn.addEventListener("click", function () {
        dailyMode = !dailyMode;
        dBtn.setAttribute("aria-pressed", dailyMode ? "true" : "false");
        dBtn.classList.toggle("is-active", dailyMode);
        newGame({ daily: dailyMode });
      });
    }
    puzzleEl.addEventListener("keydown", function (e) {
      if (e.key.indexOf("Arrow") === 0 && moveByKey(e.key)) e.preventDefault();
    });

    // Picture / Number swatches
    var swatches = [].slice.call(document.querySelectorAll("#demo-swatches .swatch"));
    swatches.forEach(function (sw) {
      sw.addEventListener("click", function () {
        swatches.forEach(function (s) { s.classList.remove("is-active"); s.setAttribute("aria-pressed", "false"); });
        sw.classList.add("is-active");
        sw.setAttribute("aria-pressed", "true");
        if (sw.getAttribute("data-mode") === "number") {
          currentMode = "number";
        } else {
          currentMode = "picture";
          currentImg = sw.getAttribute("data-img");
        }
        newGame({ daily: dailyMode });
      });
    });
  }

  /* ---------- Sticky nav shadow ---------- */
  var nav = document.getElementById("navbar");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 8); }
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

  /* ---------- Lightbox (click or Enter/Space on a screenshot) ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCap = document.getElementById("lightbox-cap");
  var lightboxClose = document.getElementById("lightbox-close");
  var lastFocused = null;

  function openLightbox(src, caption) {
    if (!lightbox || !lightboxImg || !lightboxCap || !lightboxClose) return;
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
  [].slice.call(document.querySelectorAll("img.zoomable")).forEach(function (image) {
    image.setAttribute("tabindex", "0");
    image.setAttribute("role", "button");
    function open() {
      var fig = image.closest("figure");
      var cap = (fig && fig.querySelector("figcaption")) ? fig.querySelector("figcaption").textContent : image.alt;
      openLightbox(image.currentSrc || image.src, cap);
    }
    image.addEventListener("click", open);
    image.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
  if (lightbox) {
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target === lightboxImg) closeLightbox();
    });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); lightboxClose.focus(); }
    });
  }
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
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }
})();
