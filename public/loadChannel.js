//import threads from '/loadThreads.js';

function askServerToCreateThread(threadName, threadDescription) {
    fetch('/api-create-thread',
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

async function getMessageCountOfThread(threadID) {
    if (threadID === undefined) {
        console.error('getMessageCountOfThread: ThreadID is required as an argument!');
        return -1;
    }

    try {
        const res = await fetch('/api-get-thread-message-count', {
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
            throw new Error('Bad server response: ', res);
        }

        const json = await res.json();
        // Return the message count from the response
        return json.count;
    } catch (error) {
        console.error('Fetch error:', error);
        return -1; // Default to -1 on error
    }
}

function createStagingThreadAndThreadInfoHolder() {

    const channelInfoHolder = document.getElementById("channelInfoBarHolder");
    channelInfoHolder.innerHTML = '';
    channelInfoHolder.style.width = 'calc(100% - var(--channelBarWidth) - 270px)'

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
        stagingThread.className = 'threadHeaderHolder'
        stagingThread.style.padding = '10px'
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
            console.log("post clicked!");
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
        div.style.width = '790px';
        div.style.position = 'relative'
        div.style.top = 'px';

        channelInfoHolder.appendChild(div);
    }
    {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.className = 'stdText';
        searchInput.style.position = 'relative'
        searchInput.style.backgroundColor = 'transparent'
        searchInput.style.left = '0px'
        searchInput.style.margin = 'auto 0px';
        searchInput.style.margin = '0px'
        searchInput.style.marginLeft = '65px'
        searchInput.style.margin = '0px';
        searchInput.style.outline = 'none';
        searchInput.style.left = '0px';
        searchInput.style.border = 'var(--stdBorder)';
        searchInput.style.width = '315px'
        searchInput.style.textAlign = 'left';
        searchInput.style.fontSize = '17px';
        searchInput.placeholder = 'Search:';

        channelInfoHolder.appendChild(searchInput);


        // add the search magnifying class icon
        const searchIcon = document.createElement('img');
        searchIcon = 'icons/256px-Magnifying_glass_icon.svg'
        searchIcon.width = '20';
        searchIcon.height = '20';

        searchInput.appendChild(searchIcon);
    }
}


async function loadThreads(threads) {
    window.threads = threads;

    if (window.loggedIn == undefined) {
        window.loggedIn = false;
    }

    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'inline'; // make visible
    const msgHolder = document.getElementById('threadMessagesHolder');
    msgHolder.style.display = 'none';     // make message holder invis

    // delete old threads
    threadsHolder.innerHTML = '';
    createStagingThreadAndThreadInfoHolder(); // recreate staging thread bc we just deleted it

    // first destroy ul list if it exists
    // add UL list
    const UL = document.createElement('UL');
    UL.style.margin = '0'
    UL.style.padding = '0';


    for (let thread of threads) {
        const msgCount = await getMessageCountOfThread(thread.id);
        thread.messageCount = msgCount;
        // thread header holder
        const thh = document.createElement("div");
        thh.className = "threadHeaderHolder";
        thh.dataset.threadID = thread.id;
        thh.addEventListener('click', setCurrentThreadFromThreadHandleButton);

        const title = document.createElement("p");
        title.className = "threadHeaderTitle";
        title.textContent = thread.name; // assuming thread.name is defined

        thh.appendChild(title); // add <p> to the <div>
        
        const desc = document.createElement("p");
        desc.className = "stdMinorText";
        desc.style.fontFamily = 'var(--stdMinorFontFamily)'
        desc.style.textShadow = 'var(--stdMinorShadow)'
        desc.style.color = 'var(--mainTextColor)'
        desc.style.padding = '0px';
        desc.style.paddingLeft = '5px';
        desc.style.margin = '5px';
        desc.textContent = thread.description; // assuming thread.name is defined
        thh.appendChild(desc); // add <p> to the <div>

        threadsHolder.appendChild(thh);

        
        // additional info div
        const additionalInfoDiv = document.createElement('div');
        additionalInfoDiv.style.display = 'flex';
        additionalInfoDiv.style.border = 'var(--stdBorder)'
        additionalInfoDiv.style.position = 'absolute';
        additionalInfoDiv.style.top = '4px';        
        additionalInfoDiv.style.right = '4px';
        additionalInfoDiv.style.width = '400px';
        additionalInfoDiv.style.height =  `${thh.clientHeight-8}px`
        additionalInfoDiv.style.boxShadow = 'var(--stdMinorShadow)'


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
        lastActiveP.innerText = `Last Active: ${'placeholder'}`;
        lastActiveP.style.position = 'absolute';
        lastActiveP.style.left = '0px'; 
        lastActiveP.style.padding = '0';
        lastActiveP.style.margin = 'auto 5px'; 
        lastActiveP.style.marginTop = '29px'
        additionalInfoDiv.appendChild(lastActiveP);



        let pfpImgSrc = "\\icons\\default-pfp.png";

        if (thread.ownerHasProfilePicture == true) {
            pfpImgSrc = `\\profile-pictures\\${thread.ownerUsername }.jpg`
        }

        // owner username & pfp
        const pfpIMG = document.createElement('img');
        pfpIMG.width = '40';
        pfpIMG.height = '40';
        pfpIMG.src = pfpImgSrc;
        pfpIMG.style.padding = '0';
        pfpIMG.style.margin = 'auto 0px'
        pfpIMG.style.boxShadow = 'var(--stdMinorShadow)'
        pfpIMG.style.position = 'absolute';
        pfpIMG.style.right = '5px'
        pfpIMG.style.top = '50%'; // Position it at the vertical center
        pfpIMG.style.transform = 'translateY(-50%)'; // Adjust the vertical positioning to truly center it
        additionalInfoDiv.append(pfpIMG);

        const ownerName = document.createElement('p');
        ownerName.className = 'stdText';
        ownerName.innerText = thread.ownerUsername;
        ownerName.style.position = 'absolute';
        ownerName.style.right = '50px'
        ownerName.style.margin = '0';                  // Remove default margins
        ownerName.style.margin = 'auto 5px'; 
        
        additionalInfoDiv.append(ownerName);

        thh.append(additionalInfoDiv);
    }
}