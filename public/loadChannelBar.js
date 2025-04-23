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

async function setCurrentChannel(channel, loadHTML = true) {

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

    window.setCurrentThreadID(undefined);

    let state = {channelId: window.currentChannel.id};
    
    if (window.threadID !=undefined) {state.threadID = window.threadID};

    window.history.pushState(state, '', `/channels/${channel.id}`);

    window.currentChannel.threads = await getThreadsFromServer(window.currentChannel.id);

    
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
        //HTML += `<input style='float: right; margin-left: auto; padding-right: 15px; font-size: 17px;' type="text" placeholder="Search Threads"></input>`
        channelNameHeader.innerHTML = HTML;
        
    }
    
    if (loadHTML) {

        await loadThreads(window.currentChannel.threads);

        const msgChatBox = document.getElementById('chatTypeDiv')
        // hide message chat box
        msgChatBox.style.display = 'none';


        // make the thread info holder visible
        const channelInfoHolder = document.getElementById('channelInfoBarHolder');
        channelInfoHolder.style.display = 'flex';
    }
}

function setCurrentChannelFromButton() {
    const li = event.currentTarget; // The clicked <li> element
    setCurrentChannel({id: Number(li.dataset.channelId), name: li.dataset.channelName, description: li.dataset.channelDescription});
}

async function loadChannelBar() {

    let mutedChannelIDs = [];
    if (window.user != undefined) {
        mutedChannelIDs = await getMutedChannelsFromServer();
        window.user.mutedChannelIDs = mutedChannelIDs;
        console.log('muted channels: ', mutedChannelIDs)
    }
    // https://www.geeksforgeeks.org/how-to-append-html-code-to-a-div-using-javascript/
    let channelBar = document.getElementById("channelBar");
    channelBar.innerHTML = ``
    let html = `<ul class="channelBarUL" id = 'channelBarUL'>`;
    html+= "<li class = 'channelBarHeader' id = 'channelBarHeader'><p>CHANNELS</p></li>"
    html += `</ul>`;
    //////////////////////////////
    // Update innerHTML once
    channelBar.innerHTML = html;
    //////////////////////////////


    //////////////////////////////
    // insert the channel headers
    const channelBarUL = document.getElementById('channelBarUL');
    for (let channel of window.channels) {

         const li = document.createElement('li');

        li.className = 'channelBarHandleButton'
        li.style.display = 'flex';
        li.style.alignItems = 'center'; // vertically align
        li.dataset.channelId=channel.id;
        li.dataset.channelName=channel.name;
        li.dataset.channelDescription=channel.description;
        
        const p = document.createElement('p');
        p.style.flexGrow = '1'; // Let the text take available space and push the icon to the right
        p.innerText = channel.name;

        li.appendChild(p);

        {
            const notisEnabledImg = document.createElement('img');
            notisEnabledImg.src = '/icons/notis.png';
            notisEnabledImg.width = '20';
            notisEnabledImg.height = '20';
            notisEnabledImg.style.border = 'var(--stdBorder)';
            notisEnabledImg.style.boxShadow = 'var(--stdMinorShadow)';
            notisEnabledImg.style.margin = '5px'
            notisEnabledImg.style.marginRight = '5px';
            notisEnabledImg.style.cursor = 'pointer';

            if (mutedChannelIDs.includes(channel.id)) {
                // disable notifications
                notisEnabledImg.src = '/icons/notisDisabled.png'
                notisEnabledImg.style.boxShadow = 'var(--stdInsetMinorShadow),var(--stdMinorShadow)'
                notisEnabledImg.style.objectPosition = '1px 1px'; // shift image content
            }
            li.appendChild(notisEnabledImg);
            // notice click listener
            notisEnabledImg.dataset.channelID = channel.id;
            notisEnabledImg.addEventListener('click', (event)=>{
                const trg = event.target;
                event.stopPropagation();
                if (trg.src.includes('/icons/notis.png')) {
                    // disable notifications
                    trg.src = '/icons/notisDisabled.png'
                    trg.style.boxShadow = 'var(--stdInsetMinorShadow),var(--stdMinorShadow)'
                    trg.style.objectPosition = '1px 1px'; // shift image content
                    updateMutedChannel(channel.id, true);
                    return;
                } else {
                    // enable notifications
                    trg.src = '/icons/notis.png'
                    trg.style.boxShadow = 'var(--stdMinorShadow)'
                    trg.style.objectPosition = '0px'; // shift image content
                    updateMutedChannel(channel.id, false);
                    return;
                }
            }); 
            

            if (window.user != undefined) {

                const unreadPingCountForThisChannel = (window.user.unreadPings.filter((ping) => (ping.channelID == channel.id))).length;

                const notisCountDiv = document.createElement('div');
                notisCountDiv.className = 'notisIconDiv';
                notisCountDiv.style.width = '20px';
                notisCountDiv.style.height = '20px';
                notisCountDiv.style.right = '50px'
                notisCountDiv.style.marginRight = '5px';
                if (unreadPingCountForThisChannel==0) {
                    notisCountDiv.style.display = 'none' // invisible
                }

                const notisCountP = document.createElement('p');
                notisCountP.className = 'stdText';
                notisCountP.textContent = `${unreadPingCountForThisChannel}`;
                notisCountP.style.margin = 'auto';
                notisCountP.style.color = 'var(--mainTextColor)'
                notisCountP.style.fontSize = '15px'

                notisCountDiv.appendChild(notisCountP);
                li.appendChild(notisCountDiv);
                
            }
        }

        channelBarUL.appendChild(li);
    }

    
    //////////////////////////////
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

    
    let channelInfoBarHolder = document.createElement('div');
    channelInfoBarHolder.channelName = 'channelInfoBarHolder';
    document.body.appendChild(channelInfoBarHolder);

    
    async function reloadThreadsOnClick() {
        const li = event.currentTarget;

        const threads = await getThreadsFromServer(li.dataset.channelId)
        //console.log('Response from server:', threads);
        //loadThreads(threads); // causes duplication error for some reason
    }
}