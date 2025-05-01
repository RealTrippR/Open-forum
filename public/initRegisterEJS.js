
function isValidUsername(username) {
    const valid = /^[a-zA-Z0-9_]+$/.test(username);
    return valid;
}
function isUsernameTaken(username) {
    return (async () => {
    try {
        const res = await fetch(`${window.baseURL}/api-username-taken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        if (res.status == 200) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
    })();
}
window.onload = function() {
    loadNavbar();
    loadCopyright();
};


function validateEmail (email) {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };
  
const MIN_USERNAME_LEN = 3;
const MIN_PASSWORD_LEN = 10;

const usernameInput = document.getElementById('username')
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const usernameErr = document.getElementById('username-error')
const emailErr = document.getElementById('email-error');
const passwordErr = document.getElementById('password-error');


// override default form action
document.getElementById('register-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Stop form submission
    if ((usernameErr.textContent.length == 0 && emailErr.textContent.length == 0 && passwordErr.textContent.length == 0)) {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const res = await fetch(`${window.baseURL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, email: email, password: password })
        });


        if (res.ok) {
            window.location.href = `${window.baseURL}/login`;
        } else {
            // email in use
            if (res.status == 409) {
                emailErr.textContent = 'Email is in use'
            }
            console.error('Register request failed: ',res.ok )
            // Login failed — show error message
            //errorMsg.style.display = 'block';
            //errorMsg.textContent = 'Incorrect Username or Password';
        }
    }
});


usernameInput.addEventListener('input', (event) => {
    if (usernameInput.value.length < MIN_USERNAME_LEN && !usernameInput.value.length == 0) {
        usernameErr.textContent = `Username must be at least ${MIN_USERNAME_LEN} characters long`;
    } else if (isValidUsername(usernameInput.value) == false && usernameInput.value.length > 0) {
        usernameErr.textContent = `Usernames can only contain letters, numbers, and underscores`;
    } else {
        usernameErr.textContent = '';
    }
    if (usernameInput.value.length > 0) {
        isUsernameTaken(usernameInput.value).then(res => {
            if (res == true) {
                usernameErr.textContent = 'Username is taken';
            }
        });
    }
})

emailInput.addEventListener('input', (event) => {
    if (validateEmail(emailInput.value) == null && emailInput.value.length != 0) {
        emailErr.textContent = `Invalid Email`;
    } else {
        emailErr.textContent = ''
    }
})

passwordInput.addEventListener('input', (event) => {
    if (passwordInput.value.length < MIN_PASSWORD_LEN && !passwordInput.value.length == 0) {
        passwordErr.textContent = `Password must be at least ${MIN_PASSWORD_LEN} characters long`;
    } else {
        passwordErr.textContent = '';
    }
})

