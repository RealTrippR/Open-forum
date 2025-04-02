import bcrypt, { hash } from 'bcrypt'
import mysql from 'mysql2'




async function initDB(dbPool) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        await dbPool.query(`use ${process.env.MYSQL_DATABASE}`)
        const USERcreateTableQuery = `
        CREATE TABLE IF NOT EXISTS ${process.env.MYSQL_USER_TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL
        );`;
        await dbPool.query(USERcreateTableQuery);
        const CHANNELcreateTableQuery = `
        CREATE TABLE IF NOT EXISTS ${process.env.MYSQL_CHANNEL_TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            threadListId INT NOT NULL
        );`;
        await dbPool.query(CHANNELcreateTableQuery);
      

    } catch (err) {
        console.error('Error using database:', err);
    }
}

async function clearDB(dbPool)
{
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    // select the FORUM database
    await dbPool.query(`use ${process.env.MYSQL_DATABASE}`)
    // delete all from database
    const deleteAllUsersQuery = `DELETE FROM ${process.env.MYSQL_USER_TABLE};`;
    console.log(deleteAllUsersQuery)
    await dbPool.query(deleteAllUsersQuery)
    const deleteAllChannelsQuery =  `DELETE FROM ${process.env.MYSQL_CHANNEL_TABLE};`;
    await dbPool.query(deleteAllChannelsQuery)

    // reset auto increment
    let resetAutoIncQuery = `ALTER TABLE ${process.env.MYSQL_USER_TABLE} AUTO_INCREMENT = 1`
    await dbPool.query(resetAutoIncQuery)
    resetAutoIncQuery = `ALTER TABLE ${process.env.MYSQL_CHANNEL_TABLE} AUTO_INCREMENT = 1`
    await dbPool.query(resetAutoIncQuery)

}

async function updateChannelName(channelId, newName){/*TODO*/}

// returns the channel id if successful, otherwise returns undefined
async function createChannel(dbPool, name) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }

    const topicListChannelId = 0; //temp, replace with actual value
    const createChannelQuery = `INSERT INTO ${process.env.MYSQL_CHANNEL_TABLE} (name, topicListID) VALUES (?, ?)`;

    const [result] = await dbPool.execute(createChannelQuery, [name, topicListChannelId]);
    console.log("Created channel successfully");

    createThreadTableForChannel(dbPool, result.insertId);

    return result.insertId;
}

function getThreadTableNameFromChannelID(channelID) {
    return process.env.MYSQ_TOPIC_TABLE + String(channelID);
}

async function createThreadTableForChannel(dbPool, channelID) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    const tableName = getThreadTableNameFromChannelID(channelID);
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ownerID INT,
        name VARCHAR(64),
        creationDate DATETIME
    )
    `;
    await dbPool.query(createTableQuery);
}

const tableName = function getThreadTableNameFromChannelID(channelID) {
    return process.env.MYSQ_TOPIC_TABLE + String(channelID);
}

async function getMessageTableNameFromChannelIDandThreadID(threadID, channelID) {
    return 'message_' + String(channelID) + "_" + String(threadID); 
}

async function addThreadToChannel(dbPool, threadOwnerID, threadName, channelID) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    const tableName = getThreadTableNameFromChannelID(channelID);(channelID);
    const addThreadQuery = `INSERT INTO ${tableName} (ownerID, name, creationDate) VALUES (?, ?, ?)`;

    const now = new Date();
    const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
    
    const [result] = await dbPool.query(addThreadQuery, [threadOwnerID, threadName, datetime]);
    console.log("Succesfully created thead ",threadName);
    return result.insertId;
}

async function getChannels(dbPool) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    const getChannelsQuery = `SELECT * from ${process.env.MYSQL_CHANNEL_TABLE}`;
    const [rows] = await dbPool.query(getChannelsQuery);
    return rows;
}

// returns the ID of the created user, returns undefined if fails to get user
async function createUser(dbPool, username, plainPassword) {
    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        const query = `INSERT INTO ${process.env.MYSQL_USER_TABLE} (username, password) VALUES (?, ?)`;
            console.log(query);

       const [result] = await dbPool.execute(query, [username, hashedPassword]);

       console.log("User registered successfully");
       return result.insertId;

    } catch (err) {
        console.error("Error registering user:", err);
    }
    return undefined;
}

async function getThreadsFromChannel(dbPool, channelID) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
   
    const getQuery = `SELECT * FROM ${getThreadTableNameFromChannelID(channelID)};`
    const [rows] = await dbPool.query(getQuery);
    return rows;
}

function checkIfUserExists() {

}

export default {initDB,createUser, checkIfUserExists, createChannel, getChannels, addThreadToChannel,clearDB,getThreadsFromChannel};

