function loadNavbar() {
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    document.getElementById("navbar").innerHTML+=
    `
    <BODY>
    <ul class = "navbarUL">
        <li><a href="/">HOME</a></li>
        <li><a href="search.ejs">SEARCH</a></li>
        <li><a href="contacts.html">CONTACT</a></li>
    </ul>
    </BODY>
    `;
}