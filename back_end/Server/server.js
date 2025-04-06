import '../../env.js'
const PORT = process.env.SERVER_PORT;
process.saltRounds = 13
import express from 'express'
const app = express();
import bcrypt from 'bcrypt';
import passport from 'passport';


import mysql from 'mysql2'
import dbUtils from './databaseUtils.js'

const dbPool =  mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()


// init passport system
import { initialize } from './passport-config.js'
initialize(
    dbPool,
    passport,
    username =>  dbUtils.doesUserExist(dbPool, username), // search for user, will not auth if undefined/null/any is returns
    id => dbUtils.getUserFromID(dbPool,id) // search for user, will not auth if undefined/null/any is returns
);

await dbUtils.clearDB(dbPool);
await dbUtils.initDB(dbPool)
await dbUtils.initChannels(dbPool); // creates the channels if they don't exist

import router from '../Routers/router.js'
await router.init(app,dbPool, passport);
import dbAPI from '../Routers/databaseAPI.js'
await dbAPI.init(app,dbPool)


// test user
dbUtils.registerUser(dbPool, 'w@w', 'w', "w");
const tmp = dbUtils.getUserFromID(dbPool,1);
// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});