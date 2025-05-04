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

await dbUtils.initDB(dbPool)
await dbUtils.initChannels(dbPool); // creates the channels if they don't exist

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
