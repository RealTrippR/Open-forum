const MIN_PASSWORD_LEN = 10;

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

const submitButton = document.getElementById('reset-button');
submitButton.addEventListener('click', async(e) => {
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    const errorMsgElem = document.getElementById('error-msg');
    if (password == passwordConfirm) {
        if (password.length < MIN_PASSWORD_LEN) {
            errorMsgElem.innerText = `Password must be at least ${MIN_PASSWORD_LEN} characters long`;
        } else {
            errorMsgElem.innerText = ''
            // Get token and username from URL
            const params = new URLSearchParams(window.location.search);
            username = params.get('username');
            token = params.get('token');
            const res = await fetch(`${window.baseURL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password, token: token, username: username})
            });
            if (res.ok) {
                window.location.href = `${window.baseURL}/login`;
            } else {
                errorMsgElem.innerText = `Error: Failed to reset password: Error ${res.status}`
            }
        }
    } else {
        errorMsgElem.innerText = 'Passwords must match'
    }
});