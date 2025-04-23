import '../../env.js'

const PORT = process.env.SERVER_PORT;
process.saltRounds = 13
import express from 'express'
const app = express();
import { createServer } from 'node:http';
const server = createServer(app); // traditional HTTP server

//https://socket.io/docs/v4/tutorial/step-3
import { Server } from 'socket.io';
const io = new Server(server);

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

await dbUtils.clearDB(dbPool, false, true, false);
await dbUtils.initDB(dbPool)
await dbUtils.initChannels(dbPool); // creates the channels if they don't exist

const channels = await dbUtils.getChannels(dbPool);
const trgC = 0;
await dbUtils.addThreadToChannel(dbPool, 1, "Test Thread", "A thead for testing purposes", channels[trgC].id)

 for (let i = 0; i < process.env.MESSAGE_CHUNK_SIZE*5; i++) {
      await dbUtils.addMessageToThread(dbPool, channels[trgC].id, 1, 1, `${i+1}  -+- THIS IS A MESSAGE -+- `)
 }
 await dbUtils.addMessageToThread(dbPool, channels[trgC].id, 1, 1, `M1`)
 await dbUtils.addMessageToThread(dbPool, channels[trgC].id, 1, 1, `M2`)
 await dbUtils.addMessageToThread(dbPool, channels[trgC].id, 1, 1, `M3`)


import router from '../Routers/router.js'
await router.init(app,dbOptions,dbPool, passport, io);
import socket from '../Routers/socket.js'
await socket.init(dbPool, io);
import dbAPI from '../Routers/databaseAPI.js'
await dbAPI.init(app,dbPool)

dbUtils.getChannels(dbPool);

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});