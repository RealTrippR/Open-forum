// notification manager



webPageOpen = true;



async function getMutedChannelsFromServer() {
    
    try {
        res = await fetch(`${window.baseURL}/api-get-user-muted-channels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!res.ok) {
            throw new Error('Failed to get muted channels: ',res);
        }
        const json = await res.json();
        if (json.mutedChannels == undefined) {json.mutedChannels = []};
        return json.mutedChannels;
    } catch (err) {
        console.error('Fetch error:', err, res);
        return false;
    }
}

async function updateMutedChannel(channelID, muted) {

    if (muted == true) {
        if (!window.user.mutedChannelIDs.includes(channelID)) {
            window.user.mutedChannelIDs.push(channelID);
        }
    } else {
        window.user.mutedChannelIDs = window.user.mutedChannelIDs.filter(id => id !== channelID);
    }

    if (channelID == undefined) {throw new Error("Cannot updated muted channel, channelID is undefined")}
    if (channelID == undefined) {throw new Error("Cannot updated muted channel, muted is undefined")}

    try {
        fetch(`${window.baseURL}/api-update-user-muted-channel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelID, muted})
        });
    } catch {}
}

/* a ping struct is like so:
{
    from: <username>
    channelID: <number>
    threadID: <number>
    messageSlice: <string. 32 chars max>
    messageID: <number>
}
*/

function addUnreadPing(pingObj) {
    window.user.unreadPings.push(pingObj);
}

function removeUnreadPingsFromThread(channelID, threadID) {
    // first things first, remove from the channel bar
    const channelBarUL = document.getElementById('channelBarUL');
    for (let li of channelBarUL.querySelectorAll('.channelBarHandleButton')) {    
        if (Number(li.dataset.channelId) === channelID) {
            const notisIconDiv = li.querySelector('.notisIconDiv');
            if (notisIconDiv) {
                notisIconDiv.style.display = 'none';
            }
            break;
        }
    }
    
    const channelThreadsHolder = document.getElementById('channelThreadsHolder');
    // if the threads list is open, remove it from there
    for (let li of channelThreadsHolder.children) {
        if (Number(li.dataset.threadID) == threadID) {
            const notisIcondiv = li.querySelector('.notisIconDiv')
            if (notisIcondiv) {
                notisIcondiv.style.display = 'none';
            }
        }
    }

    const oldSize = window.user.unreadPings.length;
    window.user.unreadPings = window.user.unreadPings.filter((ping) => (ping.channelID == channelID && ping.threadID != threadID));

    if (oldSize != window.user.unreadPings) { // to avoid wasting bandwidth first check if the unreadPings array has changed
        // tell server to remove unread pings
        fetch(`${window.baseURL}/api-remove-unread-pings-of-user-from-thread`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelID, threadID })
        });
    }
}

function attachPingToThread(channelID, threadID, pingObj) {
    // first things first, attach the ping to the channel bar handle
    let channelBarUL = document.getElementById('channelBarUL');

    addUnreadPing(pingObj);

    // it's targeting the current thread, ignore
    if (window.currentChannel.id == channelID && window.getCurrentThreadID() == threadID) {
        return;
    }

    const channelPingCount = (window.user.unreadPings.filter((ping) => (ping.channelID == channelID))).length;

    // attach to the channel bar
    for (let li of channelBarUL.querySelectorAll('.channelBarHandleButton')) {    
        if (Number(li.dataset.channelId) === channelID) {
            let notisIconDiv = li.querySelector('.notisIconDiv');
            if (notisIconDiv) {
                notisIconDiv.style.display = 'block';
                const noticeIconP = notisIconDiv.children[0];
                noticeIconP.textContent = `${channelPingCount}`;
            }
            break; // always break after finding the correct li
        }
    }


    // the thread header holder is open update ping count here
    if (window.currentChannel.id == channelID) {
        const threadHeaderUL = document.getElementById('channelThreadsHolder');

        for (let thh of threadHeaderUL.children) {

            const thhThreadID = Number(thh.dataset.threadID);

            const unreadPingCountForTargetThread = (window.user.unreadPings.filter((ping) => (ping.channelID == window.currentChannel.id && thhThreadID == threadID))).length;
            
            if (unreadPingCountForTargetThread>0) {
                const notisDiv = thh.querySelector('.notisIconDiv');
                notisDiv.style.display = 'block';
                notisDiv.children[0].textContent = `${unreadPingCountForTargetThread}`;
            }
        }
    }
}

function playPingSound() {
    const pingSound = new Audio(`${window.baseURL}/audio/notice.mp3`);
    pingSound.volume = 1;
    pingSound.play();
}

function recievePingFromServer(req) {
    try {
        req.channelID = Number(req.channelID);
        req.threadID = Number(req.threadID);
        const channelID = req.channelID;
        const threadID = req.threadID;
        let pingMuted = false;
        if (window.user != undefined) {
            if (window.user.mutedChannelIDs != undefined) {
                if (window.user.mutedChannelIDs.includes(req.channelID)) {
                    pingMuted = true;
                }
            }
        }

        const pingObj = {from: req.from, channelID: req.channelID, threadID: req.threadID, messageSlice: req.messageSlice, messageID: req.messageID};

        if (!pingMuted) {
            playPingSound();
        }

  

        if (webPageOpen == true) {
            if (!(window.currentChannel.id == channelID && getCurrentThreadID() == threadID)) {
                attachPingToThread(req.channelID, req.threadID, pingObj);

                //  && req.channelID == window.currentChannel.id
                if (req.threadID == getCurrentThreadID()) {
                    // tell server to remove unread pings
                    fetch(`${window.baseURL}/api-remove-unread-pings-of-user-from-thread`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ channelID, threadID })
                        });
                    return; // the thread is currently open, play the sound but don't add it to the channels
                }
            }
            

        } else {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    const notisBody = getChannelFromID(req.channelID).name;
                    const notification = new Notification(`Openforum: ${notisBody} - ${req.threadName}`, {
                        body: req.messageSlice,
                        data: { channelID: req.channelID, threadID: req.threadID, threadName: req.threadName, messageSlice: req.messageSlice },
                    });
                }
            });
            attachPingToThread(req.channelID, req.threadID, pingObj);
        }

    } catch {

    }

}


document.addEventListener("visibilitychange", () => {
    if (document.visibilityState == 'hidden') {       
        webPageOpen = false;
    } else {

        webPageOpen = true;

        // when a user comes page to this page, set the notifications for the current thread (if there is one) as read.
        if (window.currentChannel != undefined && window.currentChannel != null) {
            if (getCurrentThreadID() != undefined && getCurrentThreadID() != null) {
                removeUnreadPingsFromThread(window.currentChannel.id, getCurrentThreadID());
            }
        }
    }
})