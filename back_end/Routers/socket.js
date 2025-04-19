import dbUtils from '../Server/databaseUtils.js'

let dbPool;
let io;

async function init(_dbPool, _io) {
    dbPool = _dbPool;
    io = _io;

    let openSockets = [];
    /******************************************************** */
    /* SOCKET IO */
    
    io.on('connection', (socket) => {
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
                if (req.message.length == 0) {
                    return; // cannot send a blank message
                }
                const privateUser = await dbUtils.getUserByUsername(dbPool, socket.request.user.username);
                const reqUserID = privateUser.id;
                await dbUtils.addMessageToThread(dbPool, req.channelID, req.threadID, reqUserID, req.message, req.isReplyTo);
        
                const publicUserInfo = await dbUtils.getPublicUserInfo(dbPool, reqUserID);

                socket.broadcast.emit(`#${req.threadID}new-chat-message`, {
                    message: req.message,
                    userInfo: publicUserInfo,
                    isReplyTo: req.isReplyTo,
                    channelID: req.channelID,
                    threadID: req.threadID
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


        socket.on('ping-user', (req) => {
            const socketInfo = openSockets.find(s => s.username === req.targetUsername);
            if (socketInfo) {
                const targetSocket = io.sockets.sockets.get(socketInfo.socketID);
                if (targetSocket) {
                    targetSocket.emit(`ping-recieve`, { from: socket.request.user.username, channelID: req.channelID, threadID: req.threadID });
                }
            }
        });
    });
}

export default {init}