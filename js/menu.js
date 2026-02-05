// menu.js

{
    const initMenu = () => {
        const root = document.documentElement;
        const menuTrigger = document.getElementById('menu-trigger');
        const mainNav = document.getElementById('main-nav');
        const navLinks = document.querySelectorAll('.header-nav a');

        if (!menuTrigger || !mainNav) return;

        // =============================================
        // Detect Safari
        // =============================================
        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // ✅ ADD: Detect reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // =============================================
        // Track Viewport State
        // =============================================
        
        let isMobile = window.innerWidth <= 768;
        let resizeTimer;
        let isResizing = false;

        // =============================================
        // Toggle Menu Function
        // =============================================
        
        // Later in toggleMenu function, you can optionally adjust timing:
        const toggleMenu = (state) => {
            const isOpening = state !== undefined ? state : !root.classList.contains('menu-open');
            const header = document.getElementById('global-header');
            
            root.classList.toggle('menu-open', isOpening);
            menuTrigger.setAttribute('aria-expanded', isOpening);
            
            if (isOpening) {
                const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
                document.body.style.paddingRight = `${scrollBarWidth}px`;
                if (header) header.style.paddingRight = `${scrollBarWidth}px`;
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                if (header) header.style.paddingRight = '';
            }
        };

        // =============================================
        // Handle Resize with Safari-Specific Logic
        // =============================================
        
        const handleResize = () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth <= 768;
            
            const crossedBreakpoint = wasMobile !== isMobile;
            
            if (crossedBreakpoint) {
                if (isSafari) {
                    // Safari: Completely hide menu and disable ALL transitions
                    mainNav.style.opacity = '0';
                    mainNav.style.visibility = 'hidden';
                    mainNav.style.transition = 'none';
                    mainNav.style.transform = 'translateX(100%)';
                    
                    // Force reflow
                    void mainNav.offsetHeight;
                } else {
                    // Non-Safari: Just disable transition
                    mainNav.style.transition = 'none';
                    void mainNav.offsetHeight;
                }
                
                // Add resizing class
                root.classList.add('resizing');
                isResizing = true;
                
                // Close menu if switching to desktop
                if (!isMobile && root.classList.contains('menu-open')) {
                    toggleMenu(false);
                }
                
                // Re-enable after layout settles
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    root.classList.remove('resizing');
                    isResizing = false;
                    
                    if (isSafari) {
                        // Restore styles
                        mainNav.style.opacity = '';
                        mainNav.style.visibility = '';
                        mainNav.style.transition = '';
                        mainNav.style.transform = '';
                    } else {
                        mainNav.style.transition = '';
                    }
                }, 200);
            } else if (isMobile && root.classList.contains('menu-open')) {
                // Still mobile but resizing - close if open
                toggleMenu(false);
            }
        };

        // =============================================
        // Debounced Resize Handler
        // =============================================
        
        let resizeDebounce;
        const debouncedResize = () => {
            clearTimeout(resizeDebounce);
            resizeDebounce = setTimeout(handleResize, 10);
        };

        // =============================================
        // Event Listeners
        // =============================================
        
        menuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            // Only allow toggle if not currently resizing
            if (!isResizing) {
                toggleMenu();
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        });

        // Use debounced handler for better performance
        window.addEventListener('resize', debouncedResize);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && root.classList.contains('menu-open')) {
                toggleMenu(false);
            }
        });
    };

    // =============================================
    // Initialize
    // =============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu);
    } else {
        initMenu();
    }
}