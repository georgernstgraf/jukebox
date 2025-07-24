document.body.addEventListener('htmx:beforeRequest', function (evt) {
    console.log('htmx:beforeRequest', evt);
    document.getElementById('spinner').classList.remove('d-none');
});
document.body.addEventListener('htmx:afterRequest', function (evt) {
    console.log('htmx:afterRequest', evt);
    document.getElementById('spinner').classList.add('d-none');
});
document.body.addEventListener('htmx:responseError', function (event) {
    console.error('Georg Response Error:', event);
    const xhr = event.detail.xhr;
    const status = xhr.status;
    let errorMessage = xhr.response || `no xhr response (status: ${status})`;
    showToast(errorMessage, 'error'); // Display error toast for 5 seconds
});
document.body.addEventListener('htmx:sendError', function (event) {
    console.error('Georg htmx:sendError: TODO toast some event details', event);
    showToast('Network error: Could not reach the server.', 'error');
});
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `jukebox-toast ${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => {
            document.body.removeChild(toast);
        }, { once: true });
    }, duration);
}

function initAudios() {
    console.log('initAudios');
    const audios = Array.from(document.querySelectorAll('audio'));
    audios.forEach((audio, idx) => {
        audio.addEventListener('ended', () => {
            const nextAudio = audios[idx + 1];
            if (nextAudio) {
                nextAudio.play();
            }
            audio.parentElement.classList.remove('active');
        });
        audio.addEventListener('play', () => {
            audios.forEach((otherAudio) => {
                if (otherAudio !== audio) {
                    otherAudio.pause();
                    otherAudio.parentElement.classList.remove('active');
                }
                audio.parentElement.classList.add('active');
            });
        });
        audio.parentElement.addEventListener('click', (event) => {
            console.log('Parent clicked for audio:', audio);
            event.stopPropagation(); // Prevent the click from propagating further
            audio.play();
        });
    });
}
