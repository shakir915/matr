// Floating Labels Handler
document.addEventListener('DOMContentLoaded', function() {
    // Handle input fields
    function handleFloatingLabels() {
        const floatingInputs = document.querySelectorAll('.floating-label input');
        const floatingSelects = document.querySelectorAll('.floating-label select');
        const floatingTextareas = document.querySelectorAll('.floating-label textarea');

        // Handle inputs and textareas
        [...floatingInputs, ...floatingTextareas].forEach(element => {
            // Check on page load
            updateFloatingLabel(element);
            
            // Add event listeners
            element.addEventListener('input', () => updateFloatingLabel(element));
            element.addEventListener('blur', () => updateFloatingLabel(element));
            element.addEventListener('focus', () => updateFloatingLabel(element));
        });

        // Handle select dropdowns
        floatingSelects.forEach(select => {
            // Check on page load
            updateFloatingLabel(select);
            
            // Add event listeners
            select.addEventListener('change', () => updateFloatingLabel(select));
            select.addEventListener('focus', () => updateFloatingLabel(select));
            select.addEventListener('blur', () => updateFloatingLabel(select));
        });
    }

    function updateFloatingLabel(element) {
        const label = element.nextElementSibling;
        if (!label || !label.matches('label')) return;

        const hasValue = element.value && element.value.trim() !== '';
        const isFocused = document.activeElement === element;
        
        if (hasValue || isFocused) {
            element.classList.add('has-value');
            label.classList.add('active');
        } else {
            element.classList.remove('has-value');
            label.classList.remove('active');
        }
    }

    // Initialize floating labels
    handleFloatingLabels();

    // Re-initialize when modals are opened
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    const floatingLabels = node.querySelectorAll ? node.querySelectorAll('.floating-label') : [];
                    if (floatingLabels.length > 0 || node.classList?.contains('floating-label')) {
                        setTimeout(handleFloatingLabels, 100);
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Handle form resets
    document.addEventListener('reset', function(e) {
        setTimeout(() => {
            const form = e.target;
            const floatingInputs = form.querySelectorAll('.floating-label input, .floating-label select, .floating-label textarea');
            floatingInputs.forEach(element => {
                element.classList.remove('has-value');
                const label = element.nextElementSibling;
                if (label && label.matches('label')) {
                    label.classList.remove('active');
                }
            });
        }, 10);
    });
});