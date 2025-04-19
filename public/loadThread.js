
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

function stringToBool(str) {
    return String(str).toLowerCase() === "true";
}


function setReplyingTo(msgElement) {
    window.currentlyReplyingTo = msgElement;
    replyMsgDiv = document.getElementById('replyMsgDiv');
    replyMsgDiv.innerHTML = ``;
    if (msgElement == null || msgElement == undefined) {
        replyMsgDiv.style.display = 'none';
        replyMsgDiv.innerHTML = ''
        return;
    }
    if (msgElement.children == undefined || msgElement.children.length == 0) {return;} // fix strange bug where the children haven't loaded in yet
    {
        replyMsgDiv.style.display = 'block';
        let HTML = ``;     
        HTML += `<img src='/icons/ReplyArrow.png' width=30 height=30 id='replyIcon' style='position: absolute; margin: 0; padding: 0; left: -4px; top: 3px;'>`;
        HTML += `<p class = "stdText" style="font-size: 11px; margin-left: 22px; text-align: left;">  </p> `;
        replyMsgDiv.innerHTML  = HTML;
        replyMsgDiv.children[1].innerText = `Replying To: ${msgElement.children[1].innerHTML}`
    }
}

function getReplyingTo() {
    // note that currentlyReplyingTo is a DOM element
    if (window.currentlyReplyingTo == undefined || window.currentlyReplyingTo == null) {
        return null;
    } else {
        return window.currentlyReplyingTo.dataset.messageID;
    }
}

function isReplying() {
    return (window.currentlyReplyingTo == null || window.currentlyReplyingTo == undefined);
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

async function getThreadMessageChunkFromServer(channelID, threadID, chunkIndex) {
    let res;
    try {
        res = await fetch('/api-get-message-chunk-from-thread', {
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
        if (json.messages == undefined) {json.messages = []};
        return json;
    } catch (err) {
        console.error('Fetch error:', err, res);
        return false;
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

    window.currentThread.messageCount += 1;
            
    // highlight @mentions by breaking the message up into parts and joining it back together
    const mentionRegex = /(@\w+)/g;
    const parts = message.split(mentionRegex);

    const pingUsers = {};
    parts.forEach(part => {
        if (mentionRegex.test(part)) {
            pingUsers[part] = [part];
        }
    });

    for (let username in pingUsers) {
        pingUser(username.slice(1))
    }

    socket.emit('send-message', {message: message, channelID: window.currentChannel.id, threadID: window.currentThreadID, isReplyTo: getReplyingTo()});

    const now = new Date();
    const datetime = now.toISOString()

    const msgUL = document.getElementById('message-UL');
    const lastElem = msgUL.children[msgUL.children.length-1];
    let lastID;
    if (lastElem != undefined) {
        lastID = Number(lastElem.dataset.messageID);
    } else {
        lastID = 0;
    }
    addMessageToMessageHolder(message, datetime, window.user, lastID+1, false, getReplyingTo());
}

function deleteMessage(messageID, messageElement /*optional*/) {
    if (messageID == undefined) {
        console.error("Cannot delete message, ID is invalid: ", messageID);
        return;
    }

    window.currentThread.messageCount -= 1;

    console.log( {messageID: messageID, channelID: window.currentChannel.id, threadID: window.currentThreadID});
    socket.emit('delete-message', {messageID: messageID, channelID: window.currentChannel.id, threadID: window.currentThreadID});

    if (messageElement != undefined) {
        messageElement.remove();
    }
}

function recieveMessageFromServer(req) {
    if (req.channelID != window.currentChannel.id || req.threadID != window.currentThreadID) {return};
    window.currentThread.messageCount += 1;
    const now = new Date();
    const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
    addMessageToMessageHolder(req.message, datetime, req.userInfo);
}


function pingUser(username) {
    socket.emit('ping-user', {targetUsername: username, channelID: window.currentChannel.id, threadID: window.currentThreadID});
}

function recievePingFromServer(req) {
    console.log('ping: ', req);
}


function deleteChatMessageAtServerRequest(req) {
    window.currentThread.messageCount -= 1;

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

function addMessageToMessageHolder(message, messageDateTime, messageOwner, messageID, insertToBeginning=false, isReplyTo = null) {
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
        

        
        const replyLeftOffsetPX = 50;
        let replyHeaderHeightPX = 0;
        { // if it's a reply to another message
            if (isReplyTo != null) {
                li.dataset.is_reply_to = isReplyTo;
                replyHeaderHeightPX = 13;
                
                li.style.marginLeft = `${replyLeftOffsetPX}px`;
                li.style.width = `calc(100% - 30px - ${replyLeftOffsetPX}px)`;

                // reply header
                const replyHeader = document.createElement('div');
                replyHeader.style.width = 'calc(100%)';
                replyHeader.style.padding = '0px';
                replyHeader.style.margin = '0px'
                replyHeader.style.position = 'absolute';
                replyHeader.style.height = `${replyHeaderHeightPX}px`;
                replyHeader.style.top = '-1px';
                replyHeader.style.left = '-1px';
                replyHeader.style.marginRight = '2px'
                replyHeader.style.backgroundColor = 'var(--stdRed)'
                replyHeader.style.border = 'var(--stdBorder)';


                // replyInfo 
                const replyInfoSpan = document.createElement('span');
                replyInfoSpan.className = 'msg-reply-header-text';
                replyInfoSpan.textContent = `-> ${isReplyTo}`;
                replyInfoSpan.style.marginTop = `-5px`;
                replyInfoSpan.style.padding = `0`;
                replyHeader.appendChild(replyInfoSpan);
                li.appendChild(replyHeader);

                replyHeader.addEventListener('click', (event) => {
                    goToMessage(replyHeader.parentElement.dataset.is_reply_to);
                });
            }
        }


        const profileDiv = document.createElement('div');
        profileDiv.className = 'threadMessagesProfileDiv';
        profileDiv.style.marginTop = `${replyHeaderHeightPX}px`

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
        usernameSpan.style.marginTop = `${replyHeaderHeightPX}px`

        // msg date
        const dateSpan = document.createElement('span');
        dateSpan.className = 'msg-date'
        dateSpan.textContent = ` | ${relativeDate}`;
        dateSpan.style.marginTop = `${replyHeaderHeightPX}px`


        // actual message text
        const textSpan = document.createElement('span');
        textSpan.className = 'msg-text';
        //textSpan.textContent = message;
        textSpan.style.marginTop = `${replyHeaderHeightPX+15}px`
                
        // highlight @mentions by breaking the message up into parts and joining it back together
        const mentionRegex = /(@\w+)/g;
        const parts = message.split(mentionRegex);

        parts.forEach(part => {
            if (mentionRegex.test(part)) {
                const mentionSpan = document.createElement('span');
                mentionSpan.textContent = part;
                mentionSpan.style.backgroundColor = 'var(--stdRed)';
                mentionSpan.style.padding = '1px';
                mentionSpan.style.fontWeight = '500';
                textSpan.appendChild(mentionSpan);
            } else {
                textSpan.appendChild(document.createTextNode(part));
        }
    });

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
            copyMsgLinkButton.addEventListener('click', () => {
                const rootURL = window.location.origin;
                const msgURL = `${rootURL}/channels/${window.currentChannel.id}/${window.currentThreadID}/messages/${msgRightclickDiv.dataset.messageID}`;
                // copy URL to OS clipboard
                navigator.clipboard.writeText(msgURL);
            });


            if (window.loggedIn == true) { 
                replyToMsgButton.innerHTML += `<p> Reply </p>`;
            }

            if (li.dataset.ownerUsername == window.user.username) {
                deleteMsgButton.innerHTML += `<p> Delete </p>`;
            }

            if (window.loggedIn == true) { 
                const chatMsgHolder = document.getElementById('chat-message-holder'); // the div that holds the message that the user is about to send
                replyToMsgButton.addEventListener('click', () => {
                    setReplyingTo(msgRightclickDiv.associatedMessageElement);
                    chatMsgHolder.focus();
                });
            }
            
            if (li.dataset.ownerUsername == window.user.username) {
                deleteMsgButton.addEventListener('click', () => {
                    deleteMessage(li.dataset.messageID, msgRightclickDiv.associatedMessageElement);
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


    // Update datespan after the DOM has finished loading
    requestAnimationFrame(() => {
        const messageItems = document.querySelectorAll('.threadMessagesHolder ul li');
    
        messageItems.forEach((item) => {
            const dateSpan = item.querySelector('.msg-date');
            const usernameSpan = item.querySelector('.msg-username');
    
            if (dateSpan && usernameSpan) {
                const usernameWidth = usernameSpan.offsetWidth;
                const usernameLeft = usernameSpan.offsetLeft;
    
                dateSpan.style.position = 'absolute';
                if (item.dataset.is_reply_to == undefined) {
                    dateSpan.style.marginLeft = `${usernameLeft + usernameWidth + 3}px`;
                } else {
                    dateSpan.style.marginLeft = `${usernameLeft + usernameWidth + 3}px`;
                }
            }
        });
    });
    

        
    const scrollToBottomOnMSGsend_THRESHOLD = 1000;
    // scroll to the bottom when a message is added/sent
    if (msgUL.scrollHeight - msgUL.scrollTop - msgUL.clientHeight < scrollToBottomOnMSGsend_THRESHOLD) {
        msgUL.scrollTop = msgUL.scrollHeight;
    }
}

// opens the thread by ID, by default it only loads the first chunk
async function loadThreadFromID(threadID,loadFirstTwoChunks=true) {

    window.loadedChunkIndices = [];

    const msgUL = document.getElementById('message-UL');
    while (msgUL.firstChild) { // clear all messages
        msgUL.removeChild(msgUL.firstChild);
    }
      
    window.currentThreadID = threadID;

    
    // hide the threads holder.
    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';

    if (loadFirstTwoChunks) {
        await loadMsgChunk(0);
        await loadMsgChunk(1);

    }
}

async function setCurrentThreadFromThreadHandleButton() {
    const btn = event.currentTarget; // The clicked <li> element
    await setCurrentThread(btn.dataset.threadID);
}

function initMessageHolder() {
    console.log('init msg holder')
    const threadMsgHolderOuter = document.getElementById('threadMessagesHolder');
    threadMsgHolderOuter.insertAdjacentHTML('beforeend', '<UL id="message-UL"> </UL>');// the list where the actual messages are stored

    // socket io is used to send and recieve messages only!
    socket.on('connect', () => {
    });


    const chatTypeBoxDiv = document.createElement('div');
    chatTypeBoxDiv.id = 'chatTypeDiv';
    chatTypeBoxDiv.className = 'chatTypeDiv'
    chatTypeBoxDiv.style.display = 'none';
    document.body.appendChild(chatTypeBoxDiv);
    
    chatTypeBoxDiv.style.alignItems = 'stretch';
    chatTypeBoxDiv.innerHTML = `
    <button type="submit" id="send-button" class="send-button">Send</button>`;

    {
        /*********************************************************/
        /* REPLY DIV */
        const replyDiv = document.createElement('div');
        replyDiv.id = 'replyMsgDiv';
        replyDiv.style.display = 'none'
        replyDiv.style.position = 'fixed';
        replyDiv.style.border = 'var(--stdBorder)';
        replyDiv.style.zIndex = '-1';
        replyDiv.style.height = '40px';
        replyDiv.style.boxShadow = 'var(--stdShadow)';
        replyDiv.style.pointerEvents = 'none';    
        replyDiv.style.backgroundColor = 'var(--backgroundColor)';

        function updateReplyDivPosition() {
            const rect = chatTypeBoxDiv.getBoundingClientRect();
            replyDiv.style.position = 'fixed';
            replyDiv.style.left = `${rect.left - 20}px`;
            replyDiv.style.top = `${rect.top - 19}px`;
            replyDiv.style.width = `${rect.left + 55}px`;
            replyDiv.style.zIndex = '0';
        }

        
        // change with the parent holder & window resize
        const observer = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                if (mutation.attributeName === 'style') {
                    updateReplyDivPosition();
                }
            }
        });
        observer.observe(chatTypeBoxDiv, { attributes: true });
        window.addEventListener('resize', updateReplyDivPosition);    

        threadMsgHolderOuter.appendChild(replyDiv);
    }


    let msgHolder = document.createElement('chat-message-holder');
    if (msgHolder == undefined) {
        msgHolder = document.createElement('div');
    } else {
        msgHolder.innerHTML = '';
    }

    const MAX_MESSAGE_LENGTH = 4096;

    msgHolder.contentEditable = true;
    msgHolder.id = 'chat-message-holder'
    msgHolder.className = 'chat-message-holder';
    msgHolder.style.zIndex = '5'
    msgHolder.style.backgroundColor = 'var(--navBarColor)';

    msgHolder.maxlength = MAX_MESSAGE_LENGTH;

    chatTypeBoxDiv.appendChild(msgHolder);

    const sendButton = document.getElementById("send-button");



    // event listeners
    msgHolder.addEventListener('keydown', (event) => {
        const messageUL = document.getElementById('message-UL');
        messageUL.style.marginTop = `-${msgHolder.clientHeight-40}px`
        if (msgHolder.innerText.length > MAX_MESSAGE_LENGTH) {
            msgHolder.innerText = msgHolder.innerText.slice(0, MAX_MESSAGE_LENGTH);
        } else {
            if (event.key == 'Escape') {
                setReplyingTo(null);
                return;
            }
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
                console.log('REPLY: ' , getReplyingTo())
                msgHolder.innerText = '';
            }
            setReplyingTo(null);
        }
    }); 

    
    const threadMessagesHolder = document.getElementById('threadMessagesHolder'); // the main div that holds the open thread
    // create message right click box
    const msgRightClickDiv = document.createElement('div');
    msgRightClickDiv.id = 'message-right-click-box';
    msgRightClickDiv.className = 'message-right-click-box';
    threadMessagesHolder.appendChild(msgRightClickDiv);

    console.log('scroll event added')


            
    const messageUL = document.getElementById('message-UL');
    messageUL.dataset.isLoading = false;

    console.log('scrollHeight:', messageUL.scrollHeight);

    console.log('messageUL is:', messageUL); // <- should not be null or undefined
    let initialScrollTop = messageUL.scrollTop; // Save the current scroll position
    //messageUL.removeEventListener('scroll', () => {}); // remove the old scroll event listener
    messageUL.addEventListener('wheel', async (event) => { // dynamically load chunks on scroll event
        // use the wheel event instead of the scroll event to prevent locking bug
        const deltaY = event.deltaY; // Amount of scroll (positive for down, negative for up)
        // THIS GUARD IS VERY IMPORTANT
        if (stringToBool(messageUL.dataset.isLoading) == true) { return; };

 
        if (Math.abs(messageUL.scrollTop) <= 1) { // the user has scrolled to the top of the message UL
            messageUL.dataset.isLoading = true;
            await loadMsgChunk(window.highestChunkIndex + 1, true)
            await loadMsgChunk(window.highestChunkIndex + 1, true)
            messageUL.dataset.isLoading = false;
        } else 
        // the user has scrolled to the bottom of the message UL
        if (Math.abs(messageUL.scrollHeight - messageUL.scrollTop - messageUL.clientHeight) <= 1) {
            messageUL.dataset.isLoading = true;

            console.log(window.lowestChunkIndex)
            await loadMsgChunk(window.lowestChunkIndex - 1, false)
            await loadMsgChunk(window.lowestChunkIndex - 1, false);
            messageUL.dataset.isLoading = false;
        }
    });
}

async function setCurrentThread(threadID, loadHTML = true, loadMessageChunks=true) {

    window.currentlyReplyingTo = null;

    window.lowestChunkIndex = null;
    window.highestChunkIndex = null;

    let state = {channelId: window.currentChannel.id}; if (window.threadID !=undefined) {state.threadID = window.threadID};
    window.history.pushState(state, '', `/channels/${window.currentChannel.id}/${threadID}`);

    if (window.currentThreadID) {
        socket.off(`#${window.currentThreadID}new-chat-message`);
    }

    socket.on(`#${threadID}new-chat-message`, recieveMessageFromServer)

    socket.on(`#${threadID}delete-chat-message`, deleteChatMessageAtServerRequest)

    socket.on(`ping-recieve`, recievePingFromServer)

    window.currentThreadID = threadID;


    for (const thread of window.currentChannel.threads) {
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

        await loadThreadFromID(getCurrentThreadID(),loadMessageChunks);
    }
}

// don't forget that chunk indicies grow upwards (a chunk index of 0 contains the most recent messages)
// returns the number of messages loaded.
// THE CHUNK WILL NOT BE RELOADED IF IT'S ALREADY BEEN LOADED, RETURNS 0 IF IT DOESNT LOAD ANYTHING
async function loadMsgChunk(chunkIndex, keepScrollPos = true) {
    
    if (chunkIndex < 0) {
        //console.error('Invalid chunk index: ', chunkIndex)
        return 0;
    }
    
    // handle edge case when client first loads a chunk
    if (window.lowestChunkIndex == null || window.highestChunkIndex == null) {
        window.lowestChunkIndex = chunkIndex;
        window.highestChunkIndex = chunkIndex;
    }
    else if (chunkIndex >=  window.lowestChunkIndex && chunkIndex <= window.highestChunkIndex) {
        //console.log('skip');
        return 0; // the chunk has already been loaded, skip
    }

    // get messages
    const res = await getThreadMessageChunkFromServer(window.currentChannel.id, window.currentThreadID, chunkIndex)
    if (res == false) {
        console.error("Failed to get thread messages; bad server response");
    } 
    const threadMessages = res.messages;

    if (threadMessages.length == 0) { // return if the chunk is out of bounds
        isLoading = false;
        //console.log('no messages');

        return threadMessages.length;
    }

    let insertAtBeginning = true;
    if (chunkIndex < window.lowestChunkIndex) {
        insertAtBeginning = false;

        threadMessages.reverse();
    }
    
    //console.log("Loading chunk: ", chunkIndex, window.lowestChunkIndex, window.highestChunkIndex,'iab', insertAtBeginning)

    const messageUL = document.getElementById('message-UL')
    // append messages to message container
    for (let message of threadMessages) {
        const oldScrollHeight = messageUL.scrollHeight;
        const oldScrollTop = messageUL.scrollTop;
        
        addMessageToMessageHolder
        (
            message.content, message.date,
            {id: message.ownerID, username: message.ownerUsername, hasProfilePicture: message.ownerHasProfilePicture},
            message.id,
            insertAtBeginning,
            message.isReplyTo
        );
        
        if (keepScrollPos) {
            messageUL.scrollTop = oldScrollTop;
            //Adjust scroll so it looks like nothing jumped
            const newScrollHeight = messageUL.scrollHeight;
            messageUL.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        }
    }

    window.lowestChunkIndex = Math.min(chunkIndex, window.lowestChunkIndex);
    window.highestChunkIndex = Math.max(chunkIndex, window.highestChunkIndex);

    return threadMessages.length;
}
async function goToMessage(messageID) {
    try {
        const msgUL = document.getElementById('message-UL')
        msgUL.dataset.isLoading = true;
        // unfortunately as a result of the way that this app works you can't just skip to a chunk, so it's faster to just delete them all
        while (msgUL.firstChild) { // clear all messages
            msgUL.removeChild(msgUL.firstChild);
        }


        window.lowestChunkIndex = null;
        window.highestChunkIndex = null;

        const loadedChunkCount = (window.highestChunkIndex - window.lowestChunkIndex)+1;
        const totalChunkCount = Math.ceil((window.currentThread.messageCount) / (window.messageChunkSize));
        const targetChunk = totalChunkCount - Math.ceil((messageID) / window.messageChunkSize);
        console.log('tmp; ', totalChunkCount- Math.ceil((messageID) / window.messageChunkSize));


        const l = await loadMsgChunk(targetChunk);
        // load neighboring chunks to prevent scrolling issues
        await loadMsgChunk(targetChunk-1);
        await loadMsgChunk(targetChunk+1);


        const elemIdx = (messageID %  window.messageChunkSize);
        //const elemIdx = ((totalChunkCount)-(window.highestChunkIndex - window.lowestChunkIndex))*window.messageChunkSize;
        //clamp(messageID - ((totalChunkCount)-(window.highestChunkIndex - window.lowestChunkIndex))*window.messageChunkSize, 0, 99999999999999999);
        console.log(
            'msg id:', messageID,
            '\nmsg count:', window.currentThread.messageCount, 
            'elem idx:', elemIdx,
            'target chunk:', targetChunk, 
            'total chunk count:', totalChunkCount,
            'loaded chunk count:', loadedChunkCount,
            '\nhighest chunk index: ', window.highestChunkIndex,
            'lowest chunk index: ', window.lowestChunkIndex
        );


        setTimeout(function () {
            for (let elem of msgUL.children) {
                if (Number(elem.dataset.messageID) == messageID) {
                    elem.scrollIntoView();
                    break;
                }
            }
            msgUL.dataset.isLoading = false;
        }, 10);
        
        
    } catch (err) {
        console.error("Failed to load message from ID: ", err)
    }
}

//export default {getCurrentThread, getThreadMessagesFromServer, loadThreadByID}