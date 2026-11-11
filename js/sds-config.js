/**
 * Portfolio JS config for the Studioesque Design System.
 *
 * These are the portfolio-specific values that used to be hard-coded in
 * src/js/theme.js and src/js/header-colors.js, moved here verbatim (comments
 * included). Copy into the portfolio and pass to init():
 *
 *   <script type="module">
 *     import { init } from './sds/js/index.js';
 *     import { sdsOptions } from './js/sds-config.js';
 *     init(sdsOptions);
 *   </script>
 *
 * Depends on docs/portfolio-migration/portfolio-tokens.css (the
 * --sds-color-*-accent-* tokens referenced below) and, for the hero entry,
 * on the portfolio's own hero-interactive.js (--sds-hero-live-*).
 */

export const sdsOptions = {
    theme: {
        // The portfolio shipped with a 'theme' localStorage key; existing
        // visitors' choice is copied to 'sds-theme' once.
        legacyStorageKey: 'theme',

        // Before the first sds:sectionchange event the page is assumed to be
        // at the top (hero).
        initialSection: 'hero',

        // iOS's theme-color meta tag parser only accepts sRGB (hex/rgb/named).
        // OKLCH and CSS variables are rejected. These are the sRGB equivalents
        // of each section's --sds-color-background-accent-* value in each theme.
        // If section background colors change in colors.css, update these too.
        // "related-work" uses the same dark hex under both keys — that section
        // forces dark theme via data-sds-theme="dark" regardless of the page's
        // current light/dark toggle, so the status bar should match it exactly
        // either way rather than following the root theme.
        // '#272727' = --sds-grey-90 (dark --sds-color-background-accent-related-work).
        metaColors: {
            light: { hero: '#EB5125', work: '#FFFFFF', about: '#FFEDDA', contact: '#FFFFFF', 'related-work': '#272727', profile: '#FFFFFF' },
            dark:  { hero: '#143457', work: '#192027', about: '#15393E', contact: '#192027', 'related-work': '#272727', profile: '#192027' },
        },

        // Previous behavior: any section without an entry (including the
        // "default" id for no section, and "page-hero" on subpages) got the
        // LIGHT hero color, in both themes. Kept as-is; see HANDOFF open items.
        metaFallback: '#EB5125',
    },

    headerColors: {
        colors: {
            // --sds-hero-live-* are set by js/hero-interactive.js (opt-in interactive
            // hero only). Unset everywhere else, so each falls back to the static
            // hero value and this behaves exactly as before.
            hero: {
                // --sds-hero-live-header-bg: optional full override (unused for now — set
                // it to e.g. transparent on <html>); otherwise the live/static hero
                // color at 90%.
                headerBg: "var(--sds-hero-live-header-bg, oklch(from var(--sds-hero-live-bg, var(--sds-color-background-accent-hero)) l c h / 0.9))",
                headerLogo: "var(--sds-hero-live-text, var(--sds-color-accent-hero))",
                headerName: "var(--sds-hero-live-header-text, var(--sds-color-text))",
                headerRole: "var(--sds-hero-live-header-text, var(--sds-color-text))",
                headerUnderline: "var(--sds-hero-live-text, var(--sds-color-accent-hero))",
            },
            // Portfolio subpage hero (styles/04-components/page-hero.css) — plain
            // content background, no accent color. Identical to "default" today;
            // kept as its own explicit entry so it can diverge later without
            // relying on the id-not-found fallback.
            "page-hero": {
                headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
                headerLogo: "var(--sds-color-logo)",
                headerName: "var(--sds-color-text)",
                headerRole: "var(--sds-color-text-meta)",
                headerUnderline: "var(--sds-color-accent)",
            },
            work: {
                headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
                headerLogo: "var(--sds-color-accent-work)",
                headerName: "var(--sds-color-text)",
                headerRole: "var(--sds-color-text-meta)",
                headerUnderline: "var(--sds-color-accent-work)",
            },
            about: {
                headerBg: "oklch(from var(--sds-color-background-accent-about) l c h / 0.9)",
                headerLogo: "var(--sds-color-accent-about)",
                headerName: "var(--sds-color-text)",
                headerRole: "var(--sds-color-text-meta)",
                headerUnderline: "var(--sds-color-accent-about)",
            },
            contact: {
                headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
                headerLogo: "var(--sds-color-accent-contact)",
                headerName: "var(--sds-color-text)",
                headerRole: "var(--sds-color-text-meta)",
                headerUnderline: "var(--sds-color-accent-contact)",
            },
            // "Related work" gallery (portfolio pages) — forced dark theme via
            // data-sds-theme="dark" on the section itself, independent of the page's
            // current light/dark toggle. var(--sds-color-background) etc. would follow
            // the ROOT's data-sds-theme (the header lives outside this section in the
            // DOM, so it doesn't inherit the section's forced-dark scope) — so
            // these values are the dark-theme recipe written out literally instead.
            // The underlying scale tokens (--sds-l-95, --sds-c-blue-95, --sds-white-a90,
            // etc.) are theme-independent, defined once in :root, so this stays
            // correct regardless of the root theme. Keep in sync with
            // [data-sds-theme="dark"] in colors.css if that recipe changes.
            "related-work": {
                headerBg: "oklch(from var(--sds-color-background-accent-related-work) l c h / 0.9)",
                headerLogo: "var(--sds-white-a90)",
                headerName: "var(--sds-white-a90)",
                headerRole: "var(--sds-white-a60)",
                headerUnderline: "oklch(var(--sds-l-40) var(--sds-c-blue-40) var(--sds-h-blue))",
                // See header-dark-forced handling in header-colors.js — the header is
                // outside this section's DOM subtree, so it can't pick up the section's
                // data-sds-theme="dark" via CSS alone. Flag it here so JS can swap it too.
                // (.sds-outside-grid has the same problem; js/outside-grid.js handles it.)
                forceDark: true,
            },
        },
    },
};
