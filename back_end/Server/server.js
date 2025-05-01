// node back_end/Server/server.js
import '../../env.js'

const PORT = process.env.SERVER_PORT;
process.saltRounds = 13
import express from 'express'
import os from 'os'
const app = express();
/******************************************************/
app.set('trust proxy', 1); 
/******************************************************/

import { createServer } from 'node:http';
const server = createServer(app); // traditional HTTP server

//https://socket.io/docs/v4/tutorial/step-3
import { Server } from 'socket.io';
const io = new Server(server, {
    maxHttpBufferSize: 10 * 1024 * 1024  // 10MB for larger messages with image attachments
});

import passport from 'passport';


import mysql from 'mysql2'
import dbUtils from './databaseUtils.js'


const dbOptions = {
    port:  process.env.MYSQL_PORT,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    timezone: 'utc' /*ignore the console warning, this is nessecary to properly store datetimes*/
}

const dbPool =  mysql.createPool(dbOptions).promise()


// init passport system
import { initialize } from './passport-config.js'
initialize(
    dbPool,
    passport
);

if (process.env.NODE_ENV != 'production') {
    ///await dbUtils.clearDB(dbPool, false, true, false);
}
await dbUtils.initDB(dbPool)
await dbUtils.initChannels(dbPool); // creates the channels if they don't exist

if (process.env.NODE_ENV != 'production') {
    const channels = await dbUtils.getChannels(dbPool);
    const trgC = 0;
    // await dbUtils.addThreadToChannel(dbPool, 1, "Test Thread No. 1", "A thead for testing purposes", channels[trgC].id)
    // await dbUtils.addThreadToChannel(dbPool, 1, "Test Thread No. 2", "A thead for testing purposes", channels[trgC].id)
    // await dbUtils.addThreadToChannel(dbPool, 1, "Welcome", "A thead for testing purposes", channels[trgC].id, true)
    // await dbUtils.addThreadToChannel(dbPool, 1, "Test Thread No. 4", "A thead for testing purposes", channels[trgC].id)
    // await dbUtils.setPinnedThreadOfChannel(dbPool, 1, 3);
    // await dbUtils.setUserAdminState(dbPool, 1, true)

    for (let i = 0; i < 300; ++i) {
       // await dbUtils.addMessageToThread(dbPool, 1, 1, 1, `Message: ${i+1}`)
    }
}

import router from '../Routers/router.js'
await router.init(app,dbOptions,dbPool, passport, io);
import socket from '../Routers/socket.js'
await socket.init(dbPool, io);
import dbAPI from '../Routers/databaseAPI.js'
await dbAPI.init(app,dbPool)

dbUtils.getChannels(dbPool);

if (process.env.SERVER_HOST_NAME) {
// Start the server
server.listen(PORT, process.env.SERVER_HOST_NAME, () => {
    const protocol = 'https';
    const host = os.hostname();
    const url = `${protocol}://${host}:${PORT}`;
    console.log(`Server running at ${url}`);
}); 
} else {
    // Start the server
    server.listen(PORT, () => {
        const protocol = 'https';
        const host = os.hostname();
        const url = `${protocol}://${host}:${PORT}${process.env.BASE_URL}`;
        console.log(`Server running at ${url}`);
    }); 
}