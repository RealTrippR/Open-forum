function askServerToUpdatePFP(formData) { // formdata must have a 'profilePicture' in it
    if (formData==undefined) {
        console.error("Could not update profile picture, invalid data");
        return;
    }
    fetch(`${window.baseURL}/api-update-pfp`,
    {
        method: 'POST',
        body: formData
    })
    .then((res) => {
        if (!res.ok) {
            console.error('Bad sever response', res);
        }
    })
}

function updateUserEmail(newEmail) {
    fetch(`${window.baseURL}/api-update-user-email`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: newEmail,
        })
    })
    .then((res) => {
        if (!res.ok) {
            console.error('Bad sever response', res);
            if (res.status == 409) { // email taken
                const emailDiv = document.getElementById('emailDiv');
                emailDiv.textContent = 'Email is in use'
                emailDiv.style.color = 'red';
            }
        }
    })
}

function requestLogout() {
    fetch(`${window.baseURL}/logout`,
        {
            method: 'POST',
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error('Failed to logout user');
            }
        })
        .then((json) => {
            window.location.href = `${window.baseURL}/`; 
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
    fetch(`${window.baseURL}/api-update-username`,
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
            console.error('Bad sever response', res);
            if (res.status == 409) { // email taken
                const usernameDiv = document.getElementById('usernameDiv');
                usernameDiv.textContent = 'Username Taken'
                usernameDiv.style.color = 'red';
            }
        }
    })
}

function updateUserDescription(newDescription) {
    if (newDescription==undefined) {
        console.error("Could not update description, it's invalid!");
        return;
    }
    fetch(`${window.baseURL}/api-update-user-description`,
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
    fetch(`${window.baseURL}/api-update-user-country-code`,
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

function validateEmail (email) {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
};

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
    
    
    let pfpImgSrc = `${window.baseURL}\\icons\\default-pfp.png`;

    if (userInfo.hasProfilePicture == true) {
        pfpImgSrc = `${window.baseURL}\\profile-pictures\\${userInfo.username}.jpg`
    }

    if (window.isPrivatePage == true) {
        // invis file uploader
        //HTML += '<input type="file" id="upload-pfp-button" class = "invisInput">';
        const fileInput = document.createElement('input');
        userInfoContainer.appendChild(fileInput);
        fileInput.type = 'file'
        fileInput.id = 'upload-pfp-button';
        fileInput.className = 'invisInput'
    }

    // profile picture  
    
    
    {
        const topInfoDiv = document.createElement('div');
        topInfoDiv.className = 'topInfoDiv';
        userInfoContainer.appendChild(topInfoDiv)

        // div, contains pfp and username div
        {
            //<!-- Profile Picture -->
            const pfp = document.createElement('img');
            topInfoDiv.appendChild(pfp);
            pfp.id = 'pfp-img';
            pfp.width = 200;
            pfp.height = 200;
            pfp.style.flexShrink = '0';

            const usernameDIV = document.createElement('div');
            topInfoDiv.appendChild(usernameDIV)
            usernameDIV.className = `usernameDiv`;
            usernameDIV.id = `usernameDiv`
            usernameDIV.contentEditable = false;
        }


        if (window.isPrivatePage === true) {
            const button = document.createElement('button');
            topInfoDiv.appendChild(button);
            button.className = 'editUsernameButton';
            button.id = 'edit-username-button'

            const img = document.createElement('img');
            button.appendChild(img);
            img.src = `${window.baseURL}/icons/edit-icon.png`
            img.width = '20';
            img.height = '20';
        }

        
        // outer, vertical flex div to hold CC and email vertically

        const vertFlexDiv = document.createElement('div');
        vertFlexDiv.className = 'vertInfoWrapper'
        topInfoDiv.appendChild(vertFlexDiv);

        const ccFlexDiv = document.createElement('div');
        ccFlexDiv.className ='countryCodeWrapper';
        vertFlexDiv.appendChild(ccFlexDiv)
        
        {
            // add the country code image if it exists
            let ccimgSrc = '';

            let hasCCdisplay = 'block';
            if (userInfo.countryCode == null || userInfo.countryCode == undefined) {
                hasCCdisplay = 'none'
            } else {
                ccimgSrc=getCountryCodeImageSource(userInfo.countryCode)
            }

            const ccImg = document.createElement('img');
            ccFlexDiv.appendChild(ccImg);
            ccImg.id = 'countryImg'
            ccImg.width = '40';
            ccImg.style.height = 'auto';
            ccImg.src = ccimgSrc;
            ccImg.style.display = hasCCdisplay;
            ccImg.style.boxShadow = 'var(--stdMinorShadow)';
            ccImg.style.border = 'var(--stdBorder)'
          
            if (window.isPrivatePage == true) {

                // this is a placeholder if a country has not been set yet
                if (userInfo.countryCode == null || userInfo.countryCode == undefined) {
                    const ccP = document.createElement('p');
                    ccFlexDiv.appendChild(ccP)
                    ccP.id = 'country-code-placeholder';
                    ccP.class = 'stdText';
                    ccP.innerHTML = '[Country]';
                }
                // // invis by default
                // HTML+= `
                // <label for="countrySelect" style='display:none'>Select Country:</label>
                // <select id="countrySelect" style='display:none'>
                // `
                
                const selectLabel = document.createElement('label');
                selectLabel.style.display = 'none';
                ccFlexDiv.appendChild(selectLabel);

                const select = document.createElement('select');
                select.style.display = 'none';
                select.id = 'countrySelect'
                ccFlexDiv.appendChild(select);

                const countries = getCountries();
                countries.forEach(country => {
                    const option = document.createElement('option');
                    option.value = country.code;
                    option.innerText = country.name;
                    select.appendChild(option);
                    //HTML += `<option value="${country.code}">${country.name}</option>`;
                });
                  
            }

            if (isPrivatePage) {
                const ccButton = document.createElement('button');
                ccButton.className = 'editCC_button';
                ccButton.id = 'edit-country-code-button'
                ccFlexDiv.appendChild(ccButton);

                const img = document.createElement('img');
                ccButton.appendChild(img);
                img.src = `${window.baseURL}/icons/edit-icon.png`
                img.width = '20';
                img.height = '20';
            }

        }
        {
            if (window.isPrivatePage == true) {
                // email wrapper
                const eFlexDiv = document.createElement('div');
                eFlexDiv.className = `emailWrapper`
                vertFlexDiv.appendChild(eFlexDiv);


                const emailDiv = document.createElement('div');
                eFlexDiv.appendChild(emailDiv);
                emailDiv.id = 'emailDiv';
                emailDiv.className = 'stdText';
                emailDiv.contentEditable = false;
                emailDiv.style.display = 'inline-block';
                emailDiv.style.fontSize = '18px';
                emailDiv.style.textAlign = 'left';
                emailDiv.style.margin = '10px';
                emailDiv.style.marginLeft = '0px';
                emailDiv.style.marginRight = '0px';


                const eButton = document.createElement('button');
                eButton.className = 'editEmailButton';
                eButton.id = 'edit-email-button'
                eFlexDiv.appendChild(eButton);

                const img = document.createElement('img');
                eButton.appendChild(img);
                img.src = `${window.baseURL}/icons/edit-icon.png`
                img.width = '20';
                img.height = '20';
            }
        }
    }

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
    const formattedLastActiveDate = lastActiveDate.toLocaleDateString('en-US', {
        weekday: 'long', // e.g., Monday
        year: 'numeric',
        month: 'long',  // e.g., April
        day: 'numeric'  // e.g., 8
    });

    
    {
        let HR = document.createElement('hr')
        HR.className = `blackHR`;
        userInfoContainer.appendChild(HR);

        // join date
        const jDp = document.createElement('p');
        jDp.className = 'userDateP';
        jDp.innerText = `Joined ${formattedJoinDate}`;
        userInfoContainer.appendChild(jDp);


        // last active date
        const acdp = document.createElement('p');
        acdp.className = 'userDateP';
        acdp.innerText = `| Last Active ${formattedLastActiveDate}`;
        acdp.style.marginLeft = '-8px'
        userInfoContainer.appendChild(acdp);

        HR = document.createElement('hr')
        HR.className = `blackHR`;
        userInfoContainer.appendChild(HR);
    }

    const descHeader = document.createElement('span');
    userInfoContainer.appendChild(descHeader);
    descHeader.className = 'stdText';
    descHeader.style.textAlign = 'left';
    descHeader.style.margin = '5px';
    descHeader.style.fontWeight = '800';
    descHeader.innerText = 'Description';

    if (window.isPrivatePage == true) {

        const editDescButton = document.createElement('button')
        userInfoContainer.appendChild(editDescButton);
        editDescButton.id = `edit-user-description-button`;

        const img = document.createElement('img');
        editDescButton.appendChild(img);
        img.src =`${window.baseURL}/icons/edit-icon.png`;
        img.width = '20';
        img.height = '20';
    }


    userInfoContainer.insertAdjacentHTML("beforeend", "<BR>");

    const userDescriptionDiv = document.createElement('div');
    userDescriptionDiv.className = 'userDescriptionDiv';
    userDescriptionDiv.contentEditable = false;
    userDescriptionDiv.id = `user-description-div`
    userInfoContainer.appendChild(userDescriptionDiv);


    const pfpImage = document.getElementById("pfp-img");
    pfpImage.src = pfpImgSrc;
    
    const usernameDiv = document.getElementById('usernameDiv');
    usernameDiv.textContent = userInfo.username;
    userDescriptionDiv.textContent = userInfo.description;

    if (window.isPrivatePage == false) {  
        // stop hover css for pfp image
        pfpImage.classList.add("no-hover");
    }
    
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
                if (usernameDiv.innerText == viewingUser.username)  {
                    return; // don't send a request if the username wasn't changed
                } else {
                    e.preventDefault(); // prevent newline


                    const MIN_USERNAME_LEN = 3;

                    let invalidUsername=false;
                    if (usernameDiv.textContent.length < MIN_USERNAME_LEN) {
                        invalidUsername=true;
                    } else if (isValidUsername(usernameDiv.textContent) == false) {
                        invalidUsername=true;
                    } 
                    console.log(invalidUsername)
                    if (usernameDiv.textContent.length > 0) {
                        isUsernameTaken(usernameDiv.textContent).then(res => {
                            if (res == true || invalidUsername) {
                                usernameDiv.style.color = 'red';
                                return;
                            } else {
                                usernameDiv.style.color = 'var(--mainTextColor)';
                            }
                        });
                    }
                    if (invalidUsername) {
                        usernameDiv.style.color = 'var(--mainTextColor)';
                        return;
                    }
                }
                usernameDiv.contentEditable = false;

                updateUsername(usernameDiv.innerText);
                viewingUser.username = usernameDiv.innerText;

                if (window.currentChannel) {
                    let state = {channelId: window.currentChannel.id}; if (window.threadID !=undefined) {state.threadID = window.threadID};
                    window.history.pushState(state, '', `${window.baseURL}/users/${ viewingUser.username}`);
                }
            }
        });


        const emailDiv = document.getElementById('emailDiv');
        emailDiv.textContent = userInfo.email;
        const editEmailButton = document.getElementById('edit-email-button');
        editEmailButton.addEventListener('click', async(req) => {
            emailDiv.contentEditable = true;
            // select
            emailDiv.focus();
            // Move cursor to the end
            const range = document.createRange();
            range.selectNodeContents(emailDiv);
            range.collapse(false); // false = set cursor to end

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
        emailDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // prevent newline

                if (emailDiv.textContent == userInfo.email) {
                    return // don't update the email if it didn't change
                }

                if (validateEmail(emailDiv.innerText) == null) {
                    emailDiv.style.color = 'red';
                    return;
                } else {
                    emailDiv.style.color = 'var(--mainTextColor)';
                }
                emailDiv.contentEditable = false;
                console.log(emailDiv.innerText)
                updateUserEmail(emailDiv.innerText)
            }
        });
        const editUserDescriptionButton = document.getElementById('edit-user-description-button');
        editUserDescriptionButton.addEventListener('click', () => {
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
            
            if (file && validType && file.size <= 300000 /*300 KB or less*/) {
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

            ccDropdown.addEventListener('input', (event) => {
               
                ccImage.src = getCountryCodeImageSource(ccDropdown.value);
                updateCountryCode(ccDropdown.value);
                ccImage.style.display = 'block';
                ccDropdown.style.display = 'none'

                ccDropdown.selectedIndex = 0; 
            });
        }
        // this is need because adding directly to innerHTML breaks the DOM
        userInfoContainer.insertAdjacentHTML('beforeend',
            `<HR class='blackHR'>

            <BUTTON id="logout-button"
            class="logoutButton">
            Logout
            </BUTTON>`);


        const logoutButton = document.getElementById('logout-button');
        logoutButton.addEventListener('click', requestLogout);
}
}