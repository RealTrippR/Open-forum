function loadChannelBar() {
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    let channelBar = document.getElementById("channelBar");

    let html = `<ul class="channelBarUL">`;
    html+= "<li class = 'channelBarHeader'><p>CHANNELS</p></li>"
    for (let channel of window.channels) {
        html += `<li class='channelBarHandleButton' data-channel-id="${channel.id}" data-channel-name="${channel.name}">
            <p>${channel.name}</p>
        </li>`;
    }

    html += `</ul>`;

    // Update innerHTML once
    channelBar.innerHTML = html;


    // bind the load channel functions
    const elements = document.querySelectorAll('.channelBarHandleButton');
    elements.forEach(element => {
        // element.addEventListener('click', function() {
        // Action to perform when clicked
        //  console.log('Element clicked:', element);
        //});
        element.addEventListener('click', getInfo);
        
    });
    
    const getThreadsURL = '/channel'
    // sends get request to server
    async function getInfo() {
        const li = event.currentTarget; // The clicked <li> element

        const res = await fetch(
            getThreadsURL,
            {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channelID: li.dataset.channelId
                })
            }
        )
        const data = await res.json();
        console.log('Response from server:', data);  // This will show the response from the backend
    }
}