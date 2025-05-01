import '../../env.js'
import ejs from 'ejs';

import dbUtils from '../Server/databaseUtils.js'

import express from 'express'
const app = express();
const PORT = process.env.SERVER_PORT;

import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import formidable from 'formidable';
import path from 'path';
let dbPool;

// note that the server must already be started before this is called
async function init(app, _dbPool) {
    dbPool = _dbPool;

    // threadAPI, get channel
    app.post(`${process.env.SERV_URL}/channel`, async (req, res) => {
        try {
            let { channelID } = req.body;
            channelID = Number(channelID);
            if(typeof channelID !== "number") {
                throw new Error("channelID is not a number!");
            };
            const threads = await dbUtils.getThreadsFromChannel(dbPool,channelID);
            const description = await dbUtils.getDescriptionFromChannel(dbPool, channelID);
            res.status(200).json({threads: threads, description: description}).send();
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    });

    // creates a thread and returns an updated list of threads.
    app.post(`${process.env.SERV_URL}/api-create-thread`, async(req, res) => {
        try {
            if (req.isAuthenticated() == false) { 
                res.status(500).send();
                return;
            }
            // name, description, channelID
            const  threadInfo  = req.body;
            if (threadInfo == null) {
                throw new Error("Thread info undefined!");
            }
            if (threadInfo.name.length == 0) {
                return;
                //throw new Error("Name must have a length greater than 0");
            } 
            if (threadInfo.description == null) {
                threadInfo.description = "";
            }

            const privUser = await dbUtils.getUserByUsername(dbPool,req.user.username, req.userID);
            const userID = privUser.id;
            const channelID = threadInfo.channelID;
            await dbUtils.addThreadToChannel(dbPool, userID, threadInfo.name, threadInfo.description, channelID);
            
            const threads = await dbUtils.getThreadsFromChannel(dbPool, channelID);
            const description = await dbUtils.getDescriptionFromChannel(dbPool, channelID);
            res.status(200).json({threads: threads, description: description}).send();
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    });
    
    // return the messages from the desired thread
    app.post(`${process.env.SERV_URL}/channel/threads`, async (req, res) => {
        try {
            if (req.isAuthenticated() == false) { 
                res.status(500).send();
                return;
            }
        } catch (err) {
            //console.error(error);
            res.status(500);
        }
    })

    app.post(`${process.env.SERV_URL}/api-update-username`, async(req, res) => {
        if (!req.isAuthenticated()) {
            return;
        }
        try {
            // username
            const  updateinfo  = req.body;
            if (updateinfo == null) {
                throw new Error("Thread info undefined!");
            }

            const newUsername = updateinfo.username;
            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;

            const updateRes = await dbUtils.updateUserName(dbPool, newUsername, userID);
            if (updateRes == 'err') {
                return res.status(500).send();
            }
            if (updateRes == 'taken') {
                return res.status(409).send(); // https://stackoverflow.com/questions/12657493/what-http-error-code-to-return-for-name-already-taken
            }
            return res.status(200).send();
        } catch (err) {
            console.error(err);
            return res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-update-user-email`, async(req,res) => {
        if (!req.isAuthenticated()) {
            return;
        }
        try {
            const newEmail = req.body.email;
            if (newEmail == undefined || typeof(newEmail) != "string") {
                return res.status(400).send()
            }

            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;
            const updateRes = await dbUtils.updateUserEmail(dbPool, newEmail, userID);
            if (updateRes == 'err') {
                return res.status(500).send();
            }
            if (updateRes == 'taken') {
                return res.status(409).send(); // https://stackoverflow.com/questions/12657493/what-http-error-code-to-return-for-name-already-taken
            }
            return res.status(200).send();
        } catch (err) {
            console.error("API FAIL: ", err);
            return res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-username-taken`, async(req,res) => {
        try {
            if (req.body == undefined || req.body.username == undefined) {
                return req.status(400).send()
            }
            const username = req.body.username;
            const isTaken = await dbUtils.isUsernameTaken(dbPool, username);
            if (isTaken==true) {
                return res.status(409).send(); // 409: conflict code
            } else {
                return res.status(200).send();
            }
        } catch (err) {
            console.error("API FAIL: ", err);
            res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-update-user-muted-channel`, async(req, res) => {
        if (!req.isAuthenticated()) {
            return req.status(401).send();
        }
        try {
            // channelid
            const updateinfo  = req.body;
            if (updateinfo == null || updateinfo == undefined) {
                res.status(400).send();
            }
            if (updateinfo.channelID == undefined) {
                res.status(400).send();
            }

            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;

            await dbUtils.updateUserMutedChannel(dbPool, updateinfo.channelID, userID, updateinfo.muted);
            res.status(200).send();
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-get-user-muted-channels`, async(req, res) => {
        if (!req.isAuthenticated()) {
            return req.status(401).send();
        }
        try {
            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;

            const mutedChannels = await dbUtils.getUserMutedChannels(dbPool, userID);
            res.status(200).json({mutedChannels: mutedChannels}).send();
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-update-user-description`, async(req, res) => {
        if (!req.isAuthenticated()) {
            return req.status(401).send();
        }
        try {
            // description
            const  updateinfo  = req.body;
            if (updateinfo == null) {
                throw new Error("Update info undefined!");
            }

            const newDesc = updateinfo.description;
            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;

            await dbUtils.updateUserDescription(dbPool, newDesc, userID);
            res.status(200).send();
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-update-user-country-code`, async(req, res) => {
        if (!req.isAuthenticated()) {
            return req.status(401).send();
        }
        try {
            const  updateinfo  = req.body;
            if (updateinfo == null) {
                throw new Error("Thread info undefined!");
            }
            if (updateinfo.countryCode == undefined || updateinfo.countryCode.length != 2) {
                res.status(400).send();
            }
            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;

            await dbUtils.updateUserCountryCode(dbPool, updateinfo.countryCode, userID);
            res.status(200).send();
        } catch(err) {
            console.error("Failed to update country code of user: ", err);
            res.status(500).send();
        }
    });

    // get message chunk
    app.post(`${process.env.SERV_URL}/api-get-message-chunk-from-thread`, async(req,res) => {
        try {
            const body = req.body;
            
            if ( body.chunkIndex < 0 || body.channelID < 0 ||  body.threadID < 0) {
                return res.status(400).send();
            } 
            const messages = await dbUtils.getMessageChunkFromThread(dbPool, body.channelID, body.threadID, body.chunkIndex);
            res.status(200).json({messages: messages}).send();
        } catch (err) {
            console.error("Failed to get thread messages: ", err);
            res.status(500).send();
        }
        return;
    });

    // get all messages
    app.post(`${process.env.SERV_URL}/api-get-messages-from-thread`, async(req,res) => {
        try {
            const body = req.body;
            
            //console.log("THREAD ID: ", req);

            //const messages = ['test-res, modify databaseAPI to work properly'];
            const messages = await dbUtils.getMessagesFromThread(dbPool, body.channelID, body.threadID);
            res.status(200).json({messages: messages}).send();
        } catch (err) {
            console.error("Failed to get thread messages: ", err);
            res.status(500).send();
        }
        return;
    });

    app.post(`${process.env.SERV_URL}/api-get-thread-message-count`, async(req,res) => {
        try {
            const body = req.body;
            
            const count = await dbUtils.getMessageCountOfThread(dbPool, body.channelID, body.threadID);
            res.status(200).json({count: count}).send();
        } catch (err) {
            console.error("Failed to get thread messages: ", err);
            res.status(500).send();
        }
        return;
    });

    
    // threadID should be null to remove a pinned thread
    app.post(`${process.env.SERV_URL}/set-pinned-thread-of-channel`, async(req,res) => {
        try {
            if (req.isAuthenticated() == false) {
                return res.status(401).send();
            }
            if (req.user == undefined) {
                return res.status(400).send();
            }

            const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username);
            if (privUser.isAdmin == false ){
                return res.status(401).send();
            }

            const body = req.body;
            const count = await dbUtils.setPinnedThreadOfChannel(dbPool, body.channelID, body.threadID);
            res.status(200).json({count: count}).send();
        } catch (err) {
            console.error("Failed to pin thread: ", err);
            res.status(500).send();
        }
        return;
    });

    app.post(`${process.env.SERV_URL}/api-delete-thread`, async(req,res) => {
        try {
            if (req.isAuthenticated() == false) {
                return res.status(401).send();
            }
            const body = req.body;
            if (body.threadID == undefined) {
                return res.status(400).send();
            }

            ( async () => {
                try {
                    const th = await dbUtils.getThreadFromID(dbPool, body.channelID, body.threadID);
                    if (th==undefined) {
                        return res.status(500).send();
                    }
                    
                    const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
                    const userID = user.id;
                    // make sure that the user actually owns the thread before deleting it
                    // if the user is an admin they can delet it regardless of ownership state
                    if (th.ownerID != userID && userID.isAdmin == false) {
                        return res.status(401).send();
                    }
                    await dbUtils.deleteThread(dbPool, body.channelID, body.threadID);
                } catch (err) { console.error("Failed to delete thread: ", err);}
            })();
            
            return res.status(200).send();

        } catch (err) {
            console.error("Failed to delete thread: ", err);
            return res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-update-pfp`, async(req,res) => {
        try {
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            if (req.isAuthenticated() == false) {
                return res.status(401).send();
            }
            if (req.user == undefined) {
                return res.status(400).send();
            }

            const form = formidable({
                uploadDir: path.join(__dirname, '../../public/profile-pictures'), // folder to save uploaded files
                keepExtensions: true,
                maxFileSize: 300000, // 300 KB limit
                multiples: false,
            });
            
            const fileTypes = ['image/jpeg', 'image/png'];
            form.onPart = part => {
                if (fileTypes.indexOf(part.mimetype) === -1) {
                    // Here is the invalid file types will be handled. 
                    form._error(new Error('File type is not supported'));
                    return res.send(500).send();
                }
                if (!part.filename || fileTypes.indexOf(part.mime) !== -1) {
                    // Let formidable handle the non file-pars and valid file types
                    form._handlePart(part);
                }
            };
            

            form.parse(req, function (err, fields, files) {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(500).send('Upload failed');
                }
                
                const uploadedFile = files.profilePicture[0];
                if (!uploadedFile) {
                    return res.status(400).send('No file uploaded');
                }

                // const ext = `${uploadedFile.filepath}`
                // .split('.')
                // .filter(Boolean) // removes empty extensions (e.g. `filename...txt`)
                // .slice(1)
                // .join('.')

                const oldPath = uploadedFile.filepath;

                let newPath = path.join(path.dirname(oldPath), `${req.user.username}`);
                newPath = newPath += '.' + 'jpg';
                
                (async () => {
                    try {
                        await sharp(oldPath)
                            .jpeg({ quality: 90 }) // Converts and compresses to JPG
                            .toFile(newPath);
                
                        // Optionally delete the original file
                        fs.unlinkSync(oldPath);
                
                        return res.status(200).send('Profile picture uploaded and converted to JPG.');
                    } catch (conversionError) {
                        console.error('Image conversion error:', conversionError);
                        return res.status(500).send('Failed to convert image');
                    }
                })();
            });

            const user = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = user.id;
            dbUtils.giveUserProfilePicture(dbPool, userID);
        } catch (err) {
            console.error("Failed to change profile picture: ", err);
            res.status(500).send();
        }
    });

    app.post(`${process.env.SERV_URL}/api-get-unread-pings`,  async(req,res) => {
        try {
            if (req.isAuthenticated() == false) {
                return res.status(401).send();
            }
            const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = privUser.id;
            const unreadPings = await dbUtils.getUnreadPingsFromUser(dbPool, userID);
            return res.status(200).json({unreadPings: unreadPings}).send();
        } catch (err) {
            console.error('Failed to get unread pings: ', err);
            res.status(500).send();
        }
    });

    // expects a ping obj in the request body
    app.post(`${process.env.SERV_URL}/api-add-unread-ping`,  async(req,res) => {
        try {
            if (req.isAuthenticated() == false) {
                return res.status(401).send();
            }
            const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = privUser.id;

            const body = req.body;
            if (body.pingObj == undefined) {
                return res.status(400).send();
            }
            const pingObj = body.pingObj;
            await dbUtils.addUnreadPingToUser(dbPool, userID, pingObj);
            res.status(200).send();
        } catch (err) {
            console.error('Failed to add unread ping: ', err);
            res.status(500).send();
        }
    });

    //removeUnreadPingsOfUserFromThread
    app.post(`${process.env.SERV_URL}/api-remove-unread-pings-of-user-from-thread`, async(req,res) => {
        try {
            if (req.isAuthenticated() == false) {
                return res.status(401).send();
            }
            const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username);
            const userID = privUser.id;

            const body = req.body;
            const channelID = Number(body.channelID);
            const threadID = Number(body.threadID);
            if (channelID == undefined || threadID == undefined) {
                return res.status(400).send();
            }

            await dbUtils.removeUnreadPingsOfUserFromThread(dbPool, userID, channelID, threadID)
            res.status(200).send();
        } catch (err) {
            console.error('Failed to remove unread pings', err);
            res.status(500).send();
        }
    });
}


export default {init};