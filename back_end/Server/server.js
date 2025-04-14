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
    timezone: 'utc'
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
dbUtils.addThreadToChannel(dbPool, 1, "Test Thread", "A thead for testing purposes", channels[0].id)

import router from '../Routers/router.js'
await router.init(app,dbOptions,dbPool, passport, io);
import dbAPI from '../Routers/databaseAPI.js'
await dbAPI.init(app,dbPool)

dbUtils.getChannels(dbPool);

await dbUtils.registerUser(dbPool, 'w@w', 'w', "w", "my description! A max of 256 characters");

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});