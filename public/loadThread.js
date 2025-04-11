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


function getCurrentThread() {
    return window.currentThreadID;
}

// opens the thread by ID
// returns the thread messages
async function loadThreadByID(threadID) {
    window.currentThreadID = threadID;

    
    // hide the threads holder.
    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.style.display = 'none';

    // load the messages
    const threadMessages = await getThreadMessagesFromServer(threadID);

    console.log('Loaded messages of threadID: ', threadID);
    console.log('Messages: ', threadMessages);


    // 
    return threadMessages;
}

async function loadThreadFromThreadHandleButton() {
    const btn = event.currentTarget; // The clicked <li> element
    await loadThreadByID(btn.dataset.threadID);
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

    loadThread(getCurrentThread());
}

//export default {getCurrentThread, getThreadMessagesFromServer, loadThreadByID}