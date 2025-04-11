function loadNavbar() {
    let HTML =  document.getElementById("navbar").innerHTML;
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    HTML +=
    `
    <BODY>
    <ul class = "navbarUL">
        <li><a href="/">HOME</a></li>
        <li><a href="search.ejs">SEARCH</a></li>
        <li><a href="contacts.html">CONTACT</a></li>
    `
    if (window.user) {
        console.log("load",window.user);
        console.log("load",window.user.username);
        HTML +=`<li><a href="/users/${window.user.username}">PROFILE</a></li>`
        if (!window.user.username) {
            console.error("window.user.username is invalid: ", window.user.username);
        } 
    } else {
        HTML +=`<li><a href="Login">LOGIN</a></li>`
    }
    HTML +=
    `
    </ul>
    </BODY>
    `;
    
    document.getElementById("navbar").innerHTML = HTML;
}