function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.onload = function() {
    loadNavbar();
    loadCopyright();
};   



const passwordResetButton = document.getElementById('reset-button');
passwordResetButton.addEventListener('click', async function (e) {
    e.preventDefault(); // Stop form submission

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const errorMsg = document.getElementById('error-msg');

    const res = await fetch(`${window.baseURL}/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, email: email })
    });

    if (res.ok) {
        const div = document.getElementById('container');
        // overwrite inner HTML
        const HTML = `
        <p class='stdText'> A password reset link has been sent to ${escapeHtml(email)}
            `
        div.innerHTML = HTML;
        
    } else {
        // show error
        errorMsg.innerText = 'Incorrect username or email';
    }
});
