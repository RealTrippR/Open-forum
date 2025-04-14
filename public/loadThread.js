function getRelativeTimeStr(dateString) {
    
    let now = new Date();
    now = new Date(now.toISOString())
    console.log(dateString, ' - ', now.toISOString())

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


async function getThreadMessagesFromServer(channelID, threadID) {
    return (async () => {
    try {
        const res = await fetch('/api-get-messages-from-thread', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelID, threadID })
        });

        if (!res.ok) {
            throw new Error('Bad server response');
        }

        const json = await res.json();
        console.log('res:', json);
        return json;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
        }
    })();
}

function sendMessage(message) {
    socket.emit('send-message', {message: message, channelID: window.currentChannel.id, threadID: window.currentThreadID});  // Emit message to server

    // add it to the message list

    const now = new Date();
    const datetime = now.toISOString()
    addMessageToMessageHolder(message, datetime, window.user);
}

function recieveMessageFromServer(req) {
    const now = new Date();
    const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
    addMessageToMessageHolder(req.message, datetime, req.userInfo);
}

function getCurrentThreadID() {
    return window.currentThreadID;
}

function addMessageToMessageHolder(message, messageDateTime, messageOwner) {
    const relativeDate = getRelativeTimeStr(messageDateTime);
    const msgUL = document.getElementById('message-UL');
    
      
    let pfpImgSrc = "\\icons\\default-pfp.png";

    if (messageOwner.hasProfilePicture == true) {
        pfpImgSrc = `\\profile-pictures\\${messageOwner.username}.jpg`
    }
    msgUL.innerHTML += `<li>
    <div class = threadMessagesProfileDiv>
    <img src='${pfpImgSrc}' width=45 height=45> </img> 
    </div>
    <span class="msg-username">${messageOwner.username}</span>
    <span class="msg-date"> |  ${relativeDate}</span>

    <span class="msg-text">${message}</span>
    </li>`

    const messageItems = document.querySelectorAll('.threadMessagesHolder ul li');

    requestAnimationFrame(() => {
        const messageItems = document.querySelectorAll('.threadMessagesHolder ul li');
    
        messageItems.forEach((item) => {
            const dateSpan = item.querySelector('.msg-date');
            const usernameSpan = item.querySelector('.msg-username');
    
            if (dateSpan && usernameSpan) {
                const usernameWidth = usernameSpan.offsetWidth;
                const usernameLeft = usernameSpan.offsetLeft;
    
                dateSpan.style.position = 'absolute';
                dateSpan.style.left = `${usernameLeft + usernameWidth + 4}px`;
            }
        });
    });
    
    if (Math.abs(msgUL.scrollTop - msgUL.scrollHeight) < 2000) {
        msgUL.scrollTop = msgUL.scrollHeight;
    }
}

// opens the thread by ID
// returns the thread messages
async function loadThreadFromID(threadID) {
    window.currentThreadID = threadID;

    
    // hide the threads holder.
    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';

    // load the messages
    const res = await getThreadMessagesFromServer(window.currentChannel.id,threadID);
    const threadMessages = res.messages;

    console.log('Loaded messages of threadID: ', threadID);
    console.log('Messages: ', threadMessages);

    for (let message of threadMessages) {
        addMessageToMessageHolder(message.content, message.date,{id: message.ownerID, username: message.ownerUsername, hasProfilePicture: message.ownerHasProfilePicture});
    }

    return threadMessages;
}

async function setCurrentThreadFromThreadHandleButton() {
    const btn = event.currentTarget; // The clicked <li> element
    await setCurrentThread(btn.dataset.threadID);
}

function initMessageHolder() {
     
    // socket io is used to send and recieve messages only!
    socket.on('connect', () => {
        console.log('Connected to socket-io server');
    });


    const chatTypeBoxDiv = document.createElement('div');
    chatTypeBoxDiv.id = 'chatTypeDiv';
    chatTypeBoxDiv.className = 'chatTypeDiv'
    chatTypeBoxDiv.style.display = 'none';
    document.body.appendChild(chatTypeBoxDiv);
    
    chatTypeBoxDiv.style.alignItems = 'stretch';
    chatTypeBoxDiv.style.height = '40px';
    chatTypeBoxDiv.innerHTML = `
    <button type="submit" id="send-button" class="send-button">Send</button>`;

    const msgHolder = document.createElement('input');
    msgHolder.id = 'chat-message-holder'
    msgHolder.className = 'chat-message-holder';

    chatTypeBoxDiv.appendChild(msgHolder);

    const sendButton = document.getElementById("send-button");

    msgHolder.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    sendButton.addEventListener('click', () => {
        if (msgHolder.value.length != 0) { // cannot send a blank message
            sendMessage(msgHolder.value)
            msgHolder.value = '';
        }
    });
}

function setCurrentThread(threadID) {

    if (window.currentThreadID) {
        socket.off(`#${window.currentThreadID}new-chat-message`);
    }

    socket.on(`#${threadID}new-chat-message`, recieveMessageFromServer)

    window.currentThreadID = threadID;

    for (const thread in window.currentChannel.threads) {
        if (thread.id == threadID) {
            window.currentThread = thread;
            break;
        }
    }


    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';  // make message holder invis
    const channelInfoHolder = document.getElementById('channelInfoBarHolder');
    channelInfoHolder.style.display = 'none';
    
    const msgHolder = document.getElementById('threadMessagesHolder');
    msgHolder.style.display = 'inline'; // make visible

    msgHolder.innerHTML = ''; // clear existing messages
    msgHolder.innerHTML += '<UL id="message-UL"> </UL>' // the list where the actual messages are stored

    const msgChatBox = document.getElementById('chatTypeDiv')
    if (window.loggedIn) {
        msgChatBox.style.display = 'flex';
    }
    loadThreadFromID(getCurrentThreadID());
}

//export default {getCurrentThread, getThreadMessagesFromServer, loadThreadByID}