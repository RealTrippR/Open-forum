function updatePfp(pfpImageFile) {

}

function requestLogout() {
    fetch('/logout',
        {
            method: 'POST',
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error('Failed to logout user');
            }
        })
        .then((json) => {
            window.location.href = '/'; 
        })
        .catch(error => {
            if (error ){
            console.error("Bad logout: ", error);
            }
        });
}

function updateUsername(newUsername) {
    if (newUsername==undefined) {
        console.error("Could not update username, it's invalid!");
        return;
    }
    fetch('/api-update-username',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: newUsername,
        })
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Bad sever response');
        }
    })
    .then((json) => {
    })
    .catch(error => {
    });
}

function updateUserDescription(newDescription) {
    if (newDescription==undefined) {
        console.error("Could not update username, it's invalid!");
        return;
    }
    fetch('/api-update-user-description',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            description: newDescription,
        })
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Bad sever response');
        }
    })
    .then((json) => {
    })
    .catch(error => {
    });
}

function loadUserPage(private, userInfo) {
    if (userInfo == null) {
        console.error("Invalid user page! User info is:", userInfo);
        return;
    }

    userInfoContainer = document.getElementById("userInfoContainer");
    let HTML = userInfoContainer.innerHTML;
    
    
    let pfpImgSrc = "\\icons\\default-pfp.png";

    if (userInfo.profilePicture == null) {
        pfpImgSrc = userInfo.profilePicture;
    }

    
    // profile picture  
    HTML += `<img src="\\icons\\default-pfp.png" id="pfp-img" width="150" height="150" id="profilePic" style="padding: 10px">`

    // username div
    HTML += `
    <div 
    id = 'usernameDiv'
    class='stdText'
    contenteditable="false"
    style="display: inline-block; font-size: 55px; text-align: left; margin: 10px"
    >
    ${userInfo.username}
    </div>
    `
    // edit username button
    HTML += '<button id="edit-username-button" style="background-color: var(--navBarColor)"> <img src="\\icons\\edit-icon.png" width="20" height="20"> </button>'
    HTML += "<HR style='color: var(--mainTextColor)'>" 


    const joinDate = new Date(userInfo.Date);
    // Convert to a more readable format
    const formattedDate = joinDate.toLocaleDateString('en-US', {
        weekday: 'long', // e.g., Monday
        year: 'numeric',
        month: 'long',  // e.g., April
        day: 'numeric'  // e.g., 8
    });
    HTML += `<p class='stdText' style="font-size: 18px; text-align: left; margin: 10px"> Joined ${formattedDate} </p>`
    HTML += "<HR style='color: var(--mainTextColor)'>" 
    
    // user description div
    HTML += `
    <div 
    id = 'user-description-div'
    class='stdText'
    contenteditable="false"
    style="display: inline-block; font-size: 18px; text-align: left; margin: 10px"
    >
    ${userInfo.description}
    </div>
    `

    HTML += '<button id="edit-user-description-button" style="background-color: var(--navBarColor)"> <img src="\\icons\\edit-icon.png" width="20" height="20"> </button>'
    HTML += "<HR style='color: var(--mainTextColor)'>"

    userInfoContainer.innerHTML = HTML;

    // setup button events
    const editUsernameButton = document.getElementById('edit-username-button');
    editUsernameButton.addEventListener('click', () => {
        const usernameDiv = document.getElementById('usernameDiv');
        if (usernameDiv.contentEditable) {
            usernameDiv.contentEditable = true;
            
            // select
            usernameDiv.focus();
               // Move cursor to the end
            const range = document.createRange();
            range.selectNodeContents(usernameDiv);
            range.collapse(false); // false = set cursor to end

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });

    usernameDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // prevent newline
            usernameDiv.contentEditable = false;

            updateUsername(usernameDiv.innerText);
        }
    });

    const editUserDescriptionButton = document.getElementById('edit-user-description-button');
    editUserDescriptionButton.addEventListener('click', () => {
        const userDescriptionDiv = document.getElementById('user-description-div');
        if (userDescriptionDiv.contentEditable) {
            userDescriptionDiv.contentEditable = true;
            
            // select
            userDescriptionDiv.focus();
               // Move cursor to the end
            const range = document.createRange();
            range.selectNodeContents(userDescriptionDiv);
            range.collapse(false); // false = set cursor to end

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });

    const userDescriptionDiv = document.getElementById('user-description-div');
    userDescriptionDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // prevent newline
            userDescriptionDiv.contentEditable = false;

            updateUserDescription(userDescriptionDiv.innerText)
        }
    });




    HTML = userInfoContainer.innerHTML;

    HTML+='<BUTTON id="logout-button" style="margin: 5px; padding: 5px"> Logout </BUTTON>'

    userInfoContainer.innerHTML = HTML;


    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', requestLogout);
}