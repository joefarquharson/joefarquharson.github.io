/**
 * hero-interactive.js
 * Pointer-driven hero background color. Opt-in: only runs when the page has
 * <section id="hero" data-hero-interactive> (see index-interactive.html).
 *
 *   Mouse / pen:  x → hue: the width is split into equal zones, one per
 *                 HUE_FAMILIES family in listed order, each showing that
 *                 family's --h-* hue; y → lightness (LIGHTNESS_RANGE)
 *   Touch:        horizontal drag → hue from the finger's x, lightness from
 *                 its y (where on the hero it is). Vertical swipes still
 *                 scroll (touch-action: pan-y), so y can't be dragged.
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
    // Color families whose --c-<family>-NN / --h-<family> tokens set the
    // background + wave chroma, per root theme. The hue circle blends between
    // the nearest two listed families, so leaving one out removes its
    // chroma character from that stretch of hues. A plain array applies to
    // both themes.
    HUE_FAMILIES: {
      //all: ["warm-red", "amber", "lime", "green", "teal", "blue", "purple", "pink"]
      light: ["pink", "warm-red", "amber"],
      dark:  ["purple", "blue", "teal"],
    },
    // Which end of the theme's HUE_FAMILIES list sits at the hero's left
    // edge. The width is split into equal zones, one per family, in listed
    // order (e.g. warm-red | amber | lime | pink); naming the LAST family
    // reverses them. Any other name keeps the listed order. A plain string
    // applies to both themes.
    HUE_FAMILY_START: {
      light: "pink",
      dark:  "teal",
    },
    STEPS: ["05", "10", "20", "30", "40", "50", "60", "70", "80", "90", "95"],
    // Background lightness range per root theme, as --l-NN steps in
    // [top, bottom] order: the first step is at the top of the hero, the
    // second at the bottom. Swap them to reverse the direction, e.g.
    // ["10", "30"] = lighter at the top; ["30", "10"] = darker at the top.
    // Chroma cap for the background + waves (not the intro text), per root
    // theme. Each hue family's chroma is capped at its own --c-<family>-NN
    // for this step, before families are blended, so transitions stay
    // smooth. "range-start" = the first step of LIGHTNESS_RANGE for that
    // theme (e.g. light ["30", "10"] → --c-blue-30); or name a step ("40");
    // or null for no cap.
    CHROMA_CAP: {
      light: "range-start",
      dark:  "range-start",
    },
    LIGHTNESS_RANGE: {
      light: ["30", "10"],
      dark:  ["70", "90"],
    },
    // Resting background lightness per root theme (--l-NN step). Hue still
    // comes from the theme's --color-background-accent-hero.
    REST_LIGHTNESS: {
      light: "30",
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

    // Optional wave background (only when #hero also has data-hero-waves).
    // Arrays run front → back: wave 1 (front) … wave 4 (back).
    WAVES: {
      // Gradient top = background lightness + these OKLCH points, per root
      // theme (negative = darker). The gradient bottom is the background.
      LIGHTNESS: {
        light: [4, 2.5, 1.5, .5],
        dark:  [-4, -2.5, -1.5, -.5],
      },
      // Gradient top hue = background hue + these degrees, front → back, per
      // root theme. The gradient bottom keeps the background hue so the waves
      // still meet the background seamlessly. A plain array applies to both.
      HUE: {
        light: [30, 15, -15, -30],
        dark:  [-30, -15, 15, 30],
      },
      // Max horizontal shift in screen px, opposite to the pointer: pointer
      // at the left edge → +shift (right), right edge → −shift, centre → 0.
      SHIFT: [128, 64, 32, 16],
    },
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

  let palette = null; // { …, families: { light: [{ h, byStep, chroma }…], dark: […] } }

  const readPalette = () => {
    const cs = getComputedStyle(root);
    const num = (name) => parseFloat(cs.getPropertyValue(name));
    const lightness = CONFIG.STEPS.map((step) => num(`--l-${step}`) / 100);

    const familiesFor = (names) => names.map((name) => ({
      h: num(`--h-${name}`),
      // chroma per step name, for CHROMA_CAP
      byStep: Object.fromEntries(CONFIG.STEPS.map((step) => [step, num(`--c-${name}-${step}`)])),
      // [lightness, chroma] pairs, sorted by lightness for interpolation
      chroma: CONFIG.STEPS
        .map((step, i) => [lightness[i], num(`--c-${name}-${step}`)])
        .filter(([l, c]) => !Number.isNaN(l) && !Number.isNaN(c))
        .sort((a, b) => a[0] - b[0]),
    })).filter((f) => !Number.isNaN(f.h) && f.chroma.length)
       .sort((a, b) => a.h - b.h);

    const config = CONFIG.HUE_FAMILIES;
    const families = Array.isArray(config)
      ? { light: familiesFor(config), dark: familiesFor(config) }
      : { light: familiesFor(config.light ?? []), dark: familiesFor(config.dark ?? config.light ?? []) };

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
  // CHROMA_CAP step for the current root theme (null = no cap)
  const chromaCapStep = () => {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const cap = CONFIG.CHROMA_CAP?.[theme];
    return cap === "range-start" ? CONFIG.LIGHTNESS_RANGE[theme]?.[0] : cap ?? null;
  };

  // Family chroma at L, capped at the family's chroma for the cap step
  const cappedChroma = (fam, L, capStep) => {
    const c = familyChroma(fam, L);
    const cap = capStep ? fam.byStep[capStep] : NaN;
    return Number.isNaN(cap) || cap === undefined ? c : Math.min(c, cap);
  };

  const paletteChroma = (L, H) => {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const fams = palette.families[theme];
    const capStep = chromaCapStep();
    if (fams.length === 1) return cappedChroma(fams[0], L, capStep);
    let below = fams[fams.length - 1], above = fams[0];
    for (let i = 0; i < fams.length; i++) {
      if (fams[i].h <= H) below = fams[i];
      if (fams[i].h > H) { above = fams[i]; break; }
    }
    const span = (above.h - below.h + 360) % 360 || 360;
    const t = ((H - below.h + 360) % 360) / span;
    return cappedChroma(below, L, capStep) * (1 - t) + cappedChroma(above, L, capStep) * t;
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

  // ---- Waves (optional) ----------------------------------------------------

  // Inline SVG (see index-waves.html / assets/svg/hero/waves-live.svg) with
  // <g class="hero-wave" data-wave="1…4">. Gradient stops read
  // --hero-wave-base and --hero-wave-N-top; the groups are shifted here.
  const waves = hero.hasAttribute("data-hero-waves") && hero.querySelector(".hero-waves")
    ? {
        svg: hero.querySelector(".hero-waves"),
        groups: [...hero.querySelectorAll(".hero-wave")],
      }
    : null;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Screen px per SVG unit. preserveAspectRatio="… slice" scales the viewBox
  // to cover the hero, so a px shift has to be converted to SVG units.
  let waveScale = 1;
  const measureWaves = () => {
    const vb = waves.svg.viewBox.baseVal;
    const r = waves.svg.getBoundingClientRect();
    waveScale = Math.max(r.width / vb.width, r.height / vb.height) || 1;
  };

  const applyWaves = (bg) => {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    root.style.setProperty("--hero-wave-base", css(bg.L, bg.C, bg.H));
    const hueOffsets = Array.isArray(CONFIG.WAVES.HUE)
      ? CONFIG.WAVES.HUE
      : (CONFIG.WAVES.HUE[theme] ?? []);
    CONFIG.WAVES.LIGHTNESS[theme].forEach((points, i) => {
      const L = Math.min(1, Math.max(0, bg.L + points / 100));
      const H = (((bg.H + (hueOffsets[i] ?? 0)) % 360) + 360) % 360;
      const top = paletteColor(L, H);
      root.style.setProperty(`--hero-wave-${i + 1}-top`, css(top.L, top.C, top.H));
    });

    // Parallax: opposite to the pointer; none for reduced motion
    const still = reducedMotion.matches;
    waves.groups.forEach((g) => {
      const max = CONFIG.WAVES.SHIFT[Number(g.dataset.wave) - 1] ?? 0;
      const px = still ? 0 : -current.X * max;
      g.setAttribute("transform", `translate(${(px / waveScale).toFixed(2)} 0)`);
    });
  };

  // ---- State ----------------------------------------------------------------

  let rest = { L: 0.64, H: 36 };      // replaced from the theme on init
  // X = pointer's horizontal position in the hero, −1 (left) … 1 (right);
  // drives the wave parallax. 0 at rest.
  let target = { ...rest, X: 0 };
  let current = { ...rest, X: 0 };
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

    if (waves) applyWaves(bg);

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
      current.X = tween.from.X + (target.X - tween.from.X) * e;
      settled = t >= 1;
      if (settled) { tween = null; current = { ...target }; }
    } else {
      // Pointer: trailing exponential ease
      const k = 1 - Math.exp(-dt / lag);
      const dH = ((target.H - current.H + 540) % 360) - 180;
      const dL = target.L - current.L;
      const dX = target.X - current.X;
      current.H = (current.H + dH * k + 360) % 360;
      current.L += dL * k;
      current.X += dX * k;
      settled = Math.abs(dH) < 0.05 && Math.abs(dL) < 0.0005 && Math.abs(dX) < 0.001;
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
  const setTarget = (L, H, ms = CONFIG.LAG, X = 0) => {
    target = { L, H, X };
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
  const tweenTo = (L, H, X = 0) => {
    target = { L, H, X };
    tween = {
      from: { ...current },
      start: null,                 // set on the first frame
      duration: themeDuration(),
    };
    startLoop();
  };

  // ---- Input ----------------------------------------------------------------

  // [top, bottom] background lightness for the current root theme
  const lightnessRange = () => {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const ends = CONFIG.LIGHTNESS_RANGE[theme]
      .map((step) => palette.lightnessOf[step])
      .filter((l) => l !== undefined);
    return ends.length === 2
      ? ends
      : [palette.lMax, palette.lMin];   // unknown step name → full scale, lightest at top
  };

  // The theme's hue path: its HUE_FAMILIES hues in listed order, reversed
  // when HUE_FAMILY_START names the last family
  const huePath = () => {
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const config = CONFIG.HUE_FAMILIES;
    const names = Array.isArray(config) ? config : (config[theme] ?? config.light ?? []);
    const start = CONFIG.HUE_FAMILY_START;
    const first = typeof start === "string" ? start : start?.[theme];
    const ordered = first === names[names.length - 1] ? [...names].reverse() : names;
    const cs = getComputedStyle(root);
    return ordered.map((n) => parseFloat(cs.getPropertyValue(`--h-${n}`)))
                  .filter((h) => !Number.isNaN(h));
  };

  // Hue at x (0 = left, 1 = right): equal zones, one family hue each — no
  // in-between hues along the way. Crossing into the next zone eases there
  // with the usual LAG.
  const pathHue = (x) => {
    const hues = huePath();
    if (!hues.length) return x * 360;          // no families → full circle
    return hues[Math.min(hues.length - 1, Math.floor(x * hues.length))];
  };

  const fromPointer = (e) => {
    const [top, bottom] = lightnessRange();
    const r = hero.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return {
      H: pathHue(x),
      L: top + y * (bottom - top),
      X: x * 2 - 1,
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
      const { L, H, X } = fromPointer(e);
      setTarget(L, H, CONFIG.LAG, X);
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
  // keep firing for horizontal movement. Lightness comes from the finger's
  // height on the hero (top → LIGHTNESS_RANGE's first step), same mapping as
  // the mouse — it just can't be changed mid-drag.
  let dragging = false;
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    dragging = true;
  });
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" || !dragging) return;
    const { L, H, X } = fromPointer(e);
    setTarget(L, H, CONFIG.LAG, X);
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
  // new theme's LIGHTNESS_RANGE / HUE_FAMILY_START from the last known position.
  // Otherwise (pointer elsewhere, or a touch-dragged color) go to the new rest.
  new MutationObserver(() => {
    rest = readRest();
    if (pointerInHero && lastPointer) {
      const { L, H, X } = fromPointer(lastPointer);
      tweenTo(L, H, X);
    } else {
      tweenTo(rest.L, rest.H);
    }
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  // ---- Init -----------------------------------------------------------------

  readPalette();
  rest = readRest();
  target = { ...rest, X: 0 };
  current = { ...rest, X: 0 };
  if (waves) {
    measureWaves();
    window.addEventListener("resize", () => { measureWaves(); apply(); });
  }
  apply();
})();
