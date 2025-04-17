function askServerToUpdatePFP(formData) { // formdata must have a 'profilePicture' in it
    if (formData==undefined) {
        console.error("Could not update profile picture, invalid data");
        return;
    }
    fetch('/api-update-pfp',
    {
        method: 'POST',
        body: formData
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

    if (userInfo.hasProfilePicture == true) {
        pfpImgSrc = `\\profile-pictures\\${userInfo.username}.jpg`
    }

    if (window.isPrivatePage == true) {
        // invis file uploader
        HTML += '<input type="file" id="upload-pfp-button" style="display: none">';
    }

    // profile picture  
    HTML += `<img src="${pfpImgSrc}" id="pfp-img" width="150" height="150" id="profilePic">`
    // username div
    HTML += `
    <div 
    id = 'usernameDiv'
    class='threadHeaderTitle'
    contenteditable="false"
    style="display: inline-block; font-size: 55px; text-align: left; margin: 10px; text-shadow: var(--stdShadow)"
    >
    ${userInfo.username}
    </div>
    `
    // edit username button
    if (window.isPrivatePage == true) {
        HTML += '<button id="edit-username-button" style="background-color: var(--navBarColor)"> <img src="\\icons\\edit-icon.png" width="20" height="20"> </button>'
        HTML += "<HR style='color: var(--mainTextColor)'>" 
    }

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
    

    if (window.isPrivatePage == true) {
        HTML += '<button id="edit-user-description-button" style="background-color: var(--navBarColor)"> <img src="\\icons\\edit-icon.png" width="20" height="20"> </button>'
    }
    HTML += "<HR style='color: var(--mainTextColor)'>"

    userInfoContainer.innerHTML = HTML;

    // setup button events
    if (window.isPrivatePage == true) {
        const editUsernameButton = document.getElementById('edit-username-button');
        console.log('editUsernameButton: ', editUsernameButton);
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
                if (usernameDiv.innerText == window.user.username)  {
                    return; // don't send a request if the username wasn't changed
                }
                e.preventDefault(); // prevent newline
                usernameDiv.contentEditable = false;

                console.error('Currently there is no check or alert if updateUsername fails, be sure to add this')
                updateUsername(usernameDiv.innerText);
                window.user.username = usernameDiv.innerText;

                let state = {channelId: window.currentChannel.id}; if (window.threadID !=undefined) {state.threadID = window.threadID};
                window.history.pushState(state, '', `/users/${ window.user.username}`);
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

        const uploadPFPbutton = document.getElementById('upload-pfp-button');
        uploadPFPbutton.addEventListener('change', () => {
            const file = event.target.files[0];
            
            const validType = file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.png')  || file.name.toLowerCase().endsWith('.jpeg');
            
            if (file && validType && file.size <= 200000 /*200 KB or less*/) {
                const formData = new FormData();
                
                
                // Update the profile picture on the client before sending img to the server
                const pfpImage = document.getElementById('pfp-img');
                pfpImage.src = URL.createObjectURL(file); 

                formData.append('profilePicture', file);  // 'profilePicture' is the key the server will use to retrieve the file
                askServerToUpdatePFP(formData);
            } else {
                alert('Invalid image, must be a PNG or JPEG and less than 200 KB in size.')
            }        
        });


        const pfpImage = document.getElementById('pfp-img');
        pfpImage.addEventListener('click', () => {
            const uploadPFPbutton = document.getElementById('upload-pfp-button');
            uploadPFPbutton.click();
        });





        // this is need because adding directly to innerHTML breaks the DOM
        userInfoContainer.insertAdjacentHTML('beforeend', '<BUTTON id="logout-button" style="margin: 5px; padding: 5px"> Logout </BUTTON>');


        const logoutButton = document.getElementById('logout-button');
        logoutButton.addEventListener('click', requestLogout);
    }
}