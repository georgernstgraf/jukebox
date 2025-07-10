document.body.addEventListener('htmx:beforeRequest', function (evt) {
    console.log('htmx:beforeRequest', evt);
    document.getElementById('spinner').style.display = 'block';
});
document.body.addEventListener('htmx:afterRequest', function (evt) {
    console.log('htmx:afterRequest', evt);
    document.getElementById('spinner').style.display = 'none';
});
