document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        showAdmin: false
    });
});