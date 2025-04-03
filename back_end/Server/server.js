import '../../env.js'
const PORT = process.env.SERVER_PORT;

import express from 'express'
const app = express();
import bcrypt from 'bcrypt';
import passport from 'passport';

// init passport system
import initializePassport from './passport-config.js'
initializePassport.initialize(
    passport,
    email => users.find(user=>user.email === email),
    id => users.find(user=>user.id === id)
);


import mysql from 'mysql2'
import dbUtils from './databaseUtils.js'

const dbPool =  mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()

await dbUtils.clearDB(dbPool);
await dbUtils.initDB(dbPool)
await dbUtils.initChannels(dbPool); // creates the channels if they don't exist

import router from '../Routers/router.js'
await router.init(app,dbPool, passport);
import dbAPI from '../Routers/databaseAPI.js'
await dbAPI.init(app,dbPool)


    
// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});