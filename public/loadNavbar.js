function loadNavbar() {
    let HTML =  document.getElementById("navbar").innerHTML;
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    HTML = `
    <BODY>
    <ul class="navbarUL" style="display: flex; justify-content: space-between; align-items: center; list-style: none; padding: 0; margin: 0;">
        <li style="display: flex;">
            <a href="/">OPEN-FORUM</a>
        </li>
    `;

    
if (window.user && window.loggedIn) {
    let pfpImgSrc = "\\icons\\default-pfp.png";
    if (window.user.hasProfilePicture) {
        pfpImgSrc = `\\profile-pictures\\${window.user.username}.jpg`;
    }

    if (!window.user.username) {
        console.error("window.user.username is invalid: ", window.user.username);
    }

    HTML += `
    
        <li style="margin-left: auto; display: flex; gap: 15px;">
            <a href="/notifications" style="display: flex; align-items: center; padding-left: 5px; padding-right: 1px;">
                NOTIFICATIONS
            </a>
        </li>

        <li style="margin-left: auto; display: flex; gap: 10px; padding: 3px;">
            <a href="/users/${window.user.username}" id="profile-access-button" style="display: flex; align-items: center; cursor: pointer; text-decoration: none;">
                <span style='margin-left: 10px; margin-right: 10px;'>PROFILE</span>
                <img src="${pfpImgSrc}" width="38" height="38" style="margin-right: 4px;">
            </a>
        </li>
    `;
} else {
    HTML += `
        <li style="margin-left: auto;"><a href="/login">LOGIN</a></li>
    `;
}

HTML += `
    </ul>
</BODY>
`;

    
    document.getElementById("navbar").innerHTML = HTML;



    const profileAccessButton = document.getElementById('profile-access-button');
        if (profileAccessButton) {
        const profileAccessLink = profileAccessButton.getElementsByTagName('a')[0];
        profileAccessButton.addEventListener('click', (event)=>{
            profileAccessLink.click();
        })
    }
}