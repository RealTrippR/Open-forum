import { type } from 'os';
import dbUtils from '../Server/databaseUtils.js'

let dbPool;
let io;

async function init(_dbPool, _io) {
    dbPool = _dbPool;
    io = _io;

    // io.set('transports', [
    //     'websocket'
    //   , 'flashsocket'
    //   , 'htmlfile'
    //   , 'xhr-polling'
    //   , 'jsonp-polling'
    // ]);
    
    let openSockets = [];
    /******************************************************** */
    /* SOCKET IO */
    
    io.on('connection', (socket) => {
        //console.log('user connected!');
        if (socket.request.user && socket.request.user.username) {
            openSockets.push({ username: socket.request.user.username, socketID: socket.id });
        }
        
        socket.on('disconnect', () => {
            openSockets = openSockets.filter(s => s.socketID !== socket.id);
        });
        
        socket.on('send-message', async (req) => {
            try {
                if (socket.request.user==undefined) {
                    return; // user is not logged in
                }
                if (typeof(req.message) != "string") {return; /*invalid request*/}
                if (typeof(req.channelID) != "number") {return; /*invalid request*/}
                if (typeof(req.threadID) != "number") {return; /*invalid request*/}

                if (req.message.length == 0 && (req.imgData==undefined || req.imgData == null)) {
                    return; // cannot send a blank message, unless it has an image attached to it
                }
                
                if (req.imgData == undefined || req.imgData == null) {
                    req.imgData = null;
                }

                const privateUser = await dbUtils.getUserByUsername(dbPool, socket.request.user.username);
                const reqUserID = privateUser.id;
                
                await dbUtils.addMessageToThread(dbPool, req.channelID, req.threadID, reqUserID, req.message, req.isReplyTo, req.imgData);
        
                // if it has an image create it
                


                const publicUserInfo = await dbUtils.getPublicUserInfo(dbPool, reqUserID);

                if (publicUserInfo == undefined) {return;}
                let imgExt = undefined;
                if (req.imgData != null) {
                    // Extract the image format from the data URI
                    const match = req.imgData.match(/^data:image\/(png|jpg|jpeg|gif);base64,/);
                    imgExt = match ? match[1] : 'png';  // Default to 'png' if not found
                }

                socket.broadcast.emit(`#${req.threadID}new-chat-message`, {
                    message: req.message,
                    userInfo: publicUserInfo,
                    isReplyTo: req.isReplyTo,
                    channelID: req.channelID,
                    threadID: req.threadID,
                    hasImg: !(req.imgData == undefined),
                    imgExt: imgExt
                });

            } catch (err) {
                console.error("Error handling send-message:", err);
                socket.emit('error', 'Failed to send message.');
            }
        })

        socket.on('delete-message', async (req) => {
            try {
                if (socket.request.user==undefined) {
                    return; // user is not logged in
                }
                if (req.messageID==undefined) {
                    return; // invalid message
                }
                const privateUser = await dbUtils.getUserByUsername(dbPool, socket.request.user.username);
                const reqUserID = privateUser.id;

                await dbUtils.deleteMessageFromThread(dbPool, req.channelID, req.threadID, req.messageID, reqUserID);
        
                socket.broadcast.emit(`#${req.threadID}delete-chat-message`, {
                    messageID: req.messageID,
                });
            } catch (err) {
                console.error("Error deleting message:", err);
                socket.emit('error', 'Failed to delete message.');
            }
        });


        socket.on('ping-user', async (req) => {
            try {
                const socketInfo = openSockets.find(s => s.username === req.targetUsername);

                const pingObj = {from: socket.request.user.username, channelID: req.channelID, threadID: req.threadID, messageID: req.messageID}
                const targPrivUser = await dbUtils.getUserByUsername(dbPool,  req.targetUsername)
                if (socketInfo) {
                    // validate request
                    if (socket.request.user == undefined) {
                        return; // the user isn't logged in
                    }
                    if (typeof(socket.request.user.username) != "string") {return}
                    if (typeof(req.channelID) != "number") {return}
                    if (typeof(req.threadID) != "number") {return}
                    if (typeof(req.messageSlice) != "string") {return}


                    /////////////
                    const targetSocket = io.sockets.sockets.get(socketInfo.socketID);
                    const tmp = await dbUtils.getThreadFromID(dbPool, req.channelID, req.threadID);
                    const threadName = tmp.name;
                    let messageSlice = req.messageSlice;
                    messageSlice = messageSlice.slice(0,32);
                    
                    if (targetSocket) {
                        if (req.isReplyTo == undefined) {
                            req.isReplyTo == null;
                        } 
                        targetSocket.emit(`ping-recieve`, { from: socket.request.user.username, channelID: req.channelID, threadID: req.threadID, threadName: threadName, messageID: req.messageID, req: req.isReplyTo, messageSlice: req.messageSlice });
                        dbUtils.addUnreadPingToUser(dbPool, targPrivUser.id, pingObj); // add it anyways in case they don't open it
                    }
                } else {
                    // the user is not logged in, store in it in their unread pings
                    dbUtils.addUnreadPingToUser(dbPool, targPrivUser.id, pingObj);
                }
            } catch (err) {
                console.error("Error pinging user:", err);
                //socket.emit('error', 'Failed to ping user.');
            }
        });
    });
}

export default {init}