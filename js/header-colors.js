/**
 * Header Color Controller
 * Manages header theme variables based on the section currently in view.
 *
 * Update: header offset is now computed from the real header height (+1px)
 * so it stays correct above/below 960px (and any future layout changes).
 */
{
  const header = document.getElementById("global-header");
  const sections = document.querySelectorAll("section");
  const root = document.documentElement;

  let currentSection = "";

  const sectionColors = {
    hero: {
      headerBg: "oklch(from var(--color-background-accent-hero) l c h / 0.8)",
      headerLogo: "var(--color-accent-hero)",
      headerName: "var(--color-text)",
      headerRole: "var(--color-text-meta)",
      headerUnderline: "var(--color-accent-hero)",
    },
    work: {
      headerBg: "oklch(from var(--color-background) l c h / 0.8)",
      headerLogo: "var(--color-logo)",
      headerName: "var(--color-text)",
      headerRole: "var(--color-text-meta)",
      headerUnderline: "var(--color-accent-work)",
    },
    about: {
      headerBg: "oklch(from var(--color-background-accent-about) l c h / 0.8)",
      headerLogo: "var(--color-accent-about)",
      headerName: "var(--color-text)",
      headerRole: "var(--color-text-meta)",
      headerUnderline: "var(--color-accent-about)",
    },
    contact: {
      headerBg: "oklch(from var(--color-background) l c h / 0.8)",
      headerLogo: "var(--color-logo)",
      headerName: "var(--color-text)",
      headerRole: "var(--color-text-meta)",
      headerUnderline: "var(--color-accent-contact)",
    },
  };

  function updateSectionColors(sectionId) {
    const colors = sectionColors[sectionId];
    if (!colors) return;

    root.style.setProperty("--color-header-bg", colors.headerBg);
    root.style.setProperty("--color-header-logo", colors.headerLogo);
    root.style.setProperty("--color-header-name", colors.headerName);
    root.style.setProperty("--color-header-role", colors.headerRole);

    // Safe fallback if a section is missing headerUnderline
    root.style.setProperty(
      "--color-header-underline",
      colors.headerUnderline || "var(--color-accent)"
    );
  }

  // ---- Dynamic header offset (+1px fudge) ----
  // Using ceil avoids fractional heights causing off-by-1 boundary issues.
  let headerOffset = 98; // fallback until computed

  function computeHeaderOffset() {
    if (!header) return 98;
    return Math.ceil(header.getBoundingClientRect().height) + 1;
  }

  function applyHeaderOffset() {
    headerOffset = computeHeaderOffset();

    // Update observer margins so IntersectionObserver aligns with current header height
    // rootMargin: top = -headerOffset, bottom = -80% (keep your existing behavior)
    if (observer) {
      observer.disconnect();
      sections.forEach((section) => observer.observe(section));
    }
  }

  function updateHeaderBackground() {
    // Use computed header height instead of a hard-coded 97/81/etc.
    const scrollPos = window.scrollY + headerOffset;
    let activeSectionId = "hero";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        activeSectionId = section.id || "hero";
      }
    });

    if (currentSection !== activeSectionId) {
      currentSection = activeSectionId;
      updateSectionColors(activeSectionId);
    }
  }

  // ---- Scroll (rAF throttled) ----
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      updateHeaderBackground();
      ticking = false;
    });
    ticking = true;
  });

  // ---- IntersectionObserver ----
  // NOTE: rootMargin is computed dynamically from headerOffset.
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
        rootMargin: `-${headerOffset}px 0px -80% 0px`,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  // ---- Keep offset in sync with responsive header ----
  const refreshAll = () => {
    headerOffset = computeHeaderOffset();
    createObserver();
    updateHeaderBackground();
  };

  // Initial
  refreshAll();

  // Recompute on load (fonts/layout settling) + resize (breakpoints)
  window.addEventListener("load", refreshAll);
  window.addEventListener("resize", () => {
    // On resize we must rebuild the observer because rootMargin is not mutable.
    refreshAll();
  });
}