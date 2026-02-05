// js/theme.js

{
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isSafari) {
        document.documentElement.classList.add('is-safari');
    }
    
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // =============================================
    // SVG Theme Toggle Animation Paths
    // =============================================
    
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

    // =============================================
    // Animate SVG Icon (Non-Safari)
    // =============================================
    
    const animateThemeIconModern = (theme) => {
        const body = document.querySelector('.morph-body');
        const rays = {};
        
        // Collect all ray elements
        for (let i = 1; i <= 12; i++) {
            rays[i] = document.querySelector(`.morph-ray-${i}`);
        }
        
        if (!body) return;
        
        const targetPaths = svgPaths[theme];
        const duration = 300;
        const easing = 'ease-in-out';
        
        try {
            // Animate body (sun circle → crescent moon or vice versa)
            body.animate(
                [{ d: `path("${targetPaths.body}")` }],
                { duration, easing, fill: 'forwards' }
            );
            
            // Animate rays
            for (let i = 1; i <= 12; i++) {
                if (rays[i]) {
                    rays[i].animate(
                        [{ d: `path("${targetPaths.rays[i]}")` }],
                        { duration, easing, fill: 'forwards' }
                    );
                }
            }
        } catch (error) {
            // Fallback: Directly set paths
            console.warn('Animation failed, using fallback:', error);
            setThemeIconPaths(theme);
        }
    };

    // =============================================
    // Safari-Specific: Crossfade Animation
    // =============================================
    
    const animateThemeIconSafari = (theme) => {
        const themeIcon = document.querySelector('.theme-icon');
        if (!themeIcon) return;
        
        // Add fade class
        themeIcon.style.opacity = '0';
        
        setTimeout(() => {
            // Update paths during fade
            setThemeIconPaths(theme);
            
            // Fade back in
            themeIcon.style.opacity = '1';
        }, 150); // Half of total 300ms duration
    };

    // =============================================
    // Direct Path Setting (No Animation)
    // =============================================
    
    const setThemeIconPaths = (theme) => {
        const body = document.querySelector('.morph-body');
        const targetPaths = svgPaths[theme];
        
        if (!body || !targetPaths) return;
        
        // Set body path
        body.setAttribute('d', targetPaths.body);
        
        // Set ray paths
        for (let i = 1; i <= 12; i++) {
            const ray = document.querySelector(`.morph-ray-${i}`);
            if (ray && targetPaths.rays[i]) {
                ray.setAttribute('d', targetPaths.rays[i]);
            }
        }
    };

    // =============================================
    // Unified Animation Router
    // =============================================
    
    const animateThemeIcon = (theme) => {
        if (isSafari) {
            animateThemeIconSafari(theme);
        } else {
            animateThemeIconModern(theme);
        }
    };

    // =============================================
    // Apply Theme with Animation
    // =============================================
    
    const applyTheme = (theme, animate = true) => {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (animate) {
            animateThemeIcon(theme);
        } else {
            setThemeIconPaths(theme);
        }
    };

    // =============================================
    // Listen for System Preference Changes
    // =============================================
    
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // =============================================
    // Manual Theme Toggle
    // =============================================
    
    window.addEventListener('DOMContentLoaded', () => {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const currentTheme = root.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme(newTheme, true);
            });
        }
        
        // Set initial SVG state without animation
        const initialTheme = root.getAttribute('data-theme') || 'light';
        setThemeIconPaths(initialTheme);
    });

    // =============================================
    // Remove FOUC Lock
    // =============================================
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            root.classList.remove('no-transition');
        }, 100); 
    });
}