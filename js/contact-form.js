/* js/contact-form.js
   Contact form validation:
   - On submit: blank-field check for Name, Email, Message
     Email shows "blank" error if empty, "format" error if invalid
   - Field errors clear as soon as the user starts correcting them
   - A submit-level error message appears next to the button on failed submit
*/

(function () {

    const MSG_BLANK = "This field can't be left blank";
    const MSG_EMAIL = 'Please enter a valid email address';

    // x@y.z — something before @, a domain, a dot, a TLD
    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function setError(input, message) {
        const field = input.closest('.form-field');
        const errorText = field.querySelector('.form-error-text');
        if (errorText) errorText.textContent = message;
        field.classList.add('form-field--error');
        input.setAttribute('aria-invalid', 'true');
    }

    function clearError(input) {
        const field = input.closest('.form-field');
        field.classList.remove('form-field--error');
        input.setAttribute('aria-invalid', 'false');
    }

    // Full submit-time check across all required fields
    function validateAll(form) {
        let valid = true;

        // Name — required, must not be blank
        const name = form.querySelector('#contact-name');
        if (name) {
            if (name.value.trim().length === 0) {
                setError(name, MSG_BLANK);
                valid = false;
            } else {
                clearError(name);
            }
        }

        // Email — blank → MSG_BLANK; non-empty but invalid → MSG_EMAIL
        const email = form.querySelector('#contact-email');
        if (email) {
            if (email.value.trim().length === 0) {
                setError(email, MSG_BLANK);
                valid = false;
            } else if (!isValidEmail(email.value.trim())) {
                setError(email, MSG_EMAIL);
                valid = false;
            } else {
                clearError(email);
            }
        }

        // Message — required, must not be blank
        const message = form.querySelector('#contact-message');
        if (message) {
            if (message.value.trim().length === 0) {
                setError(message, MSG_BLANK);
                valid = false;
            } else {
                clearError(message);
            }
        }

        return valid;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const form = document.querySelector('.contact-form');
        if (!form) return;

        const submitError = form.querySelector('#contact-submit-error');

        function showSubmitError() {
            if (submitError) submitError.style.display = 'flex';
        }

        function hideSubmitError() {
            if (submitError) submitError.style.display = '';
        }

        // Clear field errors as soon as the user starts correcting them.
        // Also dismiss the submit-level message — they've acknowledged it.
        ['#contact-name', '#contact-email', '#contact-message'].forEach(selector => {
            const input = form.querySelector(selector);
            if (!input) return;
            input.addEventListener('input', () => {
                if (input.value.trim().length > 0) clearError(input);
                hideSubmitError();
            });
        });

        // Submit — validate everything, block if invalid
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (validateAll(form)) {
                hideSubmitError();
                // All fields valid — wire up actual submission here
            } else {
                showSubmitError();
            }
        });
    });

}());
