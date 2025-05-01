function getChannelFromID(id) {
    for (let channel of window.channels) {
        if (channel.id == id) {
            return channel;
        }
    }
    return null;
}

function loadPage() {
    // Load all dynamic variables from window.locals

    window.user = undefined;
    if (locals.user) {
        window.user = locals.user;
        if (window.user.mutedChannelIDs == undefined) {
            window.user.mutedChannelIDs = [];
        }
    }
    
    if (window.user != undefined && window.user.unreadPings == undefined) {
        window.user.unreadPings = []; // temp
    }

    window.maxImgSize = locals.maxImgSize;
    window.loggedIn = locals.loggedIn;
    window.messageChunkSize = locals.messageChunkSize;

    window.lowestChunkIndex = null;
    window.highestChunkIndex = null;

    let _loadChannel = undefined;
    if (locals.loadChannel !== undefined) {
        _loadChannel = locals.loadChannel - 1;
    }

    let _loadThread = undefined;
    if (locals.loadThread !== undefined) {
        _loadThread = locals.loadThread;
    }

    let _loadMessage = undefined;
    if (locals.loadMessage !== undefined) {
        _loadMessage = locals.loadMessage;
    }

    loadNavbar();

    // channels come pre-serialized in locals
    window.channels = locals.channels || [];

    loadChannelBar();
    createStagingThreadAndThreadInfoHolder();
    initMessageHolder();


    if (_loadChannel !== undefined || _loadChannel < 0) {
        _loadChannel=0;

        let loadHTML = true;
        if (_loadThread) {
            loadHTML = false;
        }
        (async () => {
            await setCurrentChannel(window.channels[_loadChannel], loadHTML);

            if (_loadThread !== undefined && _loadThread >= 0 && _loadThread != null) {
                if (_loadMessage !== undefined) {
                    await setCurrentThreadID(_loadThread, true, false);
                    await goToMessage(_loadMessage);
                } else {
                    await setCurrentThreadID(_loadThread);
                }
            }
        })();
    } else if (_loadThread === undefined) {
        setCurrentChannel(window.channels[0]);
    }
}

// 
window.onload = function() {
    loadPage();
    loadCopyright(true);
    
};

socket.on(`ping-recieve`, recievePingFromServer);

window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state && state.channelId) {
        state.channelId = state.channelId - 1;
        if (state.threadId) {
            setCurrentChannel(window.channels[state.channelId], false);
            setCurrentThread(state.threadId);
        } else {
            setCurrentChannel(window.channels[state.channelId]);
        }
    } else {
        // fallback if no state is present
        setCurrentChannel(window.channels[0]);
    }
});
