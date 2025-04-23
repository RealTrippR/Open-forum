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
        console.error("Could not update description, it's invalid!");
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
}

function updateCountryCode(CC) {
    if (CC==undefined) {
        console.error("Could not update country code, it's invalid!");
        return;
    }
    fetch('/api-update-user-country-code',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            countryCode: CC,
        })
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Bad sever response');
        }
    })
}


function loadUserPage(userInfo) {
    if (userInfo == null) {
        console.error("Invalid user page! User info is:", userInfo);
        return;
    }

    if (userInfo.description == undefined || userInfo.description.length == undefined ||  userInfo.description.length == 0) {
        userInfo.description = ' ';
    }
    userInfoContainer = document.getElementById("userInfoContainer");
    userInfoContainer.style.marginLeft = '200px';
    userInfoContainer.style.marginRight = '200px';
    userInfoContainer.style.minWidth = '500px';
    userInfoContainer.style.border = 'var(--stdBorder)'
    userInfoContainer.style.borderWidth  = '3px'
    userInfoContainer.style.position = 'relative'
    userInfoContainer.style.borderTop = '0px'
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
    
    
    // username div
    {
        HTML += `
        <div style="display: flex; align-items: flex-start; gap: 10px; position: relative;">
        
            <!-- Profile Picture -->
            <!-- leave src blank to prevent html injection -->
            <img id="pfp-img" width="200" height="200" style="flex-shrink: 0;">

            <!-- Username Div -->
            <div 
                id="usernameDiv"
                class="threadHeaderTitle"
                contenteditable="false"
                style="font-size: 55px; text-align: left; text-shadow: var(--stdShadow);"
            >
            </div>

        `;

        if (window.isPrivatePage === true) {
            HTML += `
            <button id="edit-username-button" style="
                background-color: var(--navBarColor);
                cursor: pointer;
                border: var(--stdBorder);
                box-shadow: var(--stdMinorShadow);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 5px;
                width: 30px;
                height: 30px;
                margin-top: 21px
            ">
                <img src="\\icons\\edit-icon.png" width="20" height="20">
            </button>
            `;
        }

        {
            // wrap inside a flex div
            HTML += `
            <div style="
            position: absolute;
            top: 70px;
            left: 240px;
            display: flex;
            align-items: center;
            gap: 10px;">
            `;
            //userInfo.countryCode = 'us'
            // add the country code image if it exists
            let ccimgSrc = '';

            let hasCCdisplay = 'block';
            if (userInfo.countryCode == null || userInfo.countryCode == undefined) {
                hasCCdisplay = 'none'
            } else {
                ccimgSrc='src = ' + getCountryCodeImageSource(userInfo.countryCode)
            }

            // Country Code image
            HTML += `<img id= 'countryImg' width = 40 height: auto ${ccimgSrc}
             style="
             display: ${hasCCdisplay};
             border: var(--stdBorder);
             box-shadow: var(--stdMinorShadow);
             ">` 

            if (window.isPrivatePage == true) {
                // this is a placeholder if a country has not been set yet
                if (userInfo.countryCode == null || userInfo.countryCode == undefined) {
                    HTML+=`<p class='stdText' id='country-code-placeholder'> [Country] </p> `
                }
                // invis by default
                HTML+= `
                <label for="countrySelect" style='display:none'>Select Country:</label>
                <select id="countrySelect" style='display:none'>
                `
                const countries = getCountries();
                countries.forEach(country => {
                    HTML += `<option value="${country.code}">${country.name}</option>`;
                });
                  
                HTML += `</select>`;
            }

            if (isPrivatePage) {
                // CC dropdown, invis by default

                // CC edit button
                HTML +=
                `<button id="edit-country-code-button"
                    style="
                    background-color: var(--navBarColor);
                    cursor: pointer;
                    border: var(--stdBorder);
                    box-shadow: var(--stdMinorShadow);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 5px;
                    width: 30px;
                    height: 30px;"> 
                    <img src="\\icons\\edit-icon.png" width="20" height="20"> 
                </button>`;
            }
            HTML += `</div>`
        }

        HTML += `</div>`; // close flex div
    }

    HTML += `<hr style="border: var(--stdBorder);">`;

    const joinDate = new Date(userInfo.Date);
    // Convert to a more readable format
    const formattedJoinDate = joinDate.toLocaleDateString('en-US', {
        weekday: 'long', // e.g., Monday
        year: 'numeric',
        month: 'long',  // e.g., April
        day: 'numeric'  // e.g., 8
    });
    
    const lastActiveDate = new Date(userInfo.lastActive);
    // Convert to a more readable format
    const formattedLastaCtiveDate = joinDate.toLocaleDateString('en-US', {
        weekday: 'long', // e.g., Monday
        year: 'numeric',
        month: 'long',  // e.g., April
        day: 'numeric'  // e.g., 8
    });
    // register date,  last active date
    HTML += `<p class='stdText' style=" display: inline; font-size: 18px; text-align: left; margin: 10px"> Joined ${formattedJoinDate} </p>`
    HTML += `<p class='stdText' style=" display: inline; font-size: 18px; text-align: left; margin: 10px; margin-left: -8px;"> \| Last Active ${formattedLastaCtiveDate} </p>`

    HTML += "<HR style='border: var(--stdBorder);'>" 

    // user description header
    HTML += `<span class = 'stdText' style='text-align: left; margin: 5px; font-weight: 800;'> Description </span>`;
    
    if (window.isPrivatePage == true) {
        HTML +=
         `<button id="edit-user-description-button" 
            style="
            background-color: var(--navBarColor);
            cursor: pointer;
            border: var(--stdBorder);
            box-shadow: var(--stdMinorShadow);
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            margin: 5px;
            "> 
            <img src="\\icons\\edit-icon.png" width="20" height="20"> 
        </button>`;
    }

    // user description div
    HTML += `
    <BR> <div 
    id = 'user-description-div'
    class='stdText'
    contenteditable="false"
    style="display: inline-block; font-size: 18px; text-align: left; margin: 10px"
    >
    </div>
    `
    
    userInfoContainer.innerHTML = HTML;




    const pfpImage = document.getElementById("pfp-img");
    pfpImage.src = pfpImgSrc;
    const usernameDiv = document.getElementById('usernameDiv');
    usernameDiv.textContent = userInfo.username;
    const userDescriptionDiv = document.getElementById('user-description-div');
    userDescriptionDiv.textContent = userInfo.description;
;
    // setup button events
    if (window.isPrivatePage == true) {
        const editUsernameButton = document.getElementById('edit-username-button');
        editUsernameButton.addEventListener('click', () => {
            if (usernameDiv.contentEditable) {
                usernameDiv.contentEditable = true;
                
                // select textbox when the edit button is clicked
                usernameDiv.focus();

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
                alert('Invalid image, must be a PNG or JPEG and less than 300 KB in size.')
            }        
        });


        pfpImage.addEventListener('click', () => {
            const uploadPFPbutton = document.getElementById('upload-pfp-button');
            uploadPFPbutton.click();
        });



        // country code edit system
        {
            const ccDropdown = document.getElementById('countrySelect');
            const ccImage = document.getElementById('countryImg')
            const editCCbutton = document.getElementById('edit-country-code-button');
            editCCbutton.addEventListener('click', (event) => {
                const ccPlaceholderText = document.getElementById('country-code-placeholder');
                ccImage.style.display = 'none';

                if (ccPlaceholderText) {
                    ccPlaceholderText.style.display = 'none';
                }
                ccDropdown.style.display = 'block'
            });

            ccDropdown.addEventListener('change', (event) => {
               
                console.log( ccDropdown.value)
                ccImage.src = getCountryCodeImageSource(ccDropdown.value);
                updateCountryCode(ccDropdown.value);
                ccImage.style.display = 'block';
                ccDropdown.style.display = 'none'
            });
        }
        // this is need because adding directly to innerHTML breaks the DOM
        userInfoContainer.insertAdjacentHTML('beforeend',
            `<HR style='border: var(--stdBorder);'>

            <BUTTON id="logout-button"
            style="margin: 5px; padding: 5px; border: var(--stdBorder); box-shadow: var(--stdMinorShadow); background-color: var(--navBarColor);
            color: var(--mainTextColor);
            text-shadow: var(--stdMinorShadow);
            text-decoration: none;
            font-family: var(--stdMinorFontFamily);
            font-weight: 400;
            margin: 7px;
            margin-bottom: 15px;">
            Logout
            </BUTTON>`);


        const logoutButton = document.getElementById('logout-button');
        logoutButton.addEventListener('click', requestLogout);
}
}