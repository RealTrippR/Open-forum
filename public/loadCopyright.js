/*
loads the copyright notice
that goes on the bottom on the page
*/


function loadCopyright(isIndexPage) {
    const copyrightDiv = document.getElementById("copyright-div");
    let HTML = '';
    if (isIndexPage!=true) { HTML += `<HR style="border: var(--stdBorder);">`;};
    HTML += `<CENTER> <BR>
    <p class='stdText' style='font-size: 14px'> © 2025 Tripp Robins </p> 

    <BR></CENTER>`;
    copyrightDiv.innerHTML = HTML;

    copyrightDiv.style.position = "absolute";
    if (isIndexPage==true) {
        const channelBar = document.getElementById('channelBar');

        copyrightDiv.style.bottom = `20px`;
        copyrightDiv.style.left = "calc(var(--channelBarWidth)/2)";
        copyrightDiv.style.width = "var(--channelBarWidth)";
        copyrightDiv.style.transform = "translateX(-50%)";
    } else {
        copyrightDiv.style.top = "120vh";
        copyrightDiv.style.left = "50%";
        copyrightDiv.style.width = "100%";
        copyrightDiv.style.transform = "translateX(-50%)";
    }
}