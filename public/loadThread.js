async function getThreadMessagesFromServer(threadID) {
    return (async () => {
    try {
        const res = await fetch('/api-get-messages-from-thread', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ threadID })
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


function getCurrentThreadID() {
    return window.currentThreadID;
}

function addMessageToMessageHolder(message) {
    const msgUL = document.getElementById('message-UL');

    msgUL.innerHTML = '';
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
    const threadMessages = await getThreadMessagesFromServer(threadID);

    console.log('Loaded messages of threadID: ', threadID);
    console.log('Messages: ', threadMessages);

    for (let message of threadMessages) {
        addMessageToMessageHolder(message)
    }

    return threadMessages;
}

async function setCurrentThreadFromThreadHandleButton() {
    const btn = event.currentTarget; // The clicked <li> element
    await setCurrentThread(btn.dataset.threadID);
}

function initMessageHolder() {
    const messageHolder = document.getElementById('thread-message-holder');
    //messageHolder.
}

function setCurrentThread(threadID) {
    for (const thread in window.currentChannel.threads) {
        if (thread.id == threadID) {
            window.currentThread = thread;
            break;
        }
    }


    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none'; // make visible
    const msgHolder = document.getElementById('threadMessagesHolder');
    msgHolder.style.display = 'inline';     // make message holder invis

    msgHolder.innerHTML = ''; // clear existing messages

    msgHolder.innerHTML += '<UL id="message-UL"> </UL>' // the list where the actual messages are stored
    loadThreadFromID(getCurrentThreadID());

    
}

//export default {getCurrentThread, getThreadMessagesFromServer, loadThreadByID}