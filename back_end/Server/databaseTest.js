import dotenv from 'dotenv'
dotenv.config(); 

import mysql from 'mysql2'
import dbUtils from './databaseUtils.js'
// Ensure process.env.MYSQL_DATABASE is set correctly
console.log('Using database:', process.env.MYSQL_DATABASE);


const dbPool =  mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()
/*
const [rows] = await dbPool.query("use user")

const [rows] = await dbPool.query("show databases")
console.log(rows);
*/
await dbUtils.clearDB(dbPool);
await dbUtils.initDB(dbPool)


const userID = await dbUtils.createUser(dbPool, "IamTheFirstUser!", "password"); // https://www.youtube.com/watch?v=jkQdEvPf-uI
const channelID = await dbUtils.createChannel(dbPool, "Test Channel");

await dbUtils.addThreadToChannel(dbPool, 1, "My Thread", channelID)


async function getUsers() {
    const [rows] = await dbPool.query(`SELECT * FROM ${process.env.MYSQL_USER_TABLE}`)
    return rows
}

async function getUserFromId(id) {
    const [rows] = await dbPool.query(`
        SELECT * 
        FROM ${process.env.MYSQL_USER_TABLE}
        WHERE id = ?`, [id]
    )
    return rows[0]
}
const users = await getUsers();
console.log("Users: ", users)

const channels = await dbUtils.getChannels(dbPool);
console.log("Channels: ",channels);
//console.log(rows)

const channelThreads = await dbUtils.getThreadsFromChannel(dbPool, channelID);
console.log(`Channel #${channelID} threads: `, channelThreads)