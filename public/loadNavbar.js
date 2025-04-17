function loadNavbar() {
    let HTML =  document.getElementById("navbar").innerHTML;
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    HTML +=
    `
    <BODY>
    <ul class = "navbarUL">
        <li><a href="/">OPEN-FORUM</a></li>
    `
    if (window.user && window.loggedIn) {
        let pfpImgSrc = "\\icons\\default-pfp.png";

        if (window.user.hasProfilePicture == true) {
            pfpImgSrc = `\\profile-pictures\\${window.user.username}.jpg`
        }

        console.log("load",window.user);
        console.log("load",window.user.username);
        HTML +=`<li id='profile-access-button' style="position: absolute; right: 0px; display: flex; padding-bottom: 1px"><a href="/users/${window.user.username}">PROFILE</a><img src=${pfpImgSrc} width=38 height=38 style="margin-top: -7px; margin-left: 10px; padding: 0px;"></li>`
        if (!window.user.username) {
            console.error("window.user.username is invalid: ", window.user.username);
        }
    } else {
        HTML +=`<li><a href="/login">LOGIN</a></li>`
    }
    HTML +=
    `
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