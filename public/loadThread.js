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

    addMessageToMessageHolder(message);
}


function getCurrentThreadID() {
    return window.currentThreadID;
}

function addMessageToMessageHolder(message, messageDate, messageOwnerID) {
    const msgUL = document.getElementById('message-UL');

    //msgUL.innerHTML = '';
    msgUL.innerHTML += `<li> ${message} </li>`
    
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
        addMessageToMessageHolder(message.content, message.date, message.ownerID)
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

    chatTypeBoxDiv.addEventListener('keydown', (key)=> {
        if (key == 'enter') {
            sendButton.click();
        }
    })
    sendButton.addEventListener('click', () => {
        sendMessage(msgHolder.value)
        msgHolder.value = '';
    });

}

function setCurrentThread(threadID) {
    window.currentThreadID = threadID;

    for (const thread in window.currentChannel.threads) {
        if (thread.id == threadID) {
            window.currentThread = thread;
            break;
        }
    }


    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';  // make message holder invis
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