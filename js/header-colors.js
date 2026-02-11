/**
 * Header Color Controller
 * Manages header theme variables based on the section currently in view.
 */
{
    const header = document.getElementById('global-header');
    // REMOVED: footer from querySelector
    const sections = document.querySelectorAll('section');
    const root = document.documentElement;

    let currentSection = '';

    const sectionColors = {
        'hero': {
            headerBg: 'oklch(from var(--color-background-accent-hero) l c h / 0.9)',
            headerLogo: 'var(--color-accent-hero)',
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
            headerBg: 'oklch(from var(--color-background-accent-about) l c h / 0.9)',
            headerLogo: 'var(--color-accent-about)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        },
        'contact': {
            headerBg: 'oklch(from var(--color-background) l c h / 0.9)',
            headerLogo: 'var(--color-logo)',
            headerName: 'var(--color-text)',
            headerRole: 'var(--color-text-meta)'
        }
        // REMOVED: 'global-footer' entry
    };

    function updateSectionColors(sectionId) {
        const colors = sectionColors[sectionId];
        if (colors) {
            root.style.setProperty('--color-header-bg', colors.headerBg);
            root.style.setProperty('--color-header-logo', colors.headerLogo);
            root.style.setProperty('--color-header-name', colors.headerName);
            root.style.setProperty('--color-header-role', colors.headerRole);
        }
    }

    function updateHeaderBackground() {
        const scrollPos = window.scrollY + 100; 
        let activeSectionId = 'hero';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollPos >= sectionTop && scrollPos < (sectionTop + sectionHeight)) {
                // REMOVED: check for footer tag
                activeSectionId = section.id || 'hero';
            }
        });

        if (currentSection !== activeSectionId) {
            currentSection = activeSectionId;
            updateSectionColors(activeSectionId);
        }
    }

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

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateHeaderBackground();
            }
        });
    }, { rootMargin: '-97px 0px -80% 0px' });

    sections.forEach(section => observer.observe(section));

    updateHeaderBackground();
    window.addEventListener('load', updateHeaderBackground);
}