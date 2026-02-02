// js/theme.js

{
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    // Listen for System Preference changes
    mediaQuery.addEventListener('change', (e) => {
        // Only auto-switch if the user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    window.addEventListener('DOMContentLoaded', () => {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const currentTheme = root.getAttribute('data-theme');
                applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
            });
        }
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            document.documentElement.classList.remove('no-transition');
        }, 100); 
    });
}