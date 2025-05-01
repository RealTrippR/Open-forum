
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

function stringToBool(str) {
    return String(str).toLowerCase() === "true";
}

async function disconnectSocketChatEvents() {
    if (window.currentThreadID != undefined) { // remove previous event listeners
        socket.off(`#${window.currentThreadID}new-chat-message`);

        socket.off(`#${window.currentThreadID}delete-chat-message`, deleteChatMessageAtServerRequest);
        console.log(`#${window.currentThreadID}new-chat-message`)
    }

}

function clearMsgUL() {
    const msgUL = document.getElementById('message-UL');
    msgUL.querySelectorAll('li').forEach(el => el.remove());
    // for (let child of msgUL.children) {
    //     if (child.dataset.messageID != undefined) {
    //         child.remove(); // only delete messages
    //     }
    // }
}

function checkIntersection(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    const overlap = !(rect1.right < rect2.left || 
        rect1.left > rect2.right || 
        rect1.bottom < rect2.top || 
        rect1.top > rect2.bottom)

    return overlap
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
        replyMsgDiv.innerHTML = ''; // clear old content

        const img = document.createElement('img');
        img.src = `${window.baseURL}/icons/ReplyArrow.png`;
        img.width = 30;
        img.height = 30;
        img.id = 'replyIcon';
        img.style.position = 'absolute';
        img.style.margin = '0';
        img.style.padding = '0';
        img.style.left = '-4px';
        img.style.top = '3px';
        
        const p = document.createElement('p');
        p.className = 'stdText';
        p.style.fontSize = '11px';
        p.style.marginLeft = '22px';
        p.style.textAlign = 'left';
        p.textContent = ''; // Or set some text if needed
        
        replyMsgDiv.appendChild(img);
        replyMsgDiv.appendChild(p);
        

        let elemText = "";

        // Include direct text inside the span (not children) to combine mentions and the actual msg content into 1 string
        for (let node of msgElement.querySelectorAll('.msg-text')) {
            if (!node.classList.contains('msg-text')) continue;  // only include direct children
            
            for (let child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    elemText += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "SPAN" && child.className == 'stdText') {
                    elemText += child.innerText;
                }
            }
        }
      
        //return combinedText;
        if (elemText.length > 20) {
            elemText = elemText.slice(0,20) + `...`
        }

        replyMsgDiv.children[1].innerText = `Replying To: ${msgElement.querySelector('.msg-username').innerHTML}` + `  | ` + `${elemText}`
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
        res = await fetch(`${window.baseURL}/api-get-message-chunk-from-thread`, {
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
        const res = await fetch(`${window.baseURL}/api-get-messages-from-thread`, {
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

function sendMessage(message, imgData = null, imgURL = null) {
    message = message.replace(/\n+$/, ''); // get rid of any trailing newlines

    const msgUL = document.getElementById('message-UL');
       
    // Get only the children that have a dataset.messageID
    const validChildren = Array.from(msgUL.children).filter(child => child.dataset.messageID !== undefined);

    const lastElem = validChildren[validChildren.length-1];
    let lastID;
    if (lastElem != undefined) {
        lastID = Number(lastElem.dataset.messageID);
    } else {
        lastID = 0;
    }
    if (lastID == null || lastID == undefined) {
        lastID = 0;
    }

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
        pingUser(username.slice(1), message, lastID+1);
    }


    console.log('message:',{message: message, channelID: window.currentChannel.id, threadID: window.currentThreadID, isReplyTo: getReplyingTo(), imgData: imgData})
    socket.emit('send-message', {message: message, channelID: window.currentChannel.id, threadID: window.currentThreadID, isReplyTo: getReplyingTo(), imgData: imgData});

    const now = new Date();
    const datetime = now.toISOString()


    addMessageToMessageHolder(message, datetime, window.user, lastID+1, false, getReplyingTo(), imgURL);

    const messageUL = document.getElementById('message-UL');
    
    const msgHolder = document.getElementById('chat-message-holder');

    messageUL.style.marginTop = `-${0}px`
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

    const msgUL = document.getElementById('message-UL');
    
    // Get only the children that have a dataset.messageID
    const validChildren = Array.from(msgUL.children).filter(child => child.dataset.messageID !== undefined);

    const lastElem = validChildren[validChildren.length-1];
    let lastID;
    if (lastElem != undefined) {
        lastID = Number(lastElem.dataset.messageID);
    } else {
        lastID = 0;
    }

    let imgURL = null;
    if (req.hasImg == true) {
        imgURL = `/msgImgAttachments/${window.currentChannel.id}/${getCurrentThreadID()}/${lastID+1}.${req.imgExt}`
    }
    addMessageToMessageHolder(req.message, datetime, req.userInfo, lastID+1, false, req.isReplyTo, imgURL);
}


function pingUser(username, message, messageID) {
    message = message.slice(0,32);
    socket.emit('ping-user', {targetUsername: username, channelID: window.currentChannel.id, threadID: window.currentThreadID, messageID: messageID, messageSlice: message});
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

function addMessageToMessageHolder(message, messageDateTime, messageOwner, messageID, insertToBeginning=false, isReplyTo = null, imgURL = null) {
    if (message == undefined) {console.error("message is required as an argument")};
    if (messageDateTime == undefined) {console.error("messageDateTime is required as an argument")}
    if (messageOwner == undefined) {console.error("messageOwner is required as an argument")}
    if (messageID == undefined) {console.error("messageID is required as an argument")}


    const relativeDate = getRelativeTimeStr(messageDateTime);
    const msgUL = document.getElementById('message-UL');
    
    
    // load PFP
    let pfpImgSrc = `${window.baseURL}/icons/default-pfp.png`;

    if (messageOwner.hasProfilePicture == true) {
        pfpImgSrc = `${window.baseURL}/profile-pictures/${messageOwner.username}.jpg`
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
        profileLink.href = `${window.baseURL}/users/${messageOwner.username}`;
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

        let img = undefined;
        if (imgURL != null) {

            // Staging Image
            img = document.createElement('img');
            img.style.width = 'auto'; 
            img.height = 250;
            img.style.border = 'var(--stdBorder)';
            img.style.boxShadow = 'var(--stdMinorShadow)';
            img.style.display = 'block'; // prevents margin collapse with wrapper
            img.src = imgURL;
            img.style.display = 'block';
            img.style.maxWidth = '600px'; 
        }

        li.appendChild(profileDiv);
        li.appendChild(usernameSpan);
        li.appendChild(dateSpan);
        if (img) li.appendChild(img);
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
 
            event.stopPropagation()

            const msgRightclickDiv = document.getElementById('message-right-click-box');
            msgRightclickDiv.innerHTML = ``;
            
            msgRightclickDiv.associatedMessageElement = event.currentTarget; // note that event.currentTarget and event.target ARE NOT the same thing 
            msgRightclickDiv.dataset.messageID = li.dataset.messageID;

            msgRightclickDiv.style.display = 'inline';
                // Position the right-click menu at the mouse coordinates

            const rect = msgUL.getBoundingClientRect();

            const y = event.clientY - rect.top;
            const x = event.clientX - rect.left;
        
            msgRightclickDiv.style.left = `${x}px`;
            msgRightclickDiv.style.top = `${y}px`;
            msgRightclickDiv.style.width = `100px`;
            msgRightclickDiv.style.height = `auto`;
            msgRightclickDiv.style.padding = '0px';

            const copyMsgLinkButton = document.createElement('div'); copyMsgLinkButton.className = 'message-right-click-button'
            const replyToMsgButton = document.createElement('div'); replyToMsgButton.className = 'message-right-click-button'
            const deleteMsgButton = document.createElement('div'); deleteMsgButton.className = 'message-right-click-button'

            msgRightclickDiv.appendChild(copyMsgLinkButton);

            
            copyMsgLinkButton.innerHTML += `<p> Copy Link </p>`;
            copyMsgLinkButton.addEventListener('click', () => {
                //const rootURL = `${window.location.origin}/${window.baseURL}`;
                const msgURL = `${window.baseURL}/channels/${window.currentChannel.id}/${window.currentThreadID}/messages/${msgRightclickDiv.dataset.messageID}`;
                // copy URL to OS clipboard
                navigator.clipboard.writeText(msgURL);
            });

            if (window.user != undefined) {
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

                if (window.loggedIn == true) { 
                    msgRightclickDiv.appendChild(replyToMsgButton);
                }
                if (li.dataset.ownerUsername == window.user.username) {
                    msgRightclickDiv.appendChild(deleteMsgButton);
                }
            }



            { // test intersection with chat type div, if so move it up a bit
                const chatTypeDiv = document.getElementById('chatTypeDiv');

                if (checkIntersection(chatTypeDiv, msgRightclickDiv) == true) {
                    msgRightclickDiv.style.marginTop = `${-msgRightclickDiv.getBoundingClientRect().height}px`;
                } else {
                    // double check to fix alternating issue
                    msgRightclickDiv.style.marginTop = `0px`
                    if (checkIntersection(chatTypeDiv, msgRightclickDiv) == true) {
                        msgRightclickDiv.style.marginTop = `${-msgRightclickDiv.getBoundingClientRect().height}px`;
                    }
                }
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
    
    threadID = Number(threadID);
    if (window.user != undefined) {
        removeUnreadPingsFromThread(window.currentChannel.id,threadID)
    }

    clearMsgUL();
      
    window.currentThreadID = threadID;

    let currentThread = undefined;
    for (let thread of window.currentChannel.threads) {
        if (thread == undefined || thread.id == undefined) {
            console.warn("Invalid thread handle: ", thread);
            continue;
        }
        if (thread.id == threadID) {
            currentThread = thread;
            break;
        }
    }

    let channelNameHeader = document.getElementById('channelNameHeader');
    if (channelNameHeader.children.length == 0) {
        createChannelNameHeader();
    }
    if (channelNameHeader && channelNameHeader.children.length == 2) {
        channelNameHeader.children[0].innerText = currentThread.name;
        channelNameHeader.children[1].innerText = currentThread.description;
    }



    const chatTypeBoxDiv = document.getElementById('chatTypeDiv');

    if (currentThread.lockedToAdmins == true && window.user !=undefined && window.user.isAdmin != true) {
        chatTypeBoxDiv.style.display = 'none';
    } else {
        chatTypeBoxDiv.style.display = 'flex';
    }

    // user is logged out and can't send messages
    if (window.user == undefined) {
        const threadmessagesHolder = document.getElementById('threadMessagesHolder');
        threadmessagesHolder.style.height = 'calc(100%-100px)'
        chatTypeBoxDiv.style.display = 'none';

        const msgUL = document.getElementById('message-UL')
        msgUL.style.height = '100%'
        msgUL.style.maxHeight = '100%' 
    }

    // hide the threads holder.
    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';

    if (loadFirstTwoChunks == true) {
        
        await loadMsgChunk(0);
        await loadMsgChunk(1);
    }
}

async function setCurrentThreadFromThreadHandleButton() {
    const btn = event.currentTarget; // The clicked <li> element
    await setCurrentThreadID(btn.dataset.threadID);
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


    const msgContentHolderDivOuter = document.createElement('div');
    msgContentHolderDivOuter.style.display = 'flex';
    msgContentHolderDivOuter.style.flexDirection = 'column';
    msgContentHolderDivOuter.style.width = '100%';
    

    if (window.user != undefined) {
        // invis file uploader
        const HTML = '<input type="file" id="upload-img-attachment" class = "invisInput">';
        document.body.insertAdjacentHTML("beforeend", HTML);
        /************************************************************/
        /* UPLOAD ATTACHMENTS */
        const attachImgToMessageButton = document.createElement('button');
        attachImgToMessageButton.style.marginTop = '3px';
        attachImgToMessageButton.style.marginLeft = '3px';
        attachImgToMessageButton.style.width = '34px';
        attachImgToMessageButton.style.height = '34px';
        attachImgToMessageButton.style.padding = '0';
        attachImgToMessageButton.style.background = 'var(--navBarColor)'
        attachImgToMessageButton.style.border = 'var(--stdBorder)';
        attachImgToMessageButton.style.boxShadow = 'var(--stdMinorShadow)';
        attachImgToMessageButton.style.cursor = 'pointer';
        attachImgToMessageButton.style.bottom = '0px'
        attachImgToMessageButton.innerHTML += `<img width=28 height=28 src="${window.baseURL}/icons/photo.png">`
        chatTypeBoxDiv.appendChild(attachImgToMessageButton);

        const invisFileUploader = document.getElementById('upload-img-attachment');

        const imgWrapper = document.createElement('div');
        imgWrapper.id = 'stagingImgWrapper'
        imgWrapper.style.position = 'relative';
        imgWrapper.style.margin = '5px';
        imgWrapper.style.display = 'none'

        // Staging Image
        const stagingImg = document.createElement('img');
        stagingImg.id = 'stagingImg';
        stagingImg.style.width = 'auto'; 
        stagingImg.height = 250;
        stagingImg.style.maxWidth = '600px'; 
        stagingImg.style.border = 'var(--stdBorder)';
        stagingImg.style.boxShadow = 'var(--stdMinorShadow)';
        stagingImg.style.display = 'block'; // prevents margin collapse with wrapper
        imgWrapper.appendChild(stagingImg);

        // Staging Img Remove Button
        const removeStagingImgButton = document.createElement('button');
        removeStagingImgButton.textContent = '×'; // optional label
        removeStagingImgButton.style.position = 'absolute';
        removeStagingImgButton.style.top = '5px';
        removeStagingImgButton.style.left = '5px';
        removeStagingImgButton.style.width = '20px';
        removeStagingImgButton.style.height = '20px';
        removeStagingImgButton.style.background = 'var(--navBarColor)';
        removeStagingImgButton.style.border = 'var(--stdBorder)';
        removeStagingImgButton.style.boxShadow = 'var(--stdMinorShadow)';
        removeStagingImgButton.style.cursor = 'pointer';
        removeStagingImgButton.style.zIndex = '10000'
        imgWrapper.appendChild(removeStagingImgButton);

        msgContentHolderDivOuter.appendChild(imgWrapper)
        // Optional: Hook up the remove logic
        removeStagingImgButton.addEventListener('click', () => {
            imgWrapper.style.display = 'none'
        });

                    
        attachImgToMessageButton.addEventListener('click', () => {
            invisFileUploader.click();

            invisFileUploader.addEventListener('change', () => {
                const file = event.target.files[0];
                if (!file) {return;}

                const validType = file.name.toLowerCase().endsWith('.gif') || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.png')  || file.name.toLowerCase().endsWith('.jpeg');
                
                
                if (file && validType && file.size <= window.maxImgSize) {
                    imgWrapper.style.display = 'inline-block'
                    stagingImg.src = URL.createObjectURL(file);
                } else {
                    alert(`Invalid image, must be a GIF, PNG or JPEG and less than ${window.maxImgSize/1000000} MB in size.`)
                    event.target.value = '';
                }   
            });
        });
    }

    chatTypeBoxDiv.appendChild(msgContentHolderDivOuter)

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

    if (window.user != undefined) {
        const MAX_MESSAGE_LENGTH = 4096;

        msgHolder.contentEditable = true;
        msgHolder.id = 'chat-message-holder'
        msgHolder.className = 'chat-message-holder';
        msgHolder.style.zIndex = '5'
        msgHolder.style.marginLeft = '5px'
        msgHolder.style.backgroundColor = 'var(--navBarColor)';

        msgHolder.maxlength = MAX_MESSAGE_LENGTH;

        msgContentHolderDivOuter.appendChild(msgHolder);

        const sendButton = document.getElementById("send-button");

        // event listeners
        msgHolder.addEventListener('keydown', (event) => {
            const messageUL = document.getElementById('message-UL');
            messageUL.style.marginTop = `-${msgHolder.clientHeight-35}px`
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

            if (msgHolder.innerText.length != 0 || stagingImgWrapper.style.display != 'none') { // cannot send a blank message, unless it has an image

                const stagingImgWrapper = document.getElementById('stagingImgWrapper');
                
                const invisFileUploader = document.getElementById('upload-img-attachment');

                const stagingImgSrc = document.getElementById('stagingImg').src;

                
                if (msgHolder.innerText.length > MAX_MESSAGE_LENGTH) {
                    msgHolder.innerText = msgHolder.innerText.slice(0, MAX_MESSAGE_LENGTH)
                } else {

                    let imgData = null;
                    if (stagingImgWrapper.style.display != 'none') {
                        const file = invisFileUploader.files[0];
                
                        if (file) {
                            const formData = new FormData();
                            formData.append('imgAttachment', file);  // Append the file to FormData (for server-side)
                
                            // Convert the image file to a Base64 string
                            const reader = new FileReader();
                            reader.onload = function(event) {
                                imgData = event.target.result; // Base64 string of the image            
                                sendMessage(msgHolder.innerText, imgData, stagingImgSrc);
                                msgHolder.innerText = '';
                            };

                            // trigger the file reading process (to fire onload event)
                            reader.readAsDataURL(file);
                        }

                        stagingImgWrapper.style.display = 'none';
                    } else {

                        sendMessage(msgHolder.innerText, imgData)
                        msgHolder.innerText = '';
                    }
                }
                setReplyingTo(null);
            }
        }); 
    }
    
    const threadMessagesHolder = document.getElementById('threadMessagesHolder'); // the main div that holds the open thread
                
    const messageUL = document.getElementById('message-UL');
    messageUL.dataset.isLoading = false;

    // create message right click box
    const msgRightClickDiv = document.createElement('div');
    msgRightClickDiv.id = 'message-right-click-box';
    msgRightClickDiv.className = 'message-right-click-box';
    threadMessagesHolder.appendChild(msgRightClickDiv);

        
    let lastscrolltop = messageUL.scrollTop;
    function syncScroll() {
          // Calculate the difference in scroll position
    const scrollDifference =lastscrolltop -  messageUL.scrollTop;

    // Move the right-click div in the opposite direction of the scroll
    msgRightClickDiv.style.top = `${parseInt(msgRightClickDiv.style.top || 0) + scrollDifference}px`;
        lastscrolltop=messageUL.scrollTop;
        // Continuously call syncScroll for the next frame
        requestAnimationFrame(syncScroll);
    }
    
    requestAnimationFrame(syncScroll);


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

            await loadMsgChunk(window.lowestChunkIndex - 1, false)
            await loadMsgChunk(window.lowestChunkIndex - 1, false);
            messageUL.dataset.isLoading = false;
        }
        
    });
}

async function setCurrentThreadID(threadID, loadHTML = true, loadFirstTwoChunks=true) {
    
    disconnectSocketChatEvents();

    if (threadID == undefined) {
        window.currentThreadID = undefined;
        return;
    }

  
    threadID = Number(threadID);
    if (window.user != undefined) {
        removeUnreadPingsFromThread(window.currentChannel.id, threadID);
    }
    
    window.currentlyReplyingTo = null;

    window.lowestChunkIndex = null;
    window.highestChunkIndex = null;

    let state = {channelId: window.currentChannel.id}; if (window.threadID !=undefined) {state.threadID = window.threadID};
    window.history.pushState(state, '', `${window.baseURL}/channels/${window.currentChannel.id}/${threadID}`);


    ////////////////////////////////////////////////////////////////////////

    window.currentThreadID = threadID;

    socket.on(`#${threadID}new-chat-message`, recieveMessageFromServer)

    socket.on(`#${threadID}delete-chat-message`, deleteChatMessageAtServerRequest)

    for (const thread of window.currentChannel.threads) {
        if (thread == undefined || thread.id == undefined) {
            console.warn("Invalid thread handle: ", thread);
            continue;
        }
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

        await loadThreadFromID(getCurrentThreadID(), loadFirstTwoChunks);
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

    console.log('loading idx: ', chunkIndex)
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
        
        let imgURL = null;
        if (message.hasImg == true) {
            imgURL = `${window.baseURL}/msgImgAttachments/${window.currentChannel.id}/${getCurrentThreadID()}/${message.id}.${message.imgExt}`
        }

        addMessageToMessageHolder
        (
            message.content, message.date,
            {id: message.ownerID, username: message.ownerUsername, hasProfilePicture: message.ownerHasProfilePicture},
            message.id,
            insertAtBeginning,
            message.isReplyTo,
            imgURL
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
        clearMsgUL()
        // while (msgUL.firstChild) { // clear all messages
        //     msgUL.removeChild(msgUL.firstChild);
        // }


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