/*
function loadNavbar() {
    let HTML =  document.getElementById("navbar").innerHTML;
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    HTML = `
    <BODY>
    <ul class="navbarUL" style="display: flex; justify-content: space-between; align-items: center; list-style: none; padding: 0; margin: 0;">
        <li style="display: flex;">
            <a href="${window.baseURL}/">OPEN-FORUM</a>
        </li>
    `;
    HTML+=    
    `
    <li style="margin-left: auto; display: flex; gap: 15px;">
        <a href="https://zeus.vwu.edu/~rbrobins/" style="display: flex; align-items: center; padding-left: 5px; padding-right: 1px;">
            HOMEPAGE
        </a>
    </li>
    `
    
if (window.user && window.loggedIn) {
    let pfpImgSrc = "\\icons\\default-pfp.png";
    if (window.user.hasProfilePicture) {
        pfpImgSrc = `\\profile-pictures\\${window.user.username}.jpg`;
    }

    if (!window.user.username) {
        console.error("window.user.username is invalid: ", window.user.username);
    }

    HTML += `
        <li style="margin-left: auto; display: flex; gap: 10px; padding: 3px;">
            <a href="${window.baseURL}/users/${window.user.username}" id="profile-access-button" style="display: flex; align-items: center; cursor: pointer; text-decoration: none;">
                <span style='margin-left: 10px; margin-right: 10px;'>PROFILE</span>
                <img src="${window.baseURL}/${pfpImgSrc}" width="38" height="38" style="margin-right: 4px;">
            </a>
        </li>
    `;
} else {
    HTML += `
        <li style="margin-left: auto;"><a href="${window.baseURL}/login">LOGIN</a></li>
    `;
}

HTML += `
    </ul>
</BODY>
`;
*/
function loadNavbar() {

    const navbar = document.getElementById("navbar")
    const navbarUL = document.createElement('ul')
    navbar.appendChild(navbarUL)
    navbarUL.className = 'navbarUL'
    navbarUL.style.display = 'flex'
    navbarUL.style.justifyContent = 'space-between'
    navbarUL.style.alignItems = 'center'
    navbarUL.style.listStyle = 'none'
    navbarUL.style.padding = '0'
    navbarUL.style.margin = '0'
    
    { // Open Forum LI
    
        const li = document.createElement('li');
        li.style.display = 'flex';
        navbarUL.appendChild(li);

        const a = document.createElement('a');

        a.href = `${window.baseURL}/`;
        a.innerText = 'OPEN-FORUM'
        
        li.appendChild(a);
    }
    { // Homepage LI
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.marginLeft = 'auto';

        li.style.position = 'absolute';
        li.style.transform = `translateX(-50%)`
        li.style.left = `50%`
        li.style.top = '0'

        navbarUL.appendChild(li);

        const a = document.createElement('a');
        a.href = `https://zeus.vwu.edu/~rbrobins/`;
        a.innerText = 'HOMEPAGE';
        
        // li.style.display = 'flex';
        // li.style.justifyContent = 'center';
        
        li.appendChild(a);
    }
    {
        // profile / login li
        if (window.user && window.loggedIn) {
            let pfpImgSrc = `${window.baseURL}/icons/default-pfp.png`;
            if (window.user.hasProfilePicture) {
                pfpImgSrc = `${window.baseURL}/profile-pictures/${window.user.username}.jpg`;
            }
        
            if (!window.user.username) {
                console.error("window.user.username is invalid: ", window.user.username);
            }
        
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.marginLeft = 'auto';
            li.style.padding = '3px';
            li.style.gap = '10px';


            const a = document.createElement('a');
            a.href =`${window.baseURL}/users/${window.user.username}`;
            a.id = `profile-access-button`;
            a.style.display = 'flex';
            a.style.alignItems = 'center';
            a.style.cursor = `pointer`;
            a.style.textDecoration = 'none'

            li.appendChild(a);
            {
                const span = document.createElement('span');
                a.appendChild(span);
                span.innerText = 'PROFILE';
                span.style.marginLeft = '10px';
                span.style.marginRight = '10px';
                
                const img = document.createElement('img');
                a.appendChild(img);
                img.width = 38;
                img.height = 38;
                img.style.marginRight = '4px';
                img.src = pfpImgSrc;
            }
            
            navbarUL.appendChild(li);
        } else {
            const li = document.createElement('li');
            navbarUL.appendChild(li);
            li.style.marginLeft = 'auto';
            li.style.display = 'flex';

            const a = document.createElement('a');
            a.href = `${window.baseURL}/login`;
            a.innerText = 'LOGIN'
            li.appendChild(a);
        }
        
    }
    

    const profileAccessButton = document.getElementById('profile-access-button');
        if (profileAccessButton) {
        const profileAccessLink = profileAccessButton.getElementsByTagName('a')[0];
        profileAccessButton.addEventListener('click', (event)=>{
            profileAccessLink.click();
        })
    }
}