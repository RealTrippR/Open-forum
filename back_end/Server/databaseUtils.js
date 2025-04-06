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
            username VARCHAR(64) NOT NULL,
            email VARCHAR(128) NOT NULL,
            password VARCHAR(128) NOT NULL,
            description VARCHAR(128) NOT NULL DEFAULT "",
            registerDate DATETIME NOT NULL
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

async function initChannels(dbPool) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        if (await getChannelCount(dbPool)===0) {
            await createChannel(dbPool, "General")
            await createChannel(dbPool, "Help")
            await createChannel(dbPool, "Beginners")
            await createChannel(dbPool, "Optimization");
            await createChannel(dbPool, "Development");
            await createChannel(dbPool, "Feature Requests")
            await createChannel(dbPool, "Bug Reports")
            await createChannel(dbPool, "Showcase")
        }
    } catch(err) {
        console.log("Failed to initialize channels: ", err);
    }
}

async function clearDB(dbPool)
{
    const channels = await getChannels(dbPool);
    if (channels !== undefined) {
        for (let channel of channels) {
            // delete channel thread table
            const threadTableName = getThreadTableNameFromChannelID(channel.id);
            const deleteThreadTableQuery = `DROP TABLE IF EXISTS ${threadTableName}`;
            await dbPool.query(deleteThreadTableQuery);
        }
    }

    
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    // select the FORUM database
    await dbPool.query(`use ${process.env.MYSQL_DATABASE}`)
    // delete all from database
    const deleteAllUsersQuery = `DROP TABLE IF EXISTS ${process.env.MYSQL_USER_TABLE};`;
    console.log(deleteAllUsersQuery)
    await dbPool.query(deleteAllUsersQuery)


    const deleteAllChannelsQuery =  `DROP TABLE IF EXISTS ${process.env.MYSQL_CHANNEL_TABLE};`;
    await dbPool.query(deleteAllChannelsQuery)

    // recreate tables
    initDB(dbPool);

    // reset auto increment
    let resetAutoIncQuery = `ALTER TABLE ${process.env.MYSQL_USER_TABLE} AUTO_INCREMENT = 1`
    await dbPool.query(resetAutoIncQuery)
    resetAutoIncQuery = `ALTER TABLE ${process.env.MYSQL_CHANNEL_TABLE} AUTO_INCREMENT = 1`
    await dbPool.query(resetAutoIncQuery)
}

async function getChannelCount(dbPool) {

    let c = await getChannels(dbPool);
    return c.length;
}

// returns the channel id if successful, otherwise returns undefined
async function createChannel(dbPool, name) {
    if (dbPool === undefined) {throw new Error('dbPool is required as an argument');}

    const threadListChannelId = 0; //temp, replace with actual value
    const createChannelQuery = `INSERT INTO ${process.env.MYSQL_CHANNEL_TABLE} (name, threadListID) VALUES (?, ?)`;

    const [result] = await dbPool.execute(createChannelQuery, [name, threadListChannelId]);
    console.log(`Created channel ${name} successfully`);

    createThreadTableForChannel(dbPool, result.insertId);

    return result.insertId;
}

function getThreadTableNameFromChannelID(channelID) {
    return process.env.MYSQL_THREAD_TABLE + String(channelID);
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
    return process.env.MYSQL_THREAD_TABLE + String(channelID);
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
    try {
        const getChannelsQuery = `SELECT * from ${process.env.MYSQL_CHANNEL_TABLE}`;
        const [rows] = await dbPool.query(getChannelsQuery);
        return rows;
    } catch (err) {
        console.error("Fatal error, could not get channels: ", err);
        return undefined;
    }
}

const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };
  
async function isEmailInUse(dbPool, email) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }

    try {
        const query = `SELECT * FROM ${process.env.MYSQL_USER_TABLE} WHERE email = ?`
        const {res} = await dbPool.query(query, [email]);
        if (res.length>=0) {
            return true;
        }
        if (res.length>1) {
            console.log("Fatal error, more than two users share the same email: ", email)
            console.log("Shutting down server due to possible security vulnerability.")
            process.exit(); // nuke the server, as this could be the result of a security vulnerability
        }
    } catch (err) {
        console.error("Error: ", err);
    }
    return false;
}

async function doesUserExist(dbPool, username) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    const id = await getUserIDfromUsername(dbPool, [username]);
    if (id !== undefined) {
        return false;
    } else {
        return true;
    }
}
// returns the User's ID if the user exists, otherwise returns undefined
async function getUserIDfromUsername(dbPool, username) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        const query = `SELECT * FROM ${process.env.MYSQL_USER_TABLE} WHERE username = ?`
        const {res} = await dbPool.query(query, {username});
        if (res == undefined) {
            return undefined; // user doesn't exist
        }
        if (res.length>1) {
            console.log("Fatal error, more than two users share the same username: ", username)
            console.log("Shutting down server due to possible security vulnerability.")
            process.exit(); // nuke the server, as this could be the result of a security vulnerability
        }
        if (res.length>=0) {
            return res[0].id;
        }
        
    } catch (err) {
        console.error("Failed to get user ID from username: ", err);
        return undefined;
    }
    return undefined;
}

// returns the user object is successful, otherwise returns undefined
async function getUserFromID(dbPool, ID) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        const query = `SELECT * FROM ${process.env.MYSQL_USER_TABLE} WHERE id = ?`
        const {res} = dbPool.query(query, [ID]);
        if (res === undefined) {
            return undefined;
        }
        return res[0];
    } catch  (error) {
        console.error("Could not get user from ID", error);
    }
    return undefined;
}


// returns the user object is successful, otherwise returns undefined
async function getUserByUsername(dbPool, username) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        const query = `SELECT * FROM ${process.env.MYSQL_USER_TABLE} WHERE username = ?`;
        const [rows] = await dbPool.query(query, [username]);
        return rows[0]; // return the first matching user
    } catch {
        console.log("Could not get user from username", username);
    }
    return undefined;
}

// returns the ID of the created user, returns undefined if it fails to get user or if the user already exists
async function registerUser(dbPool, email, username, plainPassword) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    if (username == null || email == null || plainPassword == null) {
        return Error("Enter valid data"); // invalid data passed into function
    }
    if(validateEmail(email)){ 
        return "Invalid Email"
    }
    if (await getUserIDfromUsername(dbPool, username) !== undefined) {
        return "Username is taken";
    }
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, process.saltRounds);

        const query = `INSERT INTO ${process.env.MYSQL_USER_TABLE} (username, email, password, registerDate) VALUES (?, ?, ?, ?)`;
        console.log(query);

        const now = new Date();
        const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime

       const [result] = await dbPool.execute(query, [username, email, hashedPassword, datetime]);

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


export default {
    initDB, clearDB, initChannels, getChannelCount, registerUser, 
    isEmailInUse, getUserByUsername, getUserFromID, doesUserExist, 
    createChannel, getChannels, addThreadToChannel, getThreadsFromChannel
};