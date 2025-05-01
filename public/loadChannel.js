//import threads from '/loadThreads.js';

function setPinnedThreadOfChannel(threadID, askServerToUpdate = false) {
    
    const threadHolder = document.getElementById('channelThreadsHolder');

    for (const child of Array.from(threadHolder.children)) {
        if (child.className == 'threadHeaderHolder') {
            const pinnedIcon = child.querySelector('img[data-type="pin"]');
            if (pinnedIcon) {
                pinnedIcon.style.display = 'none';
            }
        }
    }

    if (threadID != null) {
        for (const child of Array.from(threadHolder.children)) {

            if (child.className == 'threadHeaderHolder' && child.dataset.threadID == threadID ) {
                threadHolder.prepend(child);
                const pinnedIcon = child.querySelector('img[data-type="pin"]');
                pinnedIcon.style.display = 'block';
                break;
            }
        }
    } else {
        const sorted = Array.from(threadHolder.children)
        .filter(child => child.className === 'threadHeaderHolder')
        .sort((a, b) => {
            const idA = parseInt(a.dataset.threadID);
            const idB = parseInt(b.dataset.threadID);
            return idA - idB;
        });

        for (const el of sorted) {
            threadHolder.appendChild(el);
        }
    }

    window.currentChannel.pinnedThreadId = threadID;

    if (askServerToUpdate) {
        fetch(`${window.baseURL}/set-pinned-thread-of-channel`, 
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channelID: window.currentChannel.id,
                threadID: threadID
            })
        });
    }
}

function getRelativeTimeStr(dateString) {
    
    let now = new Date();
    now = new Date(now.toISOString())

    const messageTime = new Date(dateString);
    const secondsAgo = Math.floor((now - messageTime) / 1000);
    
    if (secondsAgo < 60) {
      return `Now`;
    } else if (secondsAgo < 3600) {
      const minutesAgo = Math.floor(secondsAgo / 60);
      if (minutesAgo <= 1) { 
        return `${minutesAgo} minute ago`;
      } else {
        return `${minutesAgo} minutes ago`;
      }
    } else if (secondsAgo < 86400) {
      const hoursAgo = Math.floor(secondsAgo / 3600);
      if (hoursAgo <= 1) { 
        return `${hoursAgo} hour ago`;
      } else {
        return `${hoursAgo} hours ago`;
      }
    } else {
      const daysAgo = Math.floor(secondsAgo / 86400);
      if (daysAgo <= 1) { 
        return `${daysAgo} day ago`;
      } else {
        return `${daysAgo} days ago`;
      }
    }
  }

function askServerToCreateThread(threadName, threadDescription) {
    fetch(`${window.baseURL}/api-create-thread`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: threadName,
            description: threadDescription,
            channelID: window.currentChannel.id
        })
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Bad sever response: ', res);
        }
        return res.json();
    })
    .then((json) => {
        window.currentChannel.threads = json.threads;
        loadThreads(window.currentChannel.threads);
    })
    .catch(error => {
        console.error('Fetch error:', error);
    });
}

async function askServerToDeleteThread(channelID, threadID) {
    channelID = Number(channelID);
    thread = Number(threadID);
    if (channelID == undefined) {throw new Error('channelID is required as an argument!');}
    if (threadID == undefined) {throw new Error('threadID is required as an argument!');}

    try {
        fetch(`${window.baseURL}/api-delete-thread`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channelID: channelID,
                    threadID: threadID
                })
            })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Bad sever response: ', res);
                }
            })
    } catch (err) {
        console.error("Error requesting thread deletion: ", err);
        return false;
    }
}

async function getMessageCountOfThread(threadID) {
    if (threadID === undefined) {
        console.error('getMessageCountOfThread: ThreadID is required as an argument!');
        return -1;
    }

    try {
        const res = await fetch(`${window.baseURL}/api-get-thread-message-count`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channelID: window.currentChannel.id,
                threadID: threadID
            })
        });

        if (!res.ok) {
            throw new Error(`Bad server response: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        // Return the message count from the response
        return json.count;
    } catch (error) {
        console.error('Fetch error:', error);
        return -1; // Default to -1 on error
    }
}

function handleTHHrightClick(e) {
    e.preventDefault();
    const trcb = document.getElementById('thread-right-click-box');
    
    if (trcb.style.display == 'none') {
        trcb.style.display = 'block';
    } else {
        trcb.style.display = 'none'
        return;
    }
    
    trcb.associatedMessageElement = event.target;
    trcb.dataset.threadID = event.target.dataset.threadID;

    // Position the right-click menu at the mouse coordinates
    trcb.style.left = `${event.pageX}px`;
    trcb.style.top = `${event.pageY}px`;
    trcb.style.width = `100px`;
    trcb.style.height = `auto`;
    trcb.style.padding = '0px';
    
    const deleteButton = document.getElementById('trcb-delete');
    // delete button
    if ((window.user && window.user.username == event.target.dataset.ownerName) || (window.user &&  window.user.isAdmin)) {
        deleteButton.style.display = 'block';
    } else {
        deleteButton.style.display = 'none';
    }

    // pin icon
    if ((window.user && window.user.isAdmin == 1)) {
        const pinButton = document.getElementById('trcb-pin');
        pinButton.style.display = 'block';

        if (window.currentChannel.pinnedThreadId == event.target.dataset.threadID) {
            pinButton.children[0].innerText = 'Unpin'
        } else {
            pinButton.children[0].innerText = 'Pin'
        }
    }
}

function createThreadRightClickBox() {
    const CTH = document.getElementById('channelThreadsHolder');

    const trcb = document.createElement('div');
    CTH.appendChild(trcb);
    trcb.className = 'message-right-click-box'
    trcb.style.position = 'fixed';
    trcb.id = 'thread-right-click-box';
    trcb.style.display = 'none';

    
    const copyLink = document.createElement('div');
    copyLink.id = 'trcb-copy';
    copyLink.innerHTML = '<p> Copy Link </p>'
    trcb.appendChild(copyLink);

    copyLink.addEventListener('click', () => {
        if (trcb.dataset.threadID == undefined) {return};

        const tURL = `${window.baseURL}/channels/${window.currentChannel.id}/${trcb.dataset.threadID}/`;
        // copy URL to OS clipboard
        navigator.clipboard.writeText(tURL);
        
        trcb.style.display = 'none';
    });
    
    // all below this line are hidden by default //
    /********************************************/
    const deleteButton = document.createElement('div');
    deleteButton.id = 'trcb-delete';
    deleteButton.innerHTML = '<p> Delete </p>'
    deleteButton.style.display = 'none';
    trcb.appendChild(deleteButton);

    deleteButton.addEventListener('click', (e) => {
        const threadsHolder = document.getElementById("channelThreadsHolder");

        if (trcb.dataset.threadID == undefined) {return};
        const channel_id = window.currentChannel.id;
        const thread_id = trcb.dataset.threadID;
        askServerToDeleteThread(channel_id, thread_id);
        window.threads = window.threads.filter(item => (thread_id == item.threadID));
        
        for (let thh of threadsHolder.children) {
            if (thh.dataset.threadID == thread_id && thh.className != 'message-right-click-box') {
                thh.remove();
            }
        }
        
        trcb.style.display = 'none';
    })
    const pinButton = document.createElement('div');
    pinButton.id = 'trcb-pin';
    pinButton.innerHTML = '<p> Pin </p>'
    pinButton.style.display = 'none';
    //setPinnedThreadOfChannel
    pinButton.addEventListener('click', (e) => {
        const thread_id = trcb.dataset.threadID;
        if (thread_id == window.currentChannel.pinnedThreadId) {
            setPinnedThreadOfChannel(null, true)
        } else {
            setPinnedThreadOfChannel(thread_id, true)
        }
        trcb.style.display = 'none';
    });
    trcb.appendChild(pinButton);



    // DOM is really weird, but this hides the thread right click when box anything else is pressed
    document.addEventListener('click', (event) => {
        const trcb = document.getElementById('thread-right-click-box');
        trcb.style.display = 'none'
    });

}


function createStagingThreadAndThreadInfoHolder() {   
     
    const channelInfoHolder = document.getElementById("channelInfoBarHolder");
    channelInfoHolder.innerHTML = '';
    //channelInfoHolder.style.width = 'calc(100% - var(--channelBarWidth) - 270px)'

    createThreadRightClickBox();

    if (window.loggedIn) {
        // create staging thread if it does not exist
        let stagingThreadDropdownButtonDIV = document.getElementById('stagingThreadDropdownButton');
        if (stagingThreadDropdownButtonDIV == null) {
            stagingThreadDropdownButtonDIV = document.createElement('div');
            const div = stagingThreadDropdownButtonDIV;

            div.id = 'stagingThreadDropdownButton';
            div.style.backgroundColor = 'var(--backgroundColor)'
            div.style.height = '26px';
            div.style.border = 'var(--stdBorder)'
            div.style.display = 'flex'
            div.style.minWidth = '200px'
            div.style.width = '200px';
            
            const p = document.createElement('p');
            p.className = 'stdText';
            p.textContent = 'Create Thread'
            p.style.margin = '0px auto'
            p.style.fontSize = '20px'

            div.appendChild(p);

            div.addEventListener('click', () => {
                const stagingThreadDiv = document.getElementById('stagingThread');
                if (stagingThreadDiv.style.display === 'none') {
                    stagingThreadDiv.style.display = 'block'; // Show
                } else {
                    stagingThreadDiv.style.display = 'none'; // Hide
                }
                console.log('click');
            });

            channelInfoHolder.appendChild(div);
        }

        // create staging thread
        const stagingThread = document.createElement('div');
        stagingThread.id = 'stagingThread'
        stagingThread.className = 'stagingThread'
        stagingThread.style.padding = '10px'
        stagingThread.style.border = 'var(--stdBorder)'
        stagingThread.style.display = 'none';
        stagingThread.style.backgroundColor = 'var(--backgroundColor)'
        stagingThread.style.position = 'absolute';
        stagingThread.style.top = '28px'; 
        stagingThread.style.left = '0px'; 
        stagingThread.style.zIndex = '10000';
        stagingThread.style.boxShadow = 'var(--stdShadow)';

        const nameInput = document.createElement("input");
        nameInput.id = 'nameInput';
        nameInput.className = "threadHeaderTitle";
        nameInput.type = 'text';
        nameInput.textContent = "";
        nameInput.placeholder = "Enter Thread Name";
        nameInput.style.fontSize = '25px';

        nameInput.style.backgroundColor = 'var(--navBarColor)';
        stagingThread.appendChild(nameInput);

        let hr = document.createElement('hr');
        stagingThread.append(hr);

        const descriptionInput = document.createElement("input");
        descriptionInput.id = 'descriptionInput';
        descriptionInput.className = "stdText";
        descriptionInput.type = 'text';
        descriptionInput.style.textAlign = 'left';
        descriptionInput.textContent = "";
        descriptionInput.placeholder = "Enter Description";
        descriptionInput.style.backgroundColor = 'var(--navBarColor)';
        descriptionInput.style.fontSize = '17px';
        
        stagingThread.appendChild(descriptionInput);

        hr = document.createElement('hr');
        stagingThread.append(hr);        

        const postButton = document.createElement('button');
        postButton.textContent = 'Create Thread';
        postButton.style.backgroundColor = 'var(--backgroundColor)'
        postButton.style.color = 'var(--mainTextColor)'   
        postButton.style.fontFamily = 'var(--stdMinorFontFamily)'
        postButton.style.textShadow = 'var(--stdMinorShadow)'
        postButton.style.boxShadow = 'var(--stdMinorShadow)'
        postButton.style.border = 'var(--stdBorder)'

        postButton.addEventListener('click', () =>
        {
            stagingThread.style.display = 'none';

            let name = document.getElementById('nameInput');
            name = name.value;
            let description = document.getElementById('descriptionInput');
            description = description.value;
            
            askServerToCreateThread(name, description);

        });

        stagingThread.appendChild(postButton);

        channelInfoHolder.appendChild(stagingThread);

    }


    {
        const spacer = document.createElement('div');
        const div = spacer;
        div.id = 'threadListMessagesAndViewsSortDiv';
        div.style.backgroundColor = 'var(--backgroundColor)'
        div.style.height = '26px';
        div.style.border = 'var(--stdBorder)'
        div.style.display = 'flex'
        if (window.loggedIn) { 
        div.style.width = '790px';
        } else {
            div.style.width = `${790+210}px`;
        }
        div.style.position = 'relative'
        div.style.top = 'px';

        channelInfoHolder.appendChild(div);
    }
    {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.className = 'stdText';
        searchInput.classList.add('placeholder');
        searchInput.style.position = 'relative'
        searchInput.style.backgroundColor = 'transparent'
        searchInput.style.left = '0px'
        searchInput.style.margin = '0px';
        searchInput.style.outline = 'none';
        searchInput.style.left = '0px';
        searchInput.style.border = 'var(--stdBorder)';
        searchInput.style.width = '400px'
        searchInput.style.textAlign = 'left';
        searchInput.style.fontSize = '17px';
        searchInput.placeholder = 'Search:';
        
        channelInfoHolder.appendChild(searchInput);

        //event listener to search input
        searchInput.addEventListener('input', function(event) {
            const CTH = document.getElementById('channelThreadsHolder');
            for (let thh of CTH.children) {
                if (thh.className == 'threadHeaderHolder') {
                    // https://tomekdev.medium.com/highlight-matching-text-in-javascript-ff803c9af7b0
                    let title = thh.querySelector('.threadHeaderTitle').textContent.toLowerCase();
                    const desc = thh.querySelector('.stdMinorText').textContent.toLowerCase();
                    const searchValue = event.target.value.toLowerCase();
                    if (title.includes(searchValue) || desc.includes(searchValue)) {
                        thh.style.display = 'block'; // Show the thread
                    } else {
                        thh.style.display = 'none'; // Hide the thread
                    }

                    title = thh.querySelector('.threadHeaderTitle');
                    const searchText = event.target.value;
                    const regex = new RegExp(searchText, 'gi');
                  
                    let text = title.textContent;
                    text = text.replace(/(<mark class="highlight">|<\/mark>)/gim, '');
                  
                    const newText = text.replace(regex, '<mark class="highlight">$&</mark>');
                    title.innerHTML = newText;
                }
            }
            
        });

        // add the search magnifying class icon
        const searchIcon = document.createElement('img');
        searchIcon.src = `${window.baseURL}/icons/256px-Magnifying_glass_icon.png`
        searchIcon.width = '20';
        searchIcon.height = '20';
        searchIcon.style.position = 'absolute';
        searchIcon.style.right = '5px'
        searchIcon.style.top = '50%';
        searchIcon.style.transform = 'translateY(-50%)';
        channelInfoHolder.appendChild(searchIcon);
    }
}

// clears all thread headers
async function clearTHHs() {
    const threadsHolder = document.getElementById("channelThreadsHolder");

    // delete all children that are thread headers
    // first convert to static array because direct modification of the children property is invalid
    for (let child of Array.from(threadsHolder.children)) {
        if (child.dataset.threadID != undefined && child.className != 'message-right-click-box') {
            child.remove();
        }
    }
}

async function loadThreads(threads) {

    clearTHHs();

    window.threads = threads;

    if (window.loggedIn == undefined) {
        window.loggedIn = false;
    }
    
    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'inline'; // make visible
    const msgHolder = document.getElementById('threadMessagesHolder');
    msgHolder.style.display = 'none';     // make message holder invis

  

    // first destroy ul list if it exists
    // add UL list
    const UL = document.createElement('UL');
    UL.style.margin = '0'
    UL.style.padding = '0';


    const pinnedThreadId = window.currentChannel.pinnedThreadId;
    if (pinnedThreadId != null && pinnedThreadId != undefined) {

        const index = pinnedThreadId-1;

        // move the pinned thread to the top
        threads.unshift(threads.splice(index, 1)[0]);
    }

    for (let thread of threads) {
        if (thread == undefined) {
            console.warn("Attempted to load the handle of an invalid thread: ", thread);
            continue;
        }
        const msgCount = await getMessageCountOfThread(thread.id);
        thread.messageCount = msgCount;
        // thread header holder
        const thh = document.createElement("div");
        thh.className = "threadHeaderHolder";
        thh.dataset.threadID = thread.id;
        thh.dataset.ownerName = thread.ownerUsername;
        thh.addEventListener('click', setCurrentThreadFromThreadHandleButton);
        thh.addEventListener('contextmenu', handleTHHrightClick);
        threadsHolder.appendChild(thh);

        const title = document.createElement("p");
        title.style.position = 'absolute'
        title.style.padding = '5px';
        title.style.paddingTop = '1px';
        title.className = "threadHeaderTitle";
        title.textContent = thread.name;

        thh.appendChild(title); // add <p> to the <div>
        
        const desc = document.createElement("p");
        desc.className = "stdMinorText";
        desc.style.fontFamily = 'var(--stdMinorFontFamily)'
        desc.style.textShadow = 'var(--stdMinorShadow)'
        desc.style.color = 'var(--mainTextColor)'
        desc.style.padding = '0px';
        desc.style.margin = '0px';
        desc.textContent = thread.description;
        desc.style.position = 'absolute';
        desc.style.left = '10px';
        desc.style.marginTop = '33px';
        thh.appendChild(desc); // add <p> to the <div>
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'thhIconDiv'
        iconDiv.style.marginLeft = `${title.clientWidth +title .offsetLeft}px`
        thh.appendChild(iconDiv);

        {
            // add the pin icon
            // invis by default
            const pinThreadIcon = document.createElement('img');
            pinThreadIcon.dataset.type = 'pin';
            pinThreadIcon.className = 'thhIcon';
            pinThreadIcon.src = `${window.baseURL}/icons/pinned.png`;
            pinThreadIcon.style.display = 'none';
            iconDiv.appendChild(pinThreadIcon);
            if (thread.id == window.currentChannel.pinnedThreadId) {
                pinThreadIcon.style.display = 'block';
            }

            // add the locked to admins icon
            if (thread.lockedToAdmins == true && window.user != undefined) {
                const lockedIcon = document.createElement('img');
                lockedIcon.dataset.type = 'lock';
                lockedIcon.className = 'thhIcon';
                lockedIcon.src = `${window.baseURL}/icons/locked.png`;
                iconDiv.appendChild(lockedIcon);
            }

            if (window.user != undefined) {
                const unreadPingCountForThisThread = (window.user.unreadPings.filter((ping) => (ping.channelID == window.currentChannel.id && ping.threadID == thread.id))).length;            

                const notisCountDiv = document.createElement('div');
                notisCountDiv.dataset.type = 'notice'
                notisCountDiv.className = 'notisIconDiv';
                notisCountDiv.style.width = '20px';
                notisCountDiv.style.height = '20px';

                if (unreadPingCountForThisThread>0) {
                    notisCountDiv.style.display = 'block'
                } else {
                    notisCountDiv.style.display = 'none' // no unread pings for this thread
                }
                const notisCountP = document.createElement('p');
                notisCountP.className = 'stdText';
                notisCountP.textContent = `${unreadPingCountForThisThread}`;
                notisCountP.style.margin = 'auto';
                notisCountP.style.color = 'var(--mainTextColor)'
                notisCountP.style.fontSize = '15px'
    
                notisCountDiv.appendChild(notisCountP);
                iconDiv.appendChild(notisCountDiv);
            }
        }
        {
            // additional info div
            const additionalInfoDiv = document.createElement('div');
            additionalInfoDiv.style.position = 'relative';
            additionalInfoDiv.style.border = 'var(--stdBorder)'
            additionalInfoDiv.style.width = '400px';
            additionalInfoDiv.style.height =  `50px`
            additionalInfoDiv.style.padding = '0px';
            additionalInfoDiv.style.marginLeft = 'auto'; 
            additionalInfoDiv.style.marginRight = '2px';
            
            additionalInfoDiv.style.marginTop = '2px'
            additionalInfoDiv.style.marginBottom = 'auto'
            additionalInfoDiv.style.boxShadow = 'var(--stdMinorShadow)'
            thh.append(additionalInfoDiv);

            // message count
            const msgCountP = document.createElement('p');
            msgCountP.className = 'stdText';
            msgCountP.innerText = `Messages: ${thread.messageCount}`;
            msgCountP.style.position = 'absolute';
            msgCountP.style.left = '0px'; 
            msgCountP.style.padding = '0';
            msgCountP.style.margin = 'auto 5px'; 
            msgCountP.style.marginTop = '3px'
            additionalInfoDiv.appendChild(msgCountP);

            // last active time
            const lastActiveP = document.createElement('p');
            lastActiveP.className = 'stdText';
            if (thread.lastActive == undefined) {
                lastActiveP.innerText = `No recorded activity`;
            } else {
                lastActiveP.innerText = `Last Active: ${getRelativeTimeStr(thread.lastActive)}`;

            }
            lastActiveP.style.position = 'absolute';
            lastActiveP.style.left = '0px'; 
            lastActiveP.style.padding = '0';
            lastActiveP.style.margin = 'auto 5px'; 
            lastActiveP.style.marginTop = '29px'
            additionalInfoDiv.appendChild(lastActiveP);



            let pfpImgSrc = `${window.baseURL}/icons/default-pfp.png`;

            if (thread.ownerHasProfilePicture == true) {
                pfpImgSrc = `${window.baseURL}/profile-pictures/${thread.ownerUsername }.jpg`
            }

            const pfpImgHREFwrapper = document.createElement('a');
            pfpImgHREFwrapper.href = `${window.baseURL}/users/${thread.ownerUsername}`
            pfpImgHREFwrapper.style.width = '40px';
            pfpImgHREFwrapper.style.height = '40px';
            pfpImgHREFwrapper.style.padding = '0';
            pfpImgHREFwrapper.style.margin = 'auto 0px'
            pfpImgHREFwrapper.style.boxShadow = 'var(--stdMinorShadow)'
            pfpImgHREFwrapper.style.position = 'absolute';
            pfpImgHREFwrapper.style.right = '5px'
            pfpImgHREFwrapper.style.top = '50%'; // Position it at the vertical center
            pfpImgHREFwrapper.style.transform = 'translateY(-50%)'; // Adjust the vertical positioning to truly center it
            additionalInfoDiv.append(pfpImgHREFwrapper);

            // owner username & pfp
            const pfpIMG = document.createElement('img');
            pfpIMG.width = '40';
            pfpIMG.height = '40';
            pfpIMG.src = pfpImgSrc;

            
            pfpImgHREFwrapper.appendChild(pfpIMG);

            const ownerName = document.createElement('p');
            ownerName.className = 'stdText';
            ownerName.innerText = thread.ownerUsername;
            ownerName.style.position = 'absolute';
            ownerName.style.right = '50px'
            ownerName.style.margin = '0';                  // Remove default margins
            ownerName.style.margin = 'auto 5px'; 
            
            additionalInfoDiv.append(ownerName);
        }
    }
}