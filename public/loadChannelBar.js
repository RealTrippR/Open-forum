// sends get request to server
async function getThreadsFromServer(channelID) {
    const getThreadsURL = '/channel'

    const res = await fetch(
        getThreadsURL,
        {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channelID: channelID
            })
        }
    )
    const channel = await res.json();
    return channel.threads;
}

function setCurrentChannel(channel) {

    let channelBarHandleButtons = document.getElementsByClassName("channelBarHandleButton");
    if (window.currentChannel != null) {
        for (let channelHandle of channelBarHandleButtons) {
            if (window.currentChannel.name == channelHandle.dataset.channelName) {
                channelHandle.style.boxShadow = '';
                channelHandle.style.backgroundColor = 'var(--backgroundColor)'; // Be sure to remove any ;
                break;
            } 
        }
    }

    window.currentChannel = channel;

    for (let channelHandle of channelBarHandleButtons) {
        if (window.currentChannel.name == channelHandle.dataset.channelName) {
            channelHandle.style.boxShadow = 'var(--stdInsetMinorShadow)'; // Be sure to remove any ;
            channelHandle.style.backgroundColor = 'var(--navBarColor)'; // Be sure to remove any ;
            break;
        } 
    }
    {
        // initialize the name bar
        let channelNameHeader = document.getElementById('channelNameHeader');
        channelNameHeader.style.height = `${document.getElementById('channelBarHeader').offsetHeight - 1}px`;
        let HTML = `<p class='stdText' style='font-weight: 600; font-size: 23px; margin: auto 0px; padding-left: 5px; text-align: left; '>${window.currentChannel.name}</p>`;
        HTML += `<p class='stdText' style='margin: auto 0px; font-size: 17px; padding-left: 15px; text-align: left;'> ${channel.description}</p>`
        //HTML += `<button style='float: right; margin-left: auto; padding-right: 15px; font-size: 17px;' type="button" name="createThread"> Create Thread </button>`
        HTML += `<input style='float: right; margin-left: auto; padding-right: 15px; font-size: 17px;' type="text" placeholder="Search Threads"></input>`
        channelNameHeader.innerHTML = HTML;
        
    }

    (async () => {
        window.currentChannel.threads = await getThreadsFromServer(window.currentChannel.id);
        loadThreads(window.currentChannel.threads);
    })();

    const msgChatBox = document.getElementById('chatTypeDiv')
    // hide message chat box
    msgChatBox.style.display = 'none';
}

function setCurrentChannelFromButton() {
    const li = event.currentTarget; // The clicked <li> element
    setCurrentChannel({id: Number(li.dataset.channelId), name: li.dataset.channelName, description: li.dataset.channelDescription});
}

function loadChannelBar() {
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    let channelBar = document.getElementById("channelBar");

    let html = `<ul class="channelBarUL">`;
    html+= "<li class = 'channelBarHeader' id = 'channelBarHeader'><p>CHANNELS</p></li>"
    for (let channel of window.channels) {
        html += `<li class='channelBarHandleButton' data-channel-id=${channel.id} data-channel-name="${channel.name}" data-channel-description="${channel.description}"">
            <p>${channel.name}</p>
        </li>`;
    }
    html += `</ul>`;
    // Update innerHTML once
    channelBar.innerHTML = html;
    
    let channelBarHandleButtons = channelBar.getElementsByClassName("channelBarHandleButton");
    for (let channelHandle of channelBarHandleButtons) {
        channelHandle.toggled = false;
    }

    // bind the load channel functions
    const elements = document.querySelectorAll('.channelBarHandleButton');
    elements.forEach(element => {
        // element.addEventListener('click', function() {
        // Action to perform when clicked
        //  console.log('Element clicked:', element);
        //});
        element.addEventListener('click', reloadThreadsOnClick);
        element.addEventListener('click', setCurrentChannelFromButton);
    });
    
    let channelNameHeader = document.getElementById('channelNameHeader');
    channelNameHeader.style.marginLeft = `${document.getElementById('channelBarHeader').offsetWidth}px`;
    console.log(`${channelNameHeader.style.marginLeft}`);

    async function reloadThreadsOnClick() {
        const li = event.currentTarget;

        const threads = await getThreadsFromServer(li.dataset.channelId)
        //console.log('Response from server:', threads);
        loadThreads(threads);
    }
}