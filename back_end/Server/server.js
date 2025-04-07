import '../../env.js'
const PORT = process.env.SERVER_PORT;
process.saltRounds = 13
import express from 'express'
const app = express();
import bcrypt from 'bcrypt';
import passport from 'passport';


import mysql from 'mysql2'
import dbUtils from './databaseUtils.js'


const dbOptions ={
    port:  process.env.MYSQL_PORT,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}
const dbPool =  mysql.createPool(dbOptions).promise()


// init passport system
import { initialize } from './passport-config.js'
initialize(
    dbPool,
    passport
);

//await dbUtils.clearDB(dbPool);
await dbUtils.initDB(dbPool)
await dbUtils.initChannels(dbPool); // creates the channels if they don't exist

//dbUtils.registerUser(dbPool, 'w@w', 'w', "w");

import router from '../Routers/router.js'
await router.init(app,dbOptions,dbPool, passport);
import dbAPI from '../Routers/databaseAPI.js'
await dbAPI.init(app,dbPool)


// test user
const tmp = dbUtils.getUserFromID(dbPool,1);
// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});