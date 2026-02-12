/**
 * nav-underline.js
 * Animated underline for desktop global header nav links.
 *
 * Fix: prevents the "first move" animation from x=0 (left edge of the nav/viewport)
 * by keeping transitions disabled until AFTER the underline has been positioned
 * at the active link at least once.
 */

(() => {
  const desktopMQ = window.matchMedia("(min-width: 769px)");

  const init = () => {
    const nav = document.querySelector("#main-nav ul.nav-links");
    if (!nav) return;

    const underline = nav.querySelector(".nav-underline");
    if (!underline) return;

    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const sections = Array.from(document.querySelectorAll("main section[id]"));
    if (!links.length || !sections.length) return;

    // --- IMPORTANT: keep transitions OFF until we have placed it correctly once ---
    // This prevents any first-time animation from translateX(0).
    underline.classList.add("no-underline-transition");

    // Inject a small style for the "no transition" state (keeps this file self-contained)
    // If you prefer CSS-only, move this rule into your stylesheet.
    const style = document.createElement("style");
    style.textContent = `
      @media (min-width: 769px) {
        .no-underline-transition {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const getHeaderOffset = () => {
      // Use the real header height (+1px fudge) to match your header-colors.js logic
      const header = document.getElementById("global-header");
      if (!header) return 100;
      return Math.ceil(header.getBoundingClientRect().height) + 1;
    };

    const getActiveSectionId = () => {
      const scrollPos = window.scrollY + getHeaderOffset();
      let activeId = sections[0]?.id || "hero";

      for (const section of sections) {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        if (scrollPos >= top && scrollPos < bottom) {
          activeId = section.id || "hero";
          break;
        }
      }
      return activeId;
    };

    const setUnderlineToLink = (a) => {
      if (!a) return;

      // Use offsets to avoid viewport-based math/jank during scroll
      const left = a.offsetLeft;
      const width = a.offsetWidth;

      underline.style.transform = `translateX(${left}px)`;
      underline.style.width = `${width}px`;
    };

    let hasInitialized = false;

    const syncToActiveSection = () => {
      const id = getActiveSectionId();
      const activeLink = links.find((a) => a.getAttribute("href") === `#${id}`);
      if (!activeLink) return;

      // 1) Always position correctly (with transitions currently OFF)
      setUnderlineToLink(activeLink);

      // 2) After first correct placement, enable transitions for future moves
      if (!hasInitialized) {
        hasInitialized = true;

        // Ensure the browser has applied the transform/width before enabling transitions
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            underline.classList.remove("no-underline-transition");
          });
        });
      }
    };

    // Hover/focus moves underline (after transitions enabled, it'll animate)
    links.forEach((a) => {
      a.addEventListener("mouseenter", () => setUnderlineToLink(a));
      a.addEventListener("focus", () => setUnderlineToLink(a));
    });

    // Restore underline on leave
    nav.addEventListener("mouseleave", syncToActiveSection);
    nav.addEventListener("focusout", (e) => {
      if (!nav.contains(e.relatedTarget)) syncToActiveSection();
    });

    // Scroll updates (rAF throttled)
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

    // Resize: snap (no animation) then re-enable transitions
    window.addEventListener("resize", () => {
      if (!desktopMQ.matches) return;

      underline.classList.add("no-underline-transition");
      hasInitialized = false;
      syncToActiveSection();
    });

    // Initial sync ASAP + after load (fonts/layout)
    syncToActiveSection();
    window.addEventListener("load", syncToActiveSection);
  };

  if (desktopMQ.matches) init();

  desktopMQ.addEventListener("change", () => window.location.reload());
})();