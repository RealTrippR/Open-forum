import '../../env.js'
import ejs from 'ejs';

import dbUtils from '../Server/databaseUtils.js'

import express from 'express'
const app = express();
const PORT = process.env.SERVER_PORT;

let dbPool;

// note that the server must already be started before this is called
async function init(app, _dbPool) {
    dbPool = _dbPool;

    // threadAPI, get channel
    app.post('/channel', async (req, res) => {
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
            //console.error(err);
            res.status(500).send();
        }
    });

    // creates a thread and returns an updated list of threads.
    app.post('/api-create-thread', async(req, res) => {
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
    app.post('/channel/threads', async (req, res) => {
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

    app.post('/api-update-username', async(req, res) => {
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

            await dbUtils.updateUserName(dbPool, newUsername, userID);

            res.status(200).send();
        } catch (err) {
            console.error(err);
            res.status(500).send();
        }
    });

    app.post('/api-update-user-description', async(req, res) => {
        if (!req.isAuthenticated()) {
            return;
        }
        try {
            // description
            const  updateinfo  = req.body;
            if (updateinfo == null) {
                throw new Error("Thread info undefined!");
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


    app.post('/api-get-messages-from-thread', async(req,res) => {
        try {
            const {threadID} = req.body;
            
            //console.log("THREAD ID: ", req);

            const messages = ['test-res, modify databaseAPI to work properly'];
            res.status(200).json({messages: messages}).send();
        } catch (err) {
            console.error("Failed to get thread messages: ", err);
            res.status(500).send();
        }
    });
    app.post('/api-add-message-to-thread', async(req,res) => {
        
    });
}


export default {init};