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

    // threadAPI
    app.post('/channel', async (req, res) => {
        try {
            let { channelID } = req.body;
            channelID = Number(channelID);
            if(typeof channelID !== "number") {
                throw new Error("channelID is not a number!");
            };
            const threads = await dbUtils.getThreadsFromChannel(dbPool,channelID);
            res.status(200).json({threads: threads});
        } catch (err) {
            //console.error(err);
            res.status(500);
        }
    });

    
    // return the messages from the desired thread
    app.post('/channel/threads', async (req, res) => {
        try {
            
        } catch (err) {
            //console.error(error);
            res.status(500);
        }
    })

    app.post('channel/message', async (req, res) => {

    });
}


export default {init};