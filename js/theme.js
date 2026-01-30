// js/theme.js

const root = document.documentElement;

// 1. Apply theme immediately to prevent flashing
const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

root.setAttribute('data-theme', savedTheme);

// 2. Wait for the HTML to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('theme-toggle');

    // Only run if the button actually exists on this page
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    } // Ends if(toggleBtn)

    // Remove the 'no-transition' class after a brief delay
    setTimeout(() => {
        root.classList.remove('no-transition');
    }, 100);
}); // Ends window.addEventListener