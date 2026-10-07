/**
 * hero-interactive.js
 * Pointer-driven hero background color. Opt-in: only runs when the page has
 * <section id="hero" data-hero-interactive> (see index-interactive.html).
 *
 *   Mouse / pen:  x → hue (0–360°), y → lightness (top = lightest)
 *   Touch:        horizontal drag → hue; lightness stays at the rest value.
 *                 Vertical swipes still scroll (touch-action: pan-y).
 *   Rest:         the hue of the theme's --color-background-accent-hero,
 *                 at REST_LIGHTNESS for the theme (CONFIG). Eases back
 *                 there when the mouse leaves the hero; touch keeps the last
 *                 dragged color.
 *
 * Derived colors, recomputed every frame from the background:
 *   --hero-live-bg           background (OKLCH, gamut-clamped to sRGB)
 *   --hero-live-text         intro text + header logo/underline: the
 *                            complementary hue (+180°) at max chroma, with
 *                            lightness solved for exactly TEXT_CONTRAST
 *   --hero-live-header-text  header name/role/nav: black or white, whichever
 *                            contrasts more (always ≥ 4.58:1)
 *
 * They're set on <html> so the global header (outside #hero) can read them;
 * js/header-colors.js's "hero" entry uses them with the static hero tokens
 * as fallbacks, so pages without this script are unchanged.
 *
 * Chroma follows the palette: for any lightness/hue it interpolates the
 * --c-<hue>-NN tokens by lightness (--l-NN), then between the two --h-*
 * hues either side, then clamps into sRGB gamut.
 *
 * Background lightness is limited per theme by LIGHTNESS_RANGE (--l-NN
 * step names) in CONFIG below; hue is the full circle. The intro text
 * isn't limited by it, or by the palette tokens — it uses whatever
 * lightness hits the locked contrast, at the maximum displayable chroma.
 */

(() => {
  const hero = document.querySelector("#hero[data-hero-interactive]");
  if (!hero) return;

  const root = document.documentElement;
  const header = document.getElementById("global-header");

  // ---- Config ---------------------------------------------------------------

  const CONFIG = {
    HUE_FAMILIES: ["blue", "amber", "warm-red", "green", "lime", "teal",
                   "purple", "pink"],
    // Hue at the hero's left edge per root theme, in degrees (0–360). The
    // full circle runs left → right from here, so the right edge wraps back
    // to the same hue. e.g. 0 = pinkish red, 36 = warm-red, 69 = amber,
    // 252 = blue. A plain number applies to both themes.
    HUE_START: {
      light: 216,  // centers rest hue --h-warm-red (36°):  36 − 180
      dark:  72,   // centers rest hue --h-blue (252°):    252 − 180
    },
    STEPS: ["05", "10", "20", "30", "40", "50", "60", "70", "80", "90", "95"],
    // Background lightness range per root theme, as --l-NN steps (either
    // order). Pointer top = lighter end, bottom = darker end.
    LIGHTNESS_RANGE: {
      light: ["10", "40"],
      dark:  ["70", "90"],
    },
    // Resting background lightness per root theme (--l-NN step). Hue still
    // comes from the theme's --color-background-accent-hero.
    REST_LIGHTNESS: {
      light: "40",
      dark:  "70",
    },
    TEXT_CONTRAST: 3.5,   // locked intro-text contrast (exact, not a minimum; ≤ 4.58)
    // Lag behind the pointer, in ms: the color covers ~63% of the remaining
    // distance every LAG ms (~95% in 3× LAG). Higher = slower, dreamier
    // follow; lower = snappier. Frame-rate independent.
    LAG: 400,
    REST_LAG: 900,        // slower ease back to rest when the pointer leaves
    // Theme switches use a fixed-length ease-in-out instead of the trailing
    // LAG ease, so light → dark and dark → light finish in the same time,
    // alongside the rest of the page. Read from --transition-default (falls
    // back to this many ms if it can't be parsed).
    THEME_DURATION: 300,
    META_INTERVAL: 150,   // ms between theme-color <meta> updates
  };

  // ---- Color math (OKLab / OKLCH ↔ linear sRGB) -----------------------------

  const oklchToLinear = (L, C, H) => {
    const h = (H * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
  };

  const linearToOklch = ([r, g, b]) => {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
  };

  const decode = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const encode = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

  const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

  // Largest chroma ≤ C that fits in sRGB at this L/H
  const clampChroma = (L, C, H) => {
    if (inGamut(oklchToLinear(L, C, H))) return C;
    let lo = 0, hi = C;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(L, mid, H))) lo = mid; else hi = mid;
    }
    return lo;
  };

  // WCAG relative luminance from linear sRGB
  const luminance = ([r, g, b]) => {
    const c = (v) => Math.min(1, Math.max(0, v));
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const contrast = (y1, y2) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

  const toHex = (rgb) =>
    "#" + rgb.map((v) => Math.round(encode(Math.min(1, Math.max(0, v))) * 255)
      .toString(16).padStart(2, "0")).join("").toUpperCase();

  const css = (L, C, H) => `oklch(${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${H.toFixed(2)})`;

  // ---- Palette tokens -------------------------------------------------------

  let palette = null; // { L: [[lightness, step]…], families: [{ h, chroma: [[L, C]…] }] }

  const readPalette = () => {
    const cs = getComputedStyle(root);
    const num = (name) => parseFloat(cs.getPropertyValue(name));
    const lightness = CONFIG.STEPS.map((step) => num(`--l-${step}`) / 100);

    const families = CONFIG.HUE_FAMILIES.map((name) => ({
      h: num(`--h-${name}`),
      // [lightness, chroma] pairs, sorted by lightness for interpolation
      chroma: CONFIG.STEPS
        .map((step, i) => [lightness[i], num(`--c-${name}-${step}`)])
        .filter(([l, c]) => !Number.isNaN(l) && !Number.isNaN(c))
        .sort((a, b) => a[0] - b[0]),
    })).filter((f) => !Number.isNaN(f.h) && f.chroma.length)
       .sort((a, b) => a.h - b.h);

    palette = {
      lMin: Math.min(...lightness),
      lMax: Math.max(...lightness),
      lightnessOf: Object.fromEntries(CONFIG.STEPS.map((step, i) => [step, lightness[i]])),
      families,
    };
  };

  // Chroma of one hue family at lightness L (linear between its steps)
  const familyChroma = (fam, L) => {
    const pts = fam.chroma;
    if (L <= pts[0][0]) return pts[0][1];
    if (L >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 1; i < pts.length; i++) {
      if (L <= pts[i][0]) {
        const [l0, c0] = pts[i - 1], [l1, c1] = pts[i];
        return c0 + ((L - l0) / (l1 - l0)) * (c1 - c0);
      }
    }
    return pts[pts.length - 1][1];
  };

  // Palette chroma at any L/H: blend the two nearest --h-* families
  const paletteChroma = (L, H) => {
    const fams = palette.families;
    if (fams.length === 1) return familyChroma(fams[0], L);
    let below = fams[fams.length - 1], above = fams[0];
    for (let i = 0; i < fams.length; i++) {
      if (fams[i].h <= H) below = fams[i];
      if (fams[i].h > H) { above = fams[i]; break; }
    }
    const span = (above.h - below.h + 360) % 360 || 360;
    const t = ((H - below.h + 360) % 360) / span;
    return familyChroma(below, L) * (1 - t) + familyChroma(above, L) * t;
  };

  const paletteColor = (L, H) => {
    const C = clampChroma(L, paletteChroma(L, H), H);
    return { L, C, H, rgb: oklchToLinear(L, C, H) };
  };

  // ---- Derived colors -------------------------------------------------------

  // Most vivid color the screen can show at this lightness/hue (ignores the
  // palette tokens — 0.4 is above any sRGB chroma, clampChroma trims it)
  const maxChromaColor = (L, H) => {
    const C = clampChroma(L, 0.4, H);
    return { L, C, H, rgb: oklchToLinear(L, C, H) };
  };

  // Complementary hue at max chroma, lightness solved so contrast with the
  // background is exactly TEXT_CONTRAST. Searches on whichever side (darker
  // or lighter) has more headroom — black or white always reach ≥ 4.58:1,
  // so a solution exists for any target up to that.
  const textColor = (bg) => {
    const H = (bg.H + 180) % 360;
    const yBg = luminance(bg.rgb);
    const ratio = (L) => contrast(luminance(maxChromaColor(L, H).rgb), yBg);

    const goDarker = contrast(0, yBg) >= contrast(1, yBg);
    let far = goDarker ? 0 : 1;   // contrast above target
    let near = bg.L;              // contrast below target (≈ 1:1)
    for (let i = 0; i < 24; i++) {
      const mid = (far + near) / 2;
      if (ratio(mid) > CONFIG.TEXT_CONTRAST) far = mid; else near = mid;
    }
    return maxChromaColor((far + near) / 2, H);
  };


  // Header sits over the hero at 90% opacity — effectively the same color
  const headerText = (bg) => {
    const y = luminance(bg.rgb);
    return contrast(0, y) >= contrast(1, y) ? "var(--black)" : "var(--white)";
  };

  // ---- State ----------------------------------------------------------------

  let rest = { L: 0.64, H: 36 };      // replaced from the theme on init
  let target = { ...rest };
  let current = { ...rest };
  let heroIsActive = true;             // header currently over the hero?
  let rafId = null;
  let lastFrame = 0;
  let lag = CONFIG.LAG;
  let tween = null;       // { from, start, duration } during a theme switch
  let lastMeta = 0;

  // The theme's static hero color, as OKLCH (browsers may report rgb())
  const readRest = () => {
    const { L, H } = readThemeHero();
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const restL = palette.lightnessOf[CONFIG.REST_LIGHTNESS[theme]];
    return { L: restL ?? L, H };  // unknown step name → the theme's own lightness
  };

  const readThemeHero = () => {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;color:var(--color-background-accent-hero)";
    hero.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();

    const nums = (value.match(/-?[\d.]+%?/g) || []).map((n) =>
      n.endsWith("%") ? parseFloat(n) / 100 : parseFloat(n));
    if (value.startsWith("oklch") && nums.length >= 3) return { L: nums[0], H: nums[2] };
    if (value.startsWith("rgb") && nums.length >= 3) {
      const [L, , H] = linearToOklch(nums.slice(0, 3).map((v) => decode(v / 255)));
      return { L, H };
    }
    return rest;
  };

  const apply = () => {
    const bg = paletteColor(current.L, current.H);
    const text = textColor(bg);
    const headerColor = headerText(bg);

    root.style.setProperty("--hero-live-bg", css(bg.L, bg.C, bg.H));
    root.style.setProperty("--hero-live-text", css(text.L, text.C, text.H));
    root.style.setProperty("--hero-live-header-text", headerColor);

    // Hero borders/brackets and header brackets follow the background's tone
    const dark = headerColor === "var(--white)";
    hero.dataset.heroTone = dark ? "dark" : "light";
    if (header && heroIsActive) {
      header.classList.toggle("header-dark-forced", dark);
      header.classList.toggle("header-light-forced", !dark);
    }

    // iOS status bar color (sRGB hex only), throttled
    const now = performance.now();
    if (heroIsActive && now - lastMeta > CONFIG.META_INTERVAL) {
      lastMeta = now;
      const hex = toHex(bg.rgb);
      document.getElementById("theme-color-light")?.setAttribute("content", hex);
      document.getElementById("theme-color-dark")?.setAttribute("content", hex);
    }
  };

  // Ease current → target; hue takes the short way round the circle
  const tick = (now) => {
    const dt = Math.min(100, now - (lastFrame || now)); // cap after tab switches
    lastFrame = now;
    let settled;

    if (tween) {
      // Theme switch: fixed-duration ease-in-out (sine ≈ CSS ease-in-out)
      // Heads for the live target, so pointer moves mid-switch redirect it
      // without dropping back to the slower trailing ease.
      const t = Math.min(1, (now - (tween.start ??= now)) / tween.duration);
      const e = 0.5 - Math.cos(Math.PI * t) / 2;
      const dH = ((target.H - tween.from.H + 540) % 360) - 180; // short way round
      current.H = (tween.from.H + dH * e + 360) % 360;
      current.L = tween.from.L + (target.L - tween.from.L) * e;
      settled = t >= 1;
      if (settled) { tween = null; current = { ...target }; }
    } else {
      // Pointer: trailing exponential ease
      const k = 1 - Math.exp(-dt / lag);
      const dH = ((target.H - current.H + 540) % 360) - 180;
      const dL = target.L - current.L;
      current.H = (current.H + dH * k + 360) % 360;
      current.L += dL * k;
      settled = Math.abs(dH) < 0.05 && Math.abs(dL) < 0.0005;
    }

    if (settled) current = { ...target };
    apply();

    if (settled) {
      rafId = null;
      lastFrame = 0;
      root.classList.remove("hero-live-animating");
      lastMeta = 0; apply(); // final meta sync
    } else {
      rafId = requestAnimationFrame(tick);
    }
  };

  const startLoop = () => {
    if (!rafId) {
      // CSS color transitions would lag behind the per-frame updates
      root.classList.add("hero-live-animating");
      rafId = requestAnimationFrame(tick);
    }
  };

  // Pointer-driven: trailing ease. During a theme switch, pointer moves just
  // redirect it (the switch still finishes on time); anything else — e.g.
  // the slower return to rest — takes over from wherever it had reached.
  const setTarget = (L, H, ms = CONFIG.LAG) => {
    target = { L, H };
    lag = ms;
    if (tween && ms !== CONFIG.LAG) tween = null;
    startLoop();
  };

  // --transition-default (e.g. ".3s ease-in-out") in ms
  const themeDuration = () => {
    const m = getComputedStyle(root).getPropertyValue("--transition-default")
      .match(/([\d.]+)\s*(ms|s)\b/);
    return m ? parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1) : CONFIG.THEME_DURATION;
  };

  // Theme switch: fixed-length ease-in-out, same time in both directions
  const tweenTo = (L, H) => {
    target = { L, H };
    tween = {
      from: { ...current },
      start: null,                 // set on the first frame
      duration: themeDuration(),
    };
    startLoop();
  };

  // ---- Input ----------------------------------------------------------------

  // [darkest, lightest] background lightness for the current root theme
  const lightnessRange = () => {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const ends = CONFIG.LIGHTNESS_RANGE[theme]
      .map((step) => palette.lightnessOf[step])
      .filter((l) => l !== undefined);
    return ends.length === 2
      ? [Math.min(...ends), Math.max(...ends)]
      : [palette.lMin, palette.lMax];   // unknown step name → full scale
  };

  const hueStart = () => {
    const start = CONFIG.HUE_START;
    if (typeof start === "number") return start;
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    return start[theme] ?? 0;
  };

  const fromPointer = (e) => {
    const [lo, hi] = lightnessRange();
    const r = hero.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return {
      H: (((hueStart() + x * 360) % 360) + 360) % 360,
      L: hi - y * (hi - lo), // top = lightest
    };
  };

  // Mouse/pen tracking is by the hero's on-screen area, not its DOM subtree:
  // the fixed global header (and anything else layered on top) overlaps the
  // hero, and hovering it would otherwise count as leaving and send the
  // color back to rest.
  const overHero = (e) => {
    const r = hero.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX < r.right &&
           e.clientY >= r.top && e.clientY < r.bottom;
  };

  let pointerInHero = false;
  let lastPointer = null; // last mouse/pen position, for re-targeting on theme change
  const returnToRest = () => {
    if (!pointerInHero) return;
    pointerInHero = false;
    setTarget(rest.L, rest.H, CONFIG.REST_LAG);
  };

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    lastPointer = { clientX: e.clientX, clientY: e.clientY };
    if (overHero(e)) {
      pointerInHero = true;
      const { L, H } = fromPointer(e);
      setTarget(L, H);
    } else {
      returnToRest();
    }
  });

  // Pointer leaves the browser window entirely
  document.documentElement.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "touch") returnToRest();
  });

  // Touch: horizontal drag only. touch-action: pan-y (hero-interactive.css)
  // hands vertical swipes to the browser for scrolling, so these events only
  // keep firing for horizontal movement.
  let dragging = false;
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    dragging = true;
  });
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" || !dragging) return;
    setTarget(rest.L, fromPointer(e).H);
  });
  ["pointerup", "pointercancel"].forEach((type) =>
    hero.addEventListener(type, () => { dragging = false; }));

  // ---- Coordination with header-colors.js / theme.js ------------------------

  // Section changes re-run header-colors.js and theme.js (which reset the
  // header-dark-forced class and the theme-color meta). Re-apply on top.
  document.addEventListener("sectionchange", (e) => {
    heroIsActive = (e.detail.sectionId || "hero") === "hero";
    if (heroIsActive) { lastMeta = 0; apply(); }
    // header-colors.js manages header-dark-forced for other sections;
    // header-light-forced is ours alone, so clear it when leaving the hero
    else header?.classList.remove("header-light-forced");
  });

  // Theme toggle: re-target immediately, without waiting for the pointer to
  // move. The toggle sits in the header over the hero, so the pointer is
  // usually "in" the hero when it's clicked — recompute its color under the
  // new theme's LIGHTNESS_RANGE / HUE_START from the last known position.
  // Otherwise (pointer elsewhere, or a touch-dragged color) go to the new rest.
  new MutationObserver(() => {
    rest = readRest();
    if (pointerInHero && lastPointer) {
      const { L, H } = fromPointer(lastPointer);
      tweenTo(L, H);
    } else {
      tweenTo(rest.L, rest.H);
    }
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  // ---- Init -----------------------------------------------------------------

  readPalette();
  rest = readRest();
  target = { ...rest };
  current = { ...rest };
  apply();
})();
