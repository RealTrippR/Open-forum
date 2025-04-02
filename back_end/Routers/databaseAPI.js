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
            const { channelID } = req.body;
            const threads = await dbUtils.getThreadsFromChannel(dbPool,channelID);
            res.status(200).json({threads: threads});
        } catch (error) {
            console.error(error);
            res.status(500).json({ msg: "Salvete, Huzzi!", channelId: channelId });
        }
    });
}


export default {init};