/**
 * Header Color Controller
 * Manages header theme variables based on the section currently in view.
 */
{
    const header = document.getElementById('global-header');
    const sections = document.querySelectorAll('section, footer');
    const root = document.documentElement;

    // Track which section is currently active to prevent redundant DOM updates
    let currentSection = '';

    const sectionColors = {
        'hero': {
            headerBg: 'oklch(from var(--color-background-accent-1) l c h / 0.9)',
            headerLogo: 'var(--color-accent-1)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        },
        'work': {
            headerBg: 'oklch(from var(--color-background) l c h / 0.9)',
            headerLogo: 'var(--color-logo)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        },
        'about': {
            headerBg: 'oklch(from var(--color-background-accent-2) l c h / 0.9)',
            headerLogo: 'var(--color-accent-2)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        },
        'contact': {
            headerBg: 'oklch(from var(--color-background) l c h / 0.9)',
            headerLogo: 'var(--color-logo)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        },
        'global-footer': {
            headerBg: 'oklch(from var(--color-background-offset) l c h / 0.9)',
            headerLogo: 'var(--color-accent-1)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        }
    };

    function updateSectionColors(sectionId) {
        const colors = sectionColors[sectionId];
        if (!colors || !header) return;

        header.style.setProperty('--color-header-bg', colors.headerBg);
        header.style.setProperty('--color-header-logo', colors.headerLogo);
        header.style.setProperty('--color-header-name', colors.headerName);
        header.style.setProperty('--color-header-role', colors.headerRole);
    }

    function updateHeaderBackground() {
        // Using your 97px offset to ensure we cross the boundary
        const scrollPos = window.scrollY + 97; 
        let activeSectionId = 'hero';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            // Check if our scroll position is within this section's bounds
            if (scrollPos >= sectionTop && scrollPos < (sectionTop + sectionHeight)) {
                activeSectionId = section.id || (section.tagName === 'FOOTER' ? 'global-footer' : 'hero');
            }
        });

        if (currentSection !== activeSectionId) {
            currentSection = activeSectionId;
            updateSectionColors(activeSectionId);
        }
    }

    // 1. Handle Scroll with RequestAnimationFrame for performance
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateHeaderBackground();
                ticking = false;
            });
            ticking = true;
        }
    });

    // 2. Intersection Observer (The "Safety Net" for Jumps)
    // This catches anchor link jumps even if the scroll event is bypassed
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateHeaderBackground();
            }
        });
    }, { rootMargin: '-97px 0px -80% 0px' });

    sections.forEach(section => observer.observe(section));

    // Initial check on load
    updateHeaderBackground();

    // Restores scroll position from a previous session
    window.addEventListener('load', updateHeaderBackground);
    
    // Ensures correct header state after all resources are loaded
    window.addEventListener('load', updateHeaderBackground);
}