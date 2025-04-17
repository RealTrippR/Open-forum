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

async function getThreadMessageChunkFromServer(channelID, threadID, chunkIndex) {
    try {
        const res = await fetch('/api-get-message-chunk-from-thread', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelID, threadID, chunkIndex})
        });

        if (!res.ok) {
            throw new Error('Failed to get chunk message: ',res);
        }
        const json = await res.json();
        return json;
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
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
        return json;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
        }
    })();
}

function sendMessage(message) {
    socket.emit('send-message', {message: message, channelID: window.currentChannel.id, threadID: window.currentThreadID});

    const now = new Date();
    const datetime = now.toISOString()
    addMessageToMessageHolder(message, datetime, window.user);
}

function deleteMessage(messageID, messageElement /*optional*/) {
    if (messageID == undefined) {
        console.error("Cannot delete message, ID is invalid: ", messageID);
        return;
    }
    console.log( {messageID: messageID, channelID: window.currentChannel.id, threadID: window.currentThreadID});
    socket.emit('delete-message', {messageID: messageID, channelID: window.currentChannel.id, threadID: window.currentThreadID});

    if (messageElement != undefined) {
        messageElement.remove();
    }
}

function recieveMessageFromServer(req) {
    const now = new Date();
    const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
    addMessageToMessageHolder(req.message, datetime, req.userInfo);
}

function deleteChatMessageAtServerRequest(req) {
    const msgUL = document.getElementById('message-UL');
    for (let msgElm of msgUL.children) {
        if (msgElm.dataset.messageID == req.messageID) {
            msgElm.remove();
        } 
    }
}

function getCurrentThreadID() {
    return window.currentThreadID;
}

function addMessageToMessageHolder(message, messageDateTime, messageOwner, messageID, insertToBeginning=false) {
    if (message == undefined) {console.error("message is required as an argument")};
    if (messageDateTime == undefined) {console.error("messageDateTime is required as an argument")}
    if (messageOwner == undefined) {console.error("messageOwner is required as an argument")}
    if (messageID == undefined) {console.error("messageID is required as an argument")}


    const relativeDate = getRelativeTimeStr(messageDateTime);
    const msgUL = document.getElementById('message-UL');
    
      
    // load PFP
    let pfpImgSrc = "\\icons\\default-pfp.png";

    if (messageOwner.hasProfilePicture == true) {
        pfpImgSrc = `\\profile-pictures\\${messageOwner.username}.jpg`
    }
    {
        const li = document.createElement('li');
        li.dataset.ownerUsername = messageOwner.username;
        li.dataset.messageID = messageID;

        const profileDiv = document.createElement('div');
        profileDiv.classList.add('threadMessagesProfileDiv');

        const profileLink = document.createElement('a');
        profileLink.href = `/users/${messageOwner.username}`;
        profileLink.style.display = 'inline-block';
        profileLink.style.width = '35px';
        profileLink.style.height = '35px';
        profileLink.style.padding = '0';
        profileLink.style.margin = '0';
        profileLink.style.boxShadow = 'var(--stdMinorShadow)';
        profileLink.style.overflow = 'hidden';

        const profileImage = document.createElement('img');
        profileImage.src = pfpImgSrc;
        profileImage.width = 35;
        profileImage.height = 35;
        profileImage.style.display = 'block';

        profileLink.appendChild(profileImage);
        profileDiv.appendChild(profileLink);

        // msg username
        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('msg-username');
        usernameSpan.textContent = messageOwner.username;

        // msg date
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('msg-date');
        dateSpan.textContent = ` | ${relativeDate}`;

        // actual message text
        const textSpan = document.createElement('span');
        textSpan.classList.add('msg-text');
        textSpan.textContent = message;

        li.appendChild(profileDiv);
        li.appendChild(usernameSpan);
        li.appendChild(dateSpan);
        li.appendChild(textSpan);

        if (insertToBeginning == true) {
            msgUL.insertBefore(li, msgUL.firstChild);
        } else {
            msgUL.appendChild(li);
        }

        // DOM is really weird, but this hides the msg right click when box anything else is pressed
        document.addEventListener('click', (event) => {
            const msgRightclickDiv = document.getElementById('message-right-click-box');
            msgRightclickDiv.style.display = 'none';
            msgRightclickDiv.associatedMessageElement = null;
        });
        li.addEventListener('contextmenu', (event) => { 
            event.preventDefault();
 
            const msgRightclickDiv = document.getElementById('message-right-click-box');
            msgRightclickDiv.innerHTML = ``;
            
            msgRightclickDiv.associatedMessageElement = event.target;
            msgRightclickDiv.dataset.messageID = li.dataset.messageID;

            msgRightclickDiv.style.display = 'block';
                // Position the right-click menu at the mouse coordinates
            msgRightclickDiv.style.left = `${event.pageX}px`;
            msgRightclickDiv.style.top = `${event.pageY}px`;
            msgRightclickDiv.style.width = `100px`;
            msgRightclickDiv.style.height = `auto`;
            msgRightclickDiv.style.padding = '0px';

            const copyMsgLinkButton = document.createElement('div'); copyMsgLinkButton.className = 'message-right-click-button'
            const replyToMsgButton = document.createElement('div'); replyToMsgButton.className = 'message-right-click-button'
            const deleteMsgButton = document.createElement('div'); deleteMsgButton.className = 'message-right-click-button'
            copyMsgLinkButton.innerHTML += `<p> Copy Link </p>`;
            if (window.loggedIn == true) { 
                replyToMsgButton.innerHTML += `<p> Reply </p>`;
            }

            if (li.dataset.ownerUsername == window.user.username) {
                deleteMsgButton.innerHTML += `<p> Delete </p>`;
            }

            if (window.loggedIn == true) { 
                replyToMsgButton.addEventListener('click', () => {
                
                });
            }
            
            if (li.dataset.ownerUsername == window.user.username) {
                deleteMsgButton.addEventListener('click', () => {
                    deleteMessage(li.dataset.messageID, msgRightclickDiv.associatedMessageElement);
                    console.log('REMOVED: ', msgRightclickDiv.associatedMessageElement)
                });
            }

            msgRightclickDiv.appendChild(copyMsgLinkButton);
            if (window.loggedIn == true) { 
                msgRightclickDiv.appendChild(replyToMsgButton);
            }
            if (li.dataset.ownerUsername == window.user.username) {
                msgRightclickDiv.appendChild(deleteMsgButton);
            }
        });
    }
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
    const msgUL = document.getElementById('message-UL');
    msgUL.innerHTML = ''; // clear the messages

    window.currentThreadID = threadID;

    
    // hide the threads holder.
    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';

    // load the messages
    //const res = await getThreadMessagesFromServer(window.currentChannel.id,threadID);
    const res = await getThreadMessageChunkFromServer(window.currentChannel.id, threadID, 0)
    const threadMessages = res.messages;

    for (let message of threadMessages) {
        addMessageToMessageHolder(message.content, message.date, {id: message.ownerID, username: message.ownerUsername, hasProfilePicture: message.ownerHasProfilePicture}, message.id, true);
    }

    return threadMessages;
}

async function setCurrentThreadFromThreadHandleButton() {
    const btn = event.currentTarget; // The clicked <li> element
    await setCurrentThread(btn.dataset.threadID);
}

function initMessageHolder() {
    const threadMsgHolderOuter = document.getElementById('threadMessagesHolder');
    threadMsgHolderOuter.innerHTML += '<UL id="message-UL"> </UL>' // the list where the actual messages are stored

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
    chatTypeBoxDiv.innerHTML = `
    <button type="submit" id="send-button" class="send-button">Send</button>`;

    let msgHolder = document.createElement('chat-message-holder');
    if (msgHolder == undefined) {
        msgHolder = document.createElement('div');
    } else {
        msgHolder.innerHTML = '';
    }

    msgHolder.contentEditable = true;
    msgHolder.id = 'chat-message-holder'
    msgHolder.className = 'chat-message-holder';
    const MAX_MESSAGE_LENGTH = 4096;
    msgHolder.maxlength = MAX_MESSAGE_LENGTH;

    chatTypeBoxDiv.appendChild(msgHolder);

    const sendButton = document.getElementById("send-button");

    msgHolder.addEventListener('keydown', (event) => {
        const messageUL = document.getElementById('message-UL');
        messageUL.style.marginTop = `-${msgHolder.clientHeight-40}px`
        if (msgHolder.innerText.length > MAX_MESSAGE_LENGTH) {
            msgHolder.innerText = msgHolder.innerText.slice(0, MAX_MESSAGE_LENGTH);
        } else {
            if (event.key == 'Enter' && msgHolder.innerText.length != 0 && !event.shiftKey) {
                event.preventDefault();
                sendButton.click();
            }
            if (event.key == 'Enter' && !event.shiftKey) {
            }
        }
        if (msgHolder.innerText.length == 0) {
            messageUL.style.marginTop = `5px`;
        }
    })

    sendButton.addEventListener('click', () => {
        if (msgHolder.innerText.length != 0) { // cannot send a blank message
            if (msgHolder.innerText.length > MAX_MESSAGE_LENGTH) {
                msgHolder.innerText = msgHolder.innerText.slice(0, MAX_MESSAGE_LENGTH)
            } else {
                sendMessage(msgHolder.innerText)
                msgHolder.innerText = '';
            }
        }
    }); 

    
    const threadMessagesHolder = document.getElementById('threadMessagesHolder'); // the main div that holds the open thread
    // create message right click box
    const msgRightClickDiv = document.createElement('div');
    msgRightClickDiv.id = 'message-right-click-box';
    msgRightClickDiv.className = 'message-right-click-box';
    threadMessagesHolder.appendChild(msgRightClickDiv);
   
    const messageUL = document.getElementById('message-UL');

    let isLoading = false;

    messageUL.addEventListener('scroll', async () => {
        if (isLoading) return;
        if (Math.abs(messageUL.scrollTop) <= 20) {
            isLoading = true;
            
            const oldScrollHeight = messageUL.scrollHeight;
            const oldScrollTop = messageUL.scrollTop;

            console.log('st: ', messageUL.scrollTop, 'cidx: ', window.highestChunkIndex )
            const res = await getThreadMessageChunkFromServer(window.currentChannel.id, window.currentThreadID,  window.highestChunkIndex + 1)
            const threadMessages = res.messages;
            if (threadMessages.length == 0) { // return if the chunk is out of bounds
                return;
            }

            window.highestChunkIndex++;
            for (let message of threadMessages) {
                addMessageToMessageHolder
                (
                    message.content, message.date,
                    {id: message.ownerID, username: message.ownerUsername, hasProfilePicture: message.ownerHasProfilePicture},
                    message.id,
                    true
                );
            }
                        
            // Adjust scroll so it looks like nothing jumped
            const newScrollHeight = messageUL.scrollHeight;
            messageUL.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);

            {
                // load another chunk
                const res = await getThreadMessageChunkFromServer(window.currentChannel.id, window.currentThreadID,  window.highestChunkIndex + 1)
                const threadMessages = res.messages;
                if (threadMessages.length == 0) { // return if the chunk is out of bounds
                    return;
                }

                window.highestChunkIndex++;
                for (let message of threadMessages) {
                    addMessageToMessageHolder
                    (
                        message.content, message.date,
                        {id: message.ownerID, username: message.ownerUsername, hasProfilePicture: message.ownerHasProfilePicture},
                        message.id,
                        true
                    );
                }

            }
            isLoading = false;
        }        
    });
}

function setCurrentThread(threadID, loadHTML = true) {

    window.highestChunkIndex = 0;

    let state = {channelId: window.currentChannel.id}; if (window.threadID !=undefined) {state.threadID = window.threadID};
    window.history.pushState(state, '', `/channels/${window.currentChannel.id}/${threadID}`);

    if (window.currentThreadID) {
        socket.off(`#${window.currentThreadID}new-chat-message`);
    }

    socket.on(`#${threadID}new-chat-message`, recieveMessageFromServer)

    socket.on(`#${threadID}delete-chat-message`, deleteChatMessageAtServerRequest)
    window.currentThreadID = threadID;

    for (const thread in window.currentChannel.threads) {
        if (thread.id == threadID) {
            window.currentThread = thread;
            break;
        }
    }

    if (loadHTML) {

        const threadsHolder = document.getElementById("channelThreadsHolder");
        threadsHolder.style.display = 'none';  // make message holder invis
        const channelInfoHolder = document.getElementById('channelInfoBarHolder');
        channelInfoHolder.style.display = 'none';

        const threadMsgHolderOuter = document.getElementById('threadMessagesHolder');
        threadMsgHolderOuter.style.display = 'inline'; // make visible

        const msgChatBox = document.getElementById('chatTypeDiv')
        if (window.loggedIn) {
            msgChatBox.style.display = 'flex';
        }

        loadThreadFromID(getCurrentThreadID());
    }
}

//export default {getCurrentThread, getThreadMessagesFromServer, loadThreadByID}