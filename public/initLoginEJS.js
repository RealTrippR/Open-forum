window.onload = function() {
    loadNavbar();
    loadCopyright();

    const pws= document.getElementById('password');
    pws.style.marginBottom = '20px'
};

document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Stop form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');


    const res = await fetch(`${window.baseURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });


    if (res.ok) {
        window.location.href = `${window.baseURL}/`;
    } else {
        console.log()
        // Login failed — show error message
        //errorMsg.style.display = 'block';
        errorMsg.textContent = 'Incorrect Username or Password';
    }
});