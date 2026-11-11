// src/js/lib/ready.js
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}
function onLoad(fn) {
  if (document.readyState === "complete") {
    fn();
  } else {
    window.addEventListener("load", fn, { once: true });
  }
}

// src/js/lib/dom.js
function resolve(target, scope = document) {
  if (!target) return null;
  if (typeof target === "string") return scope.querySelector(target);
  return target;
}
function resolveAll(target, scope = document) {
  if (!target) return [];
  if (typeof target === "string") return Array.from(scope.querySelectorAll(target));
  return Array.from(target);
}

// src/js/theme.js
var DEFAULTS = {
  toggle: "#sds-theme-toggle",
  metaLight: "#sds-theme-color-light",
  metaDark: "#sds-theme-color-dark",
  storageKey: "sds-theme",
  legacyStorageKey: null,
  metaColors: null,
  metaFallback: null,
  initialSection: "default"
};
var storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }
};
var initialized = false;
function initTheme(options = {}) {
  if (initialized) return;
  initialized = true;
  const config = { ...DEFAULTS, ...options };
  if (config.legacyStorageKey && !storage.get(config.storageKey)) {
    const legacy = storage.get(config.legacyStorageKey);
    if (legacy === "light" || legacy === "dark") storage.set(config.storageKey, legacy);
  }
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    document.documentElement.classList.add("sds-is-safari");
  }
  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const svgPaths = {
    light: {
      body: "M18.25 12C18.25 15.4518 15.4518 18.25 12 18.25C8.54822 18.25 5.75 15.4518 5.75 12C5.75 8.54822 8.54822 5.75 12 5.75C15.4518 5.75 18.25 8.54822 18.25 12Z",
      rays: {
        1: "M15.8756 5.2858L15.1256 6.58484",
        2: "M20.0132 7.37067L17.4152 8.87067",
        3: "M19.7506 11.9975L18.2506 11.9975",
        4: "M20.0132 16.6206L17.4152 15.1206",
        5: "M15.8799 18.7117L15.1299 17.4127",
        6: "M12 21.25L12 18.25",
        7: "M8.12561 18.7092L8.87561 17.4102",
        8: "M3.99182 16.6207L6.5899 15.1207",
        9: "M4.25061 11.9975L5.75061 11.9975",
        10: "M3.9917 7.3707L6.58978 8.8707",
        11: "M8.12988 5.2883L8.87988 6.58734",
        12: "M12 2.75V5.75"
      }
    },
    dark: {
      body: "M18.2761 15.6319C17.0216 17.7951 14.6807 19.25 12 19.25C7.99594 19.25 4.75 16.0041 4.75 12C4.75 9.31704 6.20737 6.97445 8.37366 5.7207C8.37366 11.5 12.5 15.6319 18.2761 15.6319Z",
      rays: {
        1: "M15.6257 5.71881L15.6207 5.72747",
        2: "M18.2793 8.3725L18.2706 8.3775",
        3: "M19.2506 11.9975L19.2406 11.9975",
        4: "M18.2819 15.6232L18.2732 15.6182",
        5: "M15.628 18.2768L15.623 18.2682",
        6: "M12 19.25L12 19.24",
        7: "M8.37561 18.2762L8.38061 18.2675",
        8: "M5.72192 15.6225L5.73058 15.6175",
        9: "M4.75061 11.9975L4.76061 11.9975",
        10: "M5.72437 8.37317L5.73303 8.37817",
        11: "M8.37805 5.71948L8.38305 5.72814",
        12: "M12 4.75V4.76"
      }
    }
  };
  const animateThemeIconModern = (theme) => {
    const body = document.querySelector(".sds-morph-body");
    const rays = {};
    for (let i = 1; i <= 12; i++) {
      rays[i] = document.querySelector(`.sds-morph-ray-${i}`);
    }
    if (!body) return;
    const targetPaths = svgPaths[theme];
    const duration = 300;
    const easing = "ease-in-out";
    try {
      body.animate(
        [{ d: `path("${targetPaths.body}")` }],
        { duration, easing, fill: "forwards" }
      );
      for (let i = 1; i <= 12; i++) {
        if (rays[i]) {
          rays[i].animate(
            [{ d: `path("${targetPaths.rays[i]}")` }],
            { duration, easing, fill: "forwards" }
          );
        }
      }
    } catch (error) {
      console.warn("Animation failed, using fallback:", error);
      setThemeIconPaths(theme);
    }
  };
  const animateThemeIconSafari = (theme) => {
    const themeIcon = document.querySelector(".sds-theme-icon");
    if (!themeIcon) return;
    themeIcon.style.opacity = "0";
    setTimeout(() => {
      setThemeIconPaths(theme);
      themeIcon.style.opacity = "1";
    }, 150);
  };
  const setThemeIconPaths = (theme) => {
    const body = document.querySelector(".sds-morph-body");
    const targetPaths = svgPaths[theme];
    if (!body || !targetPaths) return;
    body.setAttribute("d", targetPaths.body);
    for (let i = 1; i <= 12; i++) {
      const ray = document.querySelector(`.sds-morph-ray-${i}`);
      if (ray && targetPaths.rays[i]) {
        ray.setAttribute("d", targetPaths.rays[i]);
      }
    }
  };
  const animateThemeIcon = (theme) => {
    if (isSafari) {
      animateThemeIconSafari(theme);
    } else {
      animateThemeIconModern(theme);
    }
  };
  let activeSection = config.initialSection;
  const syncThemeColorMeta = () => {
    if (!config.metaColors) return;
    const theme = root.getAttribute("data-sds-theme") || "light";
    const color = config.metaColors[theme]?.[activeSection] ?? config.metaFallback;
    if (!color) return;
    const lightMeta = resolve(config.metaLight);
    const darkMeta = resolve(config.metaDark);
    if (lightMeta) lightMeta.content = color;
    if (darkMeta) darkMeta.content = color;
  };
  document.addEventListener("sds:sectionchange", (e) => {
    activeSection = e.detail.sectionId || config.initialSection;
    syncThemeColorMeta();
  });
  const applyTheme = (theme, animate = true) => {
    root.setAttribute("data-sds-theme", theme);
    storage.set(config.storageKey, theme);
    syncThemeColorMeta();
    if (animate) {
      animateThemeIcon(theme);
    } else {
      setThemeIconPaths(theme);
    }
  };
  mediaQuery.addEventListener("change", (e) => {
    if (!storage.get(config.storageKey)) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
  onReady(() => {
    const toggleBtn = resolve(config.toggle);
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const currentTheme = root.getAttribute("data-sds-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(newTheme, true);
      });
    }
    const initialTheme = root.getAttribute("data-sds-theme") || "light";
    setThemeIconPaths(initialTheme);
    syncThemeColorMeta();
  });
  onLoad(() => {
    setTimeout(() => {
      root.classList.remove("sds-no-transition");
    }, 100);
  });
}

// src/js/header-colors.js
var DEFAULT_ENTRY = {
  headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
  headerLogo: "var(--sds-color-logo)",
  headerName: "var(--sds-color-text)",
  headerRole: "var(--sds-color-text-meta)",
  headerUnderline: "var(--sds-color-accent)"
};
var DEFAULTS2 = {
  header: "#sds-global-header",
  sections: "section",
  colors: {}
};
var initialized2 = false;
function initHeaderColors(options = {}) {
  if (initialized2) return;
  initialized2 = true;
  const config = { ...DEFAULTS2, ...options };
  const header = resolve(config.header);
  const sections = resolveAll(config.sections);
  const root = document.documentElement;
  let currentSection = "";
  const defaultEntry = { ...DEFAULT_ENTRY, ...config.colors.default };
  function updateSectionColors(sectionId) {
    const entry = Object.hasOwn(config.colors, sectionId) ? config.colors[sectionId] : null;
    const colors = entry ? { ...defaultEntry, ...entry } : defaultEntry;
    root.style.setProperty("--sds-color-header-bg", colors.headerBg);
    root.style.setProperty("--sds-color-header-logo", colors.headerLogo);
    root.style.setProperty("--sds-color-header-name", colors.headerName);
    root.style.setProperty("--sds-color-header-role", colors.headerRole);
    header?.classList.toggle("sds-header-dark-forced", !!colors.forceDark);
    root.style.setProperty(
      "--sds-color-header-underline",
      colors.headerUnderline || "var(--sds-color-accent)"
    );
    document.dispatchEvent(new CustomEvent("sds:sectionchange", { detail: { sectionId } }));
  }
  let headerOffset = 98;
  function computeHeaderOffset() {
    if (!header) return 98;
    return Math.ceil(header.getBoundingClientRect().height) + 1;
  }
  function applyHeaderOffset() {
    headerOffset = computeHeaderOffset();
    if (observer) {
      observer.disconnect();
      sections.forEach((section) => observer.observe(section));
    }
  }
  function updateHeaderBackground() {
    const scrollPos = window.scrollY + headerOffset;
    let activeSectionId = "default";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        activeSectionId = section.id || "default";
      }
    });
    if (currentSection !== activeSectionId) {
      currentSection = activeSectionId;
      updateSectionColors(activeSectionId);
    }
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      updateHeaderBackground();
      ticking = false;
    });
    ticking = true;
  });
  let observer = null;
  function createObserver() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) updateHeaderBackground();
        });
      },
      {
        rootMargin: `-${headerOffset}px 0px -80% 0px`
      }
    );
    sections.forEach((section) => observer.observe(section));
  }
  const refreshAll = () => {
    headerOffset = computeHeaderOffset();
    createObserver();
    updateHeaderBackground();
  };
  if (document.readyState !== "complete") {
    document.addEventListener("DOMContentLoaded", refreshAll, { once: true });
  }
  onLoad(refreshAll);
  window.addEventListener("resize", () => {
    refreshAll();
  });
}

// src/js/menu.js
var DEFAULTS3 = {
  trigger: "#sds-menu-trigger",
  nav: "#sds-main-nav",
  links: ".sds-header-nav a"
};
var initialized3 = false;
function initMenu(options = {}) {
  if (initialized3) return;
  initialized3 = true;
  const config = { ...DEFAULTS3, ...options };
  const setup3 = () => {
    const root = document.documentElement;
    const menuTrigger = resolve(config.trigger);
    const mainNav = resolve(config.nav);
    const navLinks = resolveAll(config.links);
    if (!menuTrigger || !mainNav) return;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isMobile = window.innerWidth <= 768;
    let resizeTimer;
    let isResizing = false;
    const toggleMenu = (state) => {
      const isOpening = state !== void 0 ? state : !root.classList.contains("sds-menu-open");
      root.classList.toggle("sds-menu-open", isOpening);
      menuTrigger.setAttribute("aria-expanded", isOpening);
    };
    const handleResize = () => {
      const wasMobile = isMobile;
      isMobile = window.innerWidth <= 768;
      const crossedBreakpoint = wasMobile !== isMobile;
      if (crossedBreakpoint) {
        if (isSafari) {
          mainNav.style.opacity = "0";
          mainNav.style.visibility = "hidden";
          mainNav.style.transition = "none";
          mainNav.style.transform = "translateX(100%)";
          void mainNav.offsetHeight;
        } else {
          mainNav.style.transition = "none";
          void mainNav.offsetHeight;
        }
        root.classList.add("sds-resizing");
        isResizing = true;
        if (!isMobile && root.classList.contains("sds-menu-open")) {
          toggleMenu(false);
        }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          root.classList.remove("sds-resizing");
          isResizing = false;
          if (isSafari) {
            mainNav.style.opacity = "";
            mainNav.style.visibility = "";
            mainNav.style.transition = "";
            mainNav.style.transform = "";
          } else {
            mainNav.style.transition = "";
          }
        }, 200);
      } else if (isMobile && root.classList.contains("sds-menu-open")) {
        toggleMenu(false);
      }
    };
    let resizeDebounce;
    const debouncedResize = () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(handleResize, 10);
    };
    menuTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isResizing) {
        toggleMenu();
      }
    });
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        toggleMenu(false);
      });
    });
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("sds-menu-open")) {
        toggleMenu(false);
      }
    });
  };
  onReady(setup3);
}

// src/js/nav-underline.js
var DEFAULTS4 = {
  nav: "#sds-main-nav ul.sds-nav-links",
  header: "#sds-global-header",
  links: 'a[href*="#"]',
  sections: "main section[id]"
};
var initialized4 = false;
function initNavUnderline(options = {}) {
  if (initialized4) return;
  initialized4 = true;
  const config = { ...DEFAULTS4, ...options };
  const desktopMQ = window.matchMedia("(min-width: 769px)");
  const setup3 = () => {
    const nav = resolve(config.nav);
    if (!nav) return;
    const underline = nav.querySelector(".sds-nav-underline");
    if (!underline) return;
    const links = resolveAll(config.links, nav);
    const sections = resolveAll(config.sections);
    if (!links.length) return;
    underline.classList.add("sds-no-underline-transition");
    const style = document.createElement("style");
    style.textContent = `
      @media (min-width: 769px) {
        .sds-no-underline-transition {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    const getHeaderOffset = () => {
      const header = resolve(config.header);
      if (!header) return 100;
      return Math.ceil(header.getBoundingClientRect().height) + 1;
    };
    const getActiveSectionId = () => {
      const scrollPos = window.scrollY + getHeaderOffset();
      let activeId = sections[0]?.id || "";
      for (const section of sections) {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        if (scrollPos >= top && scrollPos < bottom) {
          activeId = section.id || "";
          break;
        }
      }
      return activeId;
    };
    const setUnderlineToLink = (a) => {
      if (!a) return;
      const left = a.offsetLeft;
      const width = a.offsetWidth;
      underline.style.transform = `translateX(${left}px)`;
      underline.style.width = `${width}px`;
    };
    let hasInitialized = false;
    const syncToActiveSection = () => {
      const id = getActiveSectionId();
      const activeLink = links.find((a) => a.hash === `#${id}`) || links[0];
      if (!activeLink) return;
      setUnderlineToLink(activeLink);
      if (!hasInitialized) {
        hasInitialized = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            underline.classList.remove("sds-no-underline-transition");
          });
        });
      }
    };
    let syncTimer = null;
    const scheduledSync = () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncToActiveSection, 100);
    };
    const cancelScheduledSync = () => {
      clearTimeout(syncTimer);
      syncTimer = null;
    };
    links.forEach((a) => {
      a.addEventListener("mouseenter", () => {
        cancelScheduledSync();
        setUnderlineToLink(a);
      });
      a.addEventListener("focus", () => setUnderlineToLink(a));
      a.addEventListener("mouseleave", (e) => {
        const goingToNavLink = links.some(
          (l) => l === e.relatedTarget || l.contains(e.relatedTarget)
        );
        if (!goingToNavLink) scheduledSync();
      });
    });
    nav.addEventListener("mouseleave", () => {
      cancelScheduledSync();
      syncToActiveSection();
    });
    nav.addEventListener("focusout", (e) => {
      if (!nav.contains(e.relatedTarget)) syncToActiveSection();
    });
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!desktopMQ.matches) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        syncToActiveSection();
        ticking = false;
      });
    });
    window.addEventListener("resize", () => {
      if (!desktopMQ.matches) return;
      underline.classList.add("sds-no-underline-transition");
      hasInitialized = false;
      syncToActiveSection();
    });
    syncToActiveSection();
    onLoad(syncToActiveSection);
  };
  if (desktopMQ.matches) onReady(setup3);
  desktopMQ.addEventListener("change", () => window.location.reload());
}

// src/js/outside-grid.js
var DEFAULTS5 = {
  element: ".sds-outside-grid",
  bands: 'body > [data-sds-theme="dark"], main > [data-sds-theme="dark"]'
};
var initialized5 = false;
function initOutsideGrid(options = {}) {
  if (initialized5) return;
  initialized5 = true;
  const config = { ...DEFAULTS5, ...options };
  onReady(() => setup(config));
}
function setup(config) {
  const outsideGrid = resolve(config.element);
  const bands = resolveAll(config.bands);
  if (outsideGrid && bands.length) {
    let updateClips = function() {
      const viewportHeight = window.innerHeight;
      const rects = [];
      bands.forEach((band) => {
        const r = band.getBoundingClientRect();
        const top = Math.max(0, r.top);
        const bottom = Math.min(viewportHeight, r.bottom);
        if (bottom <= top) return;
        const last = rects[rects.length - 1];
        if (last && top - last.bottom < 1) {
          last.bottom = Math.max(last.bottom, bottom);
        } else {
          rects.push({ top, bottom });
        }
      });
      if (!rects.length) {
        outsideGrid.style.removeProperty("--sds-outside-grid-dark-clip");
        outsideGrid.style.removeProperty("--sds-outside-grid-page-clip");
        return;
      }
      const loops = rects.map(({ top, bottom }) => `0 ${top}px, 100% ${top}px, 100% ${bottom}px, 0 ${bottom}px`).join(", ");
      outsideGrid.style.setProperty(
        "--sds-outside-grid-dark-clip",
        `polygon(evenodd, ${loops})`
      );
      outsideGrid.style.setProperty(
        "--sds-outside-grid-page-clip",
        `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, ${loops})`
      );
    };
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        updateClips();
        ticking = false;
      });
      ticking = true;
    }, { passive: true });
    updateClips();
    onLoad(updateClips);
    window.addEventListener("resize", updateClips);
  }
}

// src/js/tooltip.js
var initialized6 = false;
function initTooltip() {
  if (initialized6) return;
  initialized6 = true;
  onReady(setup2);
}
function setup2() {
  const GAP = 8;
  const MARGIN = 8;
  const tip = document.createElement("div");
  tip.className = "sds-tooltip";
  tip.id = "sds-tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  let current = null;
  const position = (trigger) => {
    const r = trigger.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let placement = trigger.dataset.tooltipPosition === "bottom" ? "bottom" : "top";
    if (placement === "top" && r.top - GAP - h < MARGIN) placement = "bottom";
    else if (placement === "bottom" && r.bottom + GAP + h > window.innerHeight - MARGIN) placement = "top";
    const top = placement === "top" ? r.top - GAP - h : r.bottom + GAP;
    const centered = r.left + r.width / 2 - w / 2;
    const left = Math.min(Math.max(centered, MARGIN), window.innerWidth - w - MARGIN);
    tip.dataset.placement = placement;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  };
  const show = (trigger) => {
    const text = trigger.dataset.tooltip;
    if (!text) return;
    if (current && current !== trigger) hide();
    current = trigger;
    tip.textContent = text;
    const themed = trigger.closest("[data-sds-theme]");
    if (themed) tip.setAttribute("data-sds-theme", themed.getAttribute("data-sds-theme"));
    else tip.removeAttribute("data-sds-theme");
    if (trigger.getAttribute("aria-hidden") !== "true") {
      trigger.setAttribute("aria-describedby", tip.id);
    }
    position(trigger);
    tip.classList.add("sds-is-visible");
  };
  const hide = () => {
    if (!current) return;
    if (current.getAttribute("aria-describedby") === tip.id) {
      current.removeAttribute("aria-describedby");
    }
    current = null;
    tip.classList.remove("sds-is-visible");
  };
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const trigger = e.target.closest("[data-sds-tooltip]");
    if (trigger && trigger !== current) show(trigger);
  });
  document.addEventListener("pointerout", (e) => {
    if (!current) return;
    const to = e.relatedTarget;
    if (to && current.contains(to)) return;
    if (e.target.closest("[data-sds-tooltip]") === current) hide();
  });
  document.addEventListener("focusin", (e) => {
    const trigger = e.target.closest("[data-sds-tooltip]");
    if (trigger && trigger.matches(":focus-visible")) show(trigger);
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.closest("[data-sds-tooltip]") === current) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);
}

// src/js/work-gallery.js
var initialized7 = false;
function initWorkGallery() {
  if (initialized7) return;
  initialized7 = true;
  function getLayout(hasFocus) {
    var w = window.innerWidth;
    if (hasFocus) {
      if (w >= 1280) return { cols: 4, focusSpan: 2 };
      if (w >= 960) return { cols: 3, focusSpan: 2 };
      if (w >= 768) return { cols: 3, focusSpan: 3 };
      if (w >= 400) return { cols: 2, focusSpan: 2 };
      return { cols: 1, focusSpan: 1 };
    }
    if (w >= 768) return { cols: 3, focusSpan: 0 };
    if (w >= 400) return { cols: 2, focusSpan: 0 };
    return { cols: 1, focusSpan: 0 };
  }
  function makePhantom(col, row, isLast) {
    var el = document.createElement("div");
    el.className = "sds-work-card--phantom";
    el.setAttribute("aria-hidden", "true");
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    if (isLast) el.classList.add("sds-is-last-in-row");
    return el;
  }
  function updateGallery(gallery) {
    var focusCard = gallery.querySelector(".sds-work-card--focus");
    var smallCards = Array.prototype.slice.call(
      gallery.querySelectorAll(".sds-work-card--small")
    );
    var layout = getLayout(!!focusCard);
    var cols = layout.cols;
    var focusSpan = layout.focusSpan;
    var allCards = focusCard ? [focusCard].concat(smallCards) : smallCards;
    allCards.forEach(function(card) {
      card.classList.remove("sds-is-last-in-row", "sds-is-last-row");
    });
    Array.prototype.slice.call(
      gallery.querySelectorAll(".sds-work-card--phantom")
    ).forEach(function(p2) {
      p2.remove();
    });
    var n = smallCards.length;
    if (focusCard && focusSpan >= cols) focusCard.classList.add("sds-is-last-in-row");
    if (n === 0) {
      if (focusCard) focusCard.classList.add("sds-is-last-row");
      return;
    }
    var row1Slots = cols - focusSpan;
    var positions = smallCards.map(function(_, i) {
      if (i < row1Slots) {
        return [1, focusSpan + 1 + i];
      }
      var j = i - row1Slots;
      return [2 + Math.floor(j / cols), 1 + j % cols];
    });
    var lastPos = positions[n - 1];
    var lastRow = lastPos[0];
    var lastCol = lastPos[1];
    var numPhantoms = cols - lastCol;
    smallCards.forEach(function(card, i) {
      var row = positions[i][0];
      var col2 = positions[i][1];
      if (row === lastRow) card.classList.add("sds-is-last-row");
      if (col2 === cols) card.classList.add("sds-is-last-in-row");
    });
    for (var p = 0; p < numPhantoms; p++) {
      var col = lastCol + 1 + p;
      var isLast = p === numPhantoms - 1;
      gallery.appendChild(makePhantom(col, lastRow, isLast));
    }
  }
  function update() {
    Array.prototype.slice.call(
      document.querySelectorAll(".sds-work-gallery")
    ).forEach(updateGallery);
  }
  var resizeTimer;
  window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(update, 50);
  });
  onReady(update);
}

// src/js/contact-form.js
var DEFAULTS6 = {
  form: ".sds-contact-form",
  fields: "[required]",
  submitError: ".sds-form-submit-error",
  messages: {
    blank: "This field can't be left blank",
    email: "Please enter a valid email address"
  },
  onValid: null
};
var initialized8 = false;
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function setError(input, message) {
  const field = input.closest(".sds-form-field");
  if (!field) return;
  const errorText = field.querySelector(".sds-form-error-text");
  if (errorText) errorText.textContent = message;
  field.classList.add("sds-form-field--error");
  input.setAttribute("aria-invalid", "true");
}
function clearError(input) {
  const field = input.closest(".sds-form-field");
  if (field) field.classList.remove("sds-form-field--error");
  input.setAttribute("aria-invalid", "false");
}
function initContactForm(options = {}) {
  if (initialized8) return;
  initialized8 = true;
  const config = {
    ...DEFAULTS6,
    ...options,
    messages: { ...DEFAULTS6.messages, ...options.messages }
  };
  function fieldError(input) {
    const value = input.value.trim();
    if (value.length === 0) return config.messages.blank;
    if (input.type === "email" && !isValidEmail(value)) return config.messages.email;
    return null;
  }
  function setupForm(form) {
    const inputs = resolveAll(config.fields, form);
    const submitError = form.querySelector(config.submitError);
    function showSubmitError() {
      if (submitError) submitError.style.display = "flex";
    }
    function hideSubmitError() {
      if (submitError) submitError.style.display = "";
    }
    function validateAll() {
      let valid = true;
      inputs.forEach((input) => {
        const message = fieldError(input);
        if (message) {
          setError(input, message);
          valid = false;
        } else {
          clearError(input);
        }
      });
      return valid;
    }
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        if (input.value.trim().length > 0) clearError(input);
        hideSubmitError();
      });
    });
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      if (validateAll()) {
        hideSubmitError();
        if (typeof config.onValid === "function") config.onValid(form, e);
      } else {
        showSubmitError();
      }
    });
  }
  onReady(() => resolveAll(config.form).forEach(setupForm));
}

// src/js/index.js
var modules = {
  theme: initTheme,
  headerColors: initHeaderColors,
  menu: initMenu,
  navUnderline: initNavUnderline,
  outsideGrid: initOutsideGrid,
  tooltip: initTooltip,
  workGallery: initWorkGallery,
  contactForm: initContactForm
};
function init(options = {}) {
  for (const [key, start] of Object.entries(modules)) {
    const moduleOptions = options[key];
    if (moduleOptions === false) continue;
    start(typeof moduleOptions === "object" && moduleOptions !== null ? moduleOptions : {});
  }
}
export {
  init,
  initContactForm,
  initHeaderColors,
  initMenu,
  initNavUnderline,
  initOutsideGrid,
  initTheme,
  initTooltip,
  initWorkGallery
};
