document.body.addEventListener('htmx:beforeRequest', function (evt) {
    console.log('htmx:beforeRequest', evt);
    document.getElementById('spinner').style.display = 'block';
});
document.body.addEventListener('htmx:afterRequest', function (evt) {
    console.log('htmx:afterRequest', evt);
    document.getElementById('spinner').style.display = 'none';
});
function showToast(message, type = 'info') {
    const duration = 3000; // also in css transition
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => {
            document.body.removeChild(toast);
        });
    }, duration);
}

document.body.addEventListener('htmx:responseError', function (event) {
    console.error('Georg Response Error:', event);
    const xhr = event.detail.xhr;
    const status = xhr.status;
    let errorMessage = xhr.response || `no xhr response (status: ${status})`;
    showToast(errorMessage, 'error'); // Display error toast for 5 seconds
});

// Optional: Handle network errors (e.g., server offline, DNS issues)
document.body.addEventListener('htmx:sendError', function (event) {
    console.error('Georg Send Error:', event);
    showToast('Network error: Could not reach the server.', 'error');
});
