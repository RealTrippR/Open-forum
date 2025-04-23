import bcrypt, { hash } from 'bcrypt'
import mysql from 'mysql2'
import fs from 'fs'
import { channel } from 'diagnostics_channel';
import path from 'path';

function roundTo(num, multiple, direction = 'nearest') {
    if (multiple === 0) return num;

    switch (direction) {
        case 'up':
            return Math.ceil(num / multiple) * multiple;
        case 'down':
            return Math.floor(num / multiple) * multiple;
        case 'nearest':
        default:
            return Math.round(num / multiple) * multiple;
    }
}

function isValidUsername(username) {
    const valid = /^[a-zA-Z0-9_]+$/.test(username);
    return valid;
}

async function initDB(dbPool) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        await dbPool.query(`use ${process.env.MYSQL_DATABASE}`)

        const USERcreateTableQuery = `
        CREATE TABLE IF NOT EXISTS ${process.env.MYSQL_USER_TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(${process.env.USERNAME_MAX_LENGTH}) NOT NULL UNIQUE,
            email VARCHAR(256) NOT NULL UNIQUE,
            password VARCHAR(128) NOT NULL,
            description VARCHAR(256) NOT NULL DEFAULT "",
            hasProfilePicture INT NOT NULL DEFAULT 0,
            isAdmin TINYINT NOT NULL DEFAULT 0,
            registerDate DATETIME NOT NULL,
            countryCode VARCHAR(2) DEFAULT NULL,
            lastActive DATETIME DEFAULT NULL,

            resetToken VARCHAR(255) DEFAULT NULL,
            resetTokenExpiration DATETIME DEFAULT NULL
        );`;
        await dbPool.query(USERcreateTableQuery);

        const CHANNELcreateTableQuery = `
        CREATE TABLE IF NOT EXISTS ${process.env.MYSQL_CHANNEL_TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(32) NOT NULL,
            description VARCHAR(64) NOT NULL DEFAULT "",
            threadListId INT NOT NULL
        );`;
        await dbPool.query(CHANNELcreateTableQuery);
      
        const SESSIONcreateTableQuery =
        `CREATE TABLE IF NOT EXISTS sessions (
            session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
            expires int(11) unsigned NOT NULL,
            data mediumtext COLLATE utf8mb4_bin,
            PRIMARY KEY (session_id)
        ) ENGINE=InnoDB`
        await dbPool.query(SESSIONcreateTableQuery);

        const MUTED_CHANNELS_createTableQuery = `
        CREATE TABLE IF NOT EXISTS UserMutedChannels (
            userID INT NOT NULL,
            channelID INT NOT NULL,
            PRIMARY KEY (userID, channelId),
            FOREIGN KEY (userID) REFERENCES ${process.env.MYSQL_USER_TABLE}(id),
            FOREIGN KEY (channelID) REFERENCES ${process.env.MYSQL_CHANNEL_TABLE}(id)
        );
        `
        await dbPool.query(MUTED_CHANNELS_createTableQuery); 

        const UNREAD_PINGS_createTableQuery = `
        CREATE TABLE IF NOT EXISTS UserUnreadPings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userID INT NOT NULL,
            channelID INT NOT NULL,
            threadID INT NOT NULL,
            messageID INT NOT NULL,
            fromUser VARCHAR(${process.env.USERNAME_MAX_LENGTH}) NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES ${process.env.MYSQL_USER_TABLE}(id),
            FOREIGN KEY (channelId) REFERENCES ${process.env.MYSQL_CHANNEL_TABLE}(id)
        );
        `
        await dbPool.query(UNREAD_PINGS_createTableQuery); 

    } catch (err) {
        console.error('Error initializing database:', err);
        console.error('Error initializing database:', err);
    }
}

async function initChannels(dbPool) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        if (await getChannelCount(dbPool)===0) {
            await createChannel(dbPool, "General", "General Discussion")
            await createChannel(dbPool, "Help")
            await createChannel(dbPool, "Beginners")
            await createChannel(dbPool, "Optimization");
            await createChannel(dbPool, "Development", "Discussion related to the development of this project");
            await createChannel(dbPool, "Feature Requests", "Request for new features. See the pinned thread")
            await createChannel(dbPool, "Bug Reports", "Report issues here or via the github page")
            await createChannel(dbPool, "Showcase", "Share your projects")
        }
    } catch(err) {
        console.log("Failed to initialize channels: ", err);
    }
}

async function clearDB(dbPool, clearSessions = true, clearThreadsAndChannels = true, clearUsers = true)
{
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    // select the FORUM database
    await dbPool.query(`use ${process.env.MYSQL_DATABASE}`)
    
    // clear profile pictures
    if (clearUsers) {
        const pfpDir = 'public/profile-pictures';
        if (fs.existsSync(pfpDir)){
            fs.rmSync(pfpDir, { recursive: true, force: true });
        }

        // recreate pfp folder
        fs.mkdirSync(pfpDir);
    }

    // remove any img message attachments
    if (clearThreadsAndChannels) {
        const msgAttachDir = 'public/msgImgAttachments';
        if (fs.existsSync(msgAttachDir)){
            fs.rmSync(msgAttachDir, { recursive: true, force: true });
        }

        // recreate msg attachmetn folder
        fs.mkdirSync(msgAttachDir);
    }


    if (clearUsers || clearThreadsAndChannels) {
        // delete unread pings
        const deleteUserUnreadPingsQuery = `DROP TABLE IF EXISTS UserUnreadPings;`;
        await dbPool.query(deleteUserUnreadPingsQuery);

        // delete UserMutedChannels
        const userMutedChannels = `DROP TABLE IF EXISTS UserMutedChannels;`;
        await dbPool.query(userMutedChannels)
    }
        
            
    const channels = await getChannels(dbPool);
    if (channels !== undefined) {
        for (let channel of channels) {
            if (clearThreadsAndChannels) {
                try {
                    // delete messages for all threads in that channel
                    const threads = await getThreadsFromChannel(dbPool,channel.id);

                    for (let thread of threads) {
                        const threadMessageTableName = getMessageTableNameFromThread(channel.id, thread.id);
                        const deleteMsgTableQuery = `DROP TABLE IF EXISTS ${threadMessageTableName}`;
                        await dbPool.query(deleteMsgTableQuery);
                    }
                
                
                    // delete channel thread table
                    const threadTableName = getThreadTableNameFromChannelID(channel.id);
                    
                    try {
                    const resetAutoIncQuery = `ALTER TABLE ${threadTableName} AUTO_INCREMENT = 1`
                    await dbPool.query(resetAutoIncQuery)
                    } catch (err) {}

                     // delete UserMutedChannels
                    const userMutedChannels = `DROP TABLE IF EXISTS UserMutedChannels;`;
                    await dbPool.query(userMutedChannels)

                    const deleteThreadTableQuery = `DROP TABLE IF EXISTS ${threadTableName}`;
                    await dbPool.query(deleteThreadTableQuery);
                } catch (err) {

                }
            }
            
        }
    }

    
    

    if (clearUsers) {
        // delete all from database
        const deleteAllUsersQuery = `DROP TABLE IF EXISTS ${process.env.MYSQL_USER_TABLE};`;
        await dbPool.query(deleteAllUsersQuery)
    }

    if (clearThreadsAndChannels) {
        const deleteAllChannelsQuery =  `DROP TABLE IF EXISTS ${process.env.MYSQL_CHANNEL_TABLE};`;
        await dbPool.query(deleteAllChannelsQuery)
    }

    if (clearSessions){
        const dropSessionsQuery = 'DROP TABLE IF EXISTS sessions';
        await dbPool.query(dropSessionsQuery);
    }
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
async function createChannel(dbPool, name, description) {
    if (dbPool === undefined) {throw new Error('dbPool is required as an argument');}
    if (description == undefined) {description = ""};
    const threadListChannelId = 0; //temp, replace with actual value
    const createChannelQuery = `INSERT INTO ${process.env.MYSQL_CHANNEL_TABLE} (name, threadListID, description) VALUES (?, ?, ?)`;

    const [result] = await dbPool.execute(createChannelQuery, [name, threadListChannelId, description]);
    const channelID = result.insertId;
    console.log(`Created channel ${name} successfully`);


    // create msg attachment folder for this channel
    const msgAttachDir = path.join('public/msgImgAttachments',`${channelID}`);
    fs.mkdirSync(msgAttachDir);
    

    createThreadTableForChannel(dbPool, channelID);


    return channelID;
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
        description VARCHAR(128) NOT NULL DEFAULT "",
        lastModified DATETIME,
        creationDate DATETIME
    )
    `;
    await dbPool.query(createTableQuery);
}

async function createMessageTableForThread(dbPool, channelID, threadID) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument'); }

    const msgTable = getMessageTableNameFromThread(channelID, threadID);

    // message table
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${msgTable} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ownerID INT,
        content VARCHAR(4096),
        isReplyTo INT DEFAULT NULL,
        date DATETIME,
        hasImg TINYINT(1) DEFAULT 0,
        imgExt VARCHAR(4) DEFAULT NULL
    )
    `

    await dbPool.query(createTableQuery);
}

function getMessageTableNameFromThread(channelID, threadID) {
    return process.env.MYSQL_MESSAGE_TABLE + String(threadID) + "__" + String(channelID);
}

function getThreadTableNameFromChannelID(channelID) {
    return process.env.MYSQL_THREAD_TABLE + String(channelID);
}

async function addThreadToChannel(dbPool, threadOwnerID, threadName, threadDescription, channelID) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    if (threadOwnerID == undefined || threadName == undefined || threadDescription == undefined || channelID == undefined) {
        throw new Error('threadOwnerID, threadName, threadDescription and channelID are required as arguments');
    }

    const tableName = getThreadTableNameFromChannelID(channelID);(channelID);
    const addThreadQuery = `INSERT INTO ${tableName} (ownerID, name, description, creationDate) VALUES (?, ?, ?, ?)`;

    const now = new Date();
    const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
    
    const [result] = await dbPool.query(addThreadQuery, [threadOwnerID, threadName, threadDescription, datetime]);
    const newThreadID = result.insertId;
    await createMessageTableForThread(dbPool, channelID, newThreadID);
    
    updateLastActive(dbPool, threadOwnerID);

    // create msg attachment folder for this channel
    const msgAttachDir = path.join('public/msgImgAttachments',`${channelID}`,`${newThreadID}`);
    fs.mkdirSync(msgAttachDir);
    
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

// returns the User's ID if the user exists, otherwise returns undefined
async function getUserIDfromUsername(dbPool, username) {
    if (dbPool === undefined) {
        throw new Error('dbPool is required as an argument');
    }
    try {
        username = username.toLowerCase();

        const query = `SELECT * FROM ${process.env.MYSQL_USER_TABLE} WHERE LOWER(username) = LOWER(?)`
        const [rows] = await dbPool.query(query, [username]);
    
        if (rows == undefined) {
            return undefined; // user doesn't exist
        }
        if (rows.length>1) {
            console.log("Fatal error, more than two users share the same username: ", username)
            console.log("Shutting down server due to possible security vulnerability.")
            process.exit(); // nuke the server, as this could be the result of a security vulnerability
        }

        if (rows.length>0) {
            return rows[0].id;
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
        const [rows] = await dbPool.query(query, [ID]);
        if (rows === undefined) {
            return undefined;
        }
        return rows[0];
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
        const [rows] = await dbPool.query(query, [username.toLowerCase()]);
        return rows[0]; // return the first matching user
    } catch (err) {
        console.error("Could not get user from username - ", username, ' ', err);
    }
    return undefined;
}

// token: hex string
// expiration date: Date obj
// returns false upon failure, otherwise returns nothing
async function setUserPasswordResetToken(dbPool, userID, token, expirationDate) {
    try {
        if (dbPool == undefined) {throw new Error("dbPool is required as an argument")};
        if (userID == undefined) {throw new Error("userID is required as an argument")};
        if (token == undefined) {throw new Error("token is required as an argument")};
        if (expirationDate == undefined) {throw new Error("expirationDate is required as an argument")};

        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET resetToken = ?,resetTokenExpiration = ? WHERE id = ?`
        
        const tokenExpirationDate = expirationDate.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
        dbPool.execute(query, [token, tokenExpirationDate, userID])
    } catch (err) {
        console.error("Failed to set user password reset token: ",err);
        return false;
    }
}

// returns false if it fails, otherwise returns nothing
async function resetUserPasswordResetToken(dbPool, userID) {
    try {
        if (dbPool == undefined) {throw new Error("dbPool is required as an argument")};
        if (userID == undefined) {throw new Error("userID is required as an argument")};

        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET resetToken = NULL, resetTokenExpiration = NULL WHERE id = ?`
        
        dbPool.execute(query, [userID])
    } catch (err) {
        console.error("Failed to reset user password reset token: ",err);
        return false;
    }
}

// returns false if it fails, otherwise returns nothing
async function updateUserPassword(dbPool, userID, newPassword) {
    try {
        if (dbPool == undefined) {throw new Error("dbPool is required as an argument")};
        if (userID == undefined) {throw new Error("userID is required as an argument")};
        if (newPassword == undefined) {throw new Error("newPassword is required as an argument")};

        if (newPassword.length < process.env.PASSWORD_MIN_LENGTH) {
            return false;
        }

        const hashedPassword = await bcrypt.hash(newPassword, process.saltRounds);

        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET password = ? WHERE id = ?`;
        await dbPool.execute(query, [hashedPassword, userID]);
    } catch (err) {
        console.error("Failed to update user password: ",err);
        return false;
    }
}

// returns the ID of the created user, returns error or undefined if it fails to get user or if the user already exists
async function registerUser(dbPool, email, username, plainPassword, description = "" /*optional*/) {
    if (dbPool === undefined) {
        throw new new Error('dbPool is required as an argument');
    }
    if (username == null || email == null || plainPassword == null) {
        return new Error("Enter valid data"); // invalid data passed into function
    }
    if (username.length < process.env.USERNAME_MIN_LENGTH) {
        return new Error(`Username must be at least ${process.env.USERNAME_MIN_LENGTH} characters long`);
    }
    if (plainPassword.length < process.env.PASSWORD_MIN_LENGTH) {
        return new Error(`Password must be at least ${process.env.PASSWORD_MIN_LENGTH} characters long`);
    }
    
    const validusername = isValidUsername(username);
    if (!validusername) {
        return new Error("Invalid Username");
    }
    const hasValidEmail =validateEmail(email);
    if(hasValidEmail == false){ 
        return new Error("Invalid Email")
    }
    const isNameTaken = await isUsernameTaken(dbPool, username);
    if (isNameTaken) {
        return new Error("Username is taken");
    }
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, process.saltRounds);

        const query = `INSERT INTO ${process.env.MYSQL_USER_TABLE} (username, email, password, registerDate, description) VALUES (?, ?, ?, ?, ?)`;
        console.log(query);

        const now = new Date();
        const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime

       const [result] = await dbPool.execute(query, [username, email, hashedPassword, datetime, description]);

       console.log("User registered successfully");
       return result.insertId;

    } catch (err) {
        console.error("Error registering user:", err);
    }
    return undefined;
}

async function getThreadLastActiveDate(dbPool, channelID, threadID) {
    try {
        if (dbPool === undefined) {
            throw new Error('dbPool is required as an argument');
        }
        
        const getMostRecentMessageQuery = `SELECT * FROM ${getMessageTableNameFromThread(channelID,threadID)} ORDER BY id DESC LIMIT 1;`

        const [row] = await dbPool.query(getMostRecentMessageQuery)
        if (row == undefined || row.length == 0 ) {return undefined;};
        return row[0];
    } catch (err) {
        console.error('Failed to get last active date: ', err);
        return false;
    }
}

async function isUsernameTaken(dbPool, username) {
    try {
        const u = await getUserByUsername(dbPool, username);
        return (u!=undefined);
    } catch (err) {
        console.error(err);
        return true;
    }
}

async function getThreadsFromChannel(dbPool, channelID) {
    try {
        if (dbPool === undefined) {
            throw new Error('dbPool is required as an argument');
        }
    
        const getQuery = `SELECT * FROM ${getThreadTableNameFromChannelID(channelID)};`
        let [rows] = await dbPool.query(getQuery);
        for (let row of rows) {
            if (row.ownerID) {
                const publicUser = await getPublicUserInfo(dbPool, row.ownerID);
                if (publicUser == undefined) {
                    console.error (`Cannot retrieve thread ${row.id}, as the ownerID of the thread is invalid`);
                    continue;
                }
                row.ownerUsername = publicUser.username;
                row.ownerHasProfilePicture = publicUser.hasProfilePicture;
                const lastMSG = await getThreadLastActiveDate(dbPool, channelID, row.id);
                if (lastMSG) {
                    row.lastActive = lastMSG.date;
                }
            } else {
                row.ownerUsername = 'error: undefined'
            }
            const msgCount = await getMessageCountOfThread(dbPool, channelID, row.id);
            row.messageCount = msgCount;
        }
        if (rows == undefined || rows.length == 0) {
            rows = [];
        }
        return rows;
    } catch (err) {
        console.error("Failed to get threads from channel: ", err);
        return undefined;
    }
}

async function getThreadFromID(dbPool, channelID, threadID) {
    try {
        const query = `SELECT * FROM ${getThreadTableNameFromChannelID(channelID)} WHERE id = ?;`;
        const [rows] = await dbPool.query(query, [threadID]);
        if (rows.length == 0) {
            return undefined; // thread does not exist
        }
        return rows[0];
    } catch (err) {
        console.error("Failed to get thread from ID: ", err);
        return false;
    }
}

async function deleteThread(dbPool, channelID, threadID) {
    try {
        if (threadID == undefined || channelID == undefined) {
            throw new Error("ThreadID and channelID are required as arguments")
        }
        threadID = Number(threadID);
        const threadTableName = getThreadTableNameFromChannelID(channelID);

        const deleteThreadQuery = `DELETE FROM ${threadTableName} WHERE id = ?`;
        await dbPool.query(deleteThreadQuery, [threadID]);

        // create msg attachment folder for this channel
        const msgAttachDir = path.join('public/msgImgAttachments',`${channelID}`,`${newThreadID}`);
        fs.mkdirSync(msgAttachDir);

    } catch (err) {
        console.error("Failed to delete thread: ", err);
        return false;
    }
}

async function getDescriptionFromChannel(dbPool, channelID) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument');}
    if (channelID === undefined) { throw new Error('channelID is required as an argument');}
    
    const getQuery = `SELECT * FROM ${process.env.MYSQL_CHANNEL_TABLE} WHERE id = ?;`
    const [rows] = await dbPool.query(getQuery, [channelID]);
    return rows[0].description;
}

// returns a user struct without any sensitive information (i.e. no passwords)
// returns undefined if the user does not exist
async function getPublicUserInfo(dbPool, id) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument');}
    try {
        const privateUser = await getUserFromID(dbPool, id);
        if (privateUser == undefined) {
            return undefined;
        }
        let myUser = {};
        myUser.username = privateUser.username;
        myUser.description = privateUser.description;
        myUser.Date = privateUser.registerDate;
        myUser.lastActive = privateUser.lastActive;
        myUser.hasProfilePicture = Boolean(privateUser.hasProfilePicture);
        myUser.countryCode = privateUser.countryCode;
        return myUser;
    } catch (err) {
        console.error("Could not convert private user to public user: ", err);
        return undefined;
    }
}

async function updateUserMutedChannel(dbPool, channelID, userID, muted /*bool*/) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument');}
    try {
        if (muted) {
            // Insert the mute relationship if not already there
            await dbPool.query(
                `INSERT IGNORE INTO UserMutedChannels (userId, channelId) VALUES (?, ?)`,
                [userID, channelID]
            );
        } else {
            // Remove the mute relationship
            await dbPool.query(
                `DELETE FROM UserMutedChannels WHERE userId = ? AND channelId = ?`,
                [userID, channelID]
            );
        }
    } catch (err) {
        console.error('Failed to update muted channels: ', err);
    }
}

async function getUserMutedChannels(dbPool, userID) {
    try {
        const [rows] = await dbPool.query(
            `SELECT channelId FROM UserMutedChannels WHERE userId = ?`,
            [userID]
        );
        let result = [];
        for (let obj of rows) { // convert to an array of ints
            result.push(obj.channelId);
        }
        return result;
    } catch (err) {
        console.error('Failed to get muted channels: ', err);
    }
    return [];
}

//
async function updateUserName(dbPool, newUsername, userID) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument');}
    
    try {
        if (newUsername === undefined) { throw new Error('newUsername is required as an argument');}
        if (userID === undefined) { throw new Error('userID is required as an argument');}


        const oldUserInfo = await getPublicUserInfo(dbPool, userID);

        if (newUsername == oldUserInfo.username) {
            return;
        }
        // isUsernameTaken is case insenstive, and therefore if the user wants to only change the cases of their username an extra check is needed
        if ((oldUserInfo.username.toLowerCase() == oldUserInfo.username.toLowerCase()) == false ) {
            const isAlreadyUser = await isUsernameTaken(dbPool,newUsername);
            if (isAlreadyUser == true) {
                return 'taken';
            }
        }



        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET username = ? WHERE id = ?`
        await dbPool.query(query, [newUsername, userID]);

        // rename user pfp img, but only after a successful query
        const oldUserPFPdir = `public/profile-pictures/${oldUserInfo.username}.jpg`;
        // rename user pfp img, but only after a successful query
        const newUserPFPdir = `public/profile-pictures/${newUsername}.jpg`;
        fs.rename(oldUserPFPdir, newUserPFPdir, (err)=>{if (err) {console.error("Failed to update username:",err)}});

        await updateLastActive(dbPool,userID);
        
        return 'success'
    } catch (err) {
        console.error("Failed to updateUsername: ", err);
        return 'err';
    }
}

async function updateLastActive(dbPool, userID) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
    if (userID === undefined) { throw new Error('userID is required as an argument')}

    try {
        const updateLastActiveQuery = `UPDATE ${process.env.MYSQL_USER_TABLE} SET lastActive = ? WHERE id = ?`
        const now = new Date();
        const SQLdatetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
        await dbPool.query(updateLastActiveQuery, [SQLdatetime, userID]);
    } catch (err) {
        console.error(`Failed to update user w/ id ${userID} last active date: `, err);
        return false;
    }
}

async function updateUserDescription(dbPool, newUserDescription, userID) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}

    try {
        if (newUserDescription == undefined) {throw new Error('newUserDescription is required as an argument')}
        if (userID == undefined) {throw new Error('userID is required as an argument')}

        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET description = ? WHERE id = ?`
        await dbPool.query(query, [newUserDescription, userID]);

        await updateLastActive(dbPool,userID);
    } catch (err) {
        console.error('Failed to update user description: ', err);
    }
}

async function updateUserCountryCode(dbPool, CC, userID) {
    if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
    try {
        if (CC == undefined) {throw new Error('Country code is required as an argument')};
        if (userID == undefined) {throw new Error('userID is required as an argument')}

        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET countryCode = ? WHERE id = ?`
        await dbPool.query(query, [CC, userID]);

        await updateLastActive(dbPool,userID);
    } catch (err) {
        console.error('Failed to update user country code: ', err);
    }
}
async function getMessagesFromThread(dbPool, channelID, threadID) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (channelID === undefined) { throw new Error('channelID is required as an argument')}
        if (threadID === undefined) { throw new Error('threadID is required as an argument')}

        
        const messageTableName = getMessageTableNameFromThread(channelID,threadID);
        const query = `SELECT * FROM ${messageTableName};`;

        const [rows] = await dbPool.query(query);
        for (let row of rows) {
            const publicUser = await getPublicUserInfo(dbPool, row.ownerID);
            row.ownerUsername = publicUser.username;
            row.ownerHasProfilePicture = publicUser.hasProfilePicture;
            const date = new Date(row.date);
            row.date = date.toISOString();
        }
        return rows;

    } catch (err) {
        console.error("Failed to get messages from thread: ", err);
        return undefined;
    }
}

// note that chunkIndex starts from the bottom (most recent messages first)
// will return a null array if the index is out of bounds
async function getMessageChunkFromThread(dbPool, channelID, threadID, chunkIndex) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (channelID === undefined) { throw new Error('channelID is required as an argument')}
        if (threadID === undefined) { throw new Error('threadID is required as an argument')}
        if (chunkIndex === undefined) { throw new Error('chunkIndex is required as an argument')}

        const chunkSize = Number(process.env.MESSAGE_CHUNK_SIZE);
        const messageTableName = getMessageTableNameFromThread(channelID, threadID);

        const offset = chunkIndex * chunkSize;

        const [countResult] = await dbPool.query(`SELECT COUNT(*) AS count FROM ${messageTableName}`);
        const totalMessages = countResult[0].count;

        // Out of bounds check
        if (offset >= totalMessages) {
            return [];
        }

        //const rBegin = totalMessages - ((chunkIndex+1)*chunkSize) + 1;
        //let rEnd = totalMessages - (chunkIndex*chunkSize) + 1;
        const rBegin = roundTo(totalMessages - (chunkIndex*chunkSize) + 1, chunkSize);
        let rEnd = roundTo(totalMessages - ((chunkIndex-1)*chunkSize) + 1, chunkSize);
        if (rEnd < chunkSize) {
            rEnd = chunkSize;
        }

        const query = `
            SELECT * FROM ${messageTableName} WHERE id BETWEEN ? AND ? ORDER BY id DESC;
        `;

        const [rows] = await dbPool.query(query, [rBegin, rEnd]);

        for (let row of rows) {
            const publicUser = await getPublicUserInfo(dbPool, row.ownerID);
            row.ownerUsername = publicUser.username;
            row.ownerHasProfilePicture = publicUser.hasProfilePicture;
            row.date = row.date.toISOString();
        }
        return rows;
        
    } catch (err) {
        //console.error("Failed to get message chunk from thread: ", err);
        return undefined;
    }
}

async function addMessageToThread(dbPool, channelID, threadID, userID, messageContent, isReplyTo = null, imgData = null) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (channelID === undefined) { throw new Error('channelID is required as an argument')}
        if (threadID === undefined) { throw new Error('threadID is required as an argument')}
        if (userID === undefined) { throw new Error('userID is required as an argument')}
        if (messageContent === undefined) { throw new Error('messageContent is required as an argument')}

        const threadMessageTableName = getMessageTableNameFromThread(channelID,threadID);
        const query = `INSERT INTO ${threadMessageTableName} (ownerID, content, isReplyTo, hasImg, imgExt, date) VALUES (?, ?, ?, ?, ?, ?)`

        const now = new Date();
        //console.log('NOW: ', now.toISOString())
        const datetime = now.toISOString().slice(0, 19).replace('T', ' ') // converts to MySQL datetime
        //console.log('DATE: ', datetime)

        let hasImg = 0;
        let imgExt = null;
        if (imgData != null) {
            hasImg = 1;
            // Extract the image format from the data URI
            const match = imgData.match(/^data:image\/(png|jpg|jpeg|gif);base64,/);
            imgExt = match ? match[1] : 'png';  // Default to 'png' if not found
        }

        const [result] = await dbPool.query(query, [userID, messageContent, isReplyTo, hasImg, imgExt, datetime]);
        const messageID = result.insertId;
        //     const msgAttachDir = path.join('public/msgImgAttachments',`${channelID}`);

        if (imgData != null) {

            // Remove the data URI scheme prefix and decode the base64 data
            const base64Data = imgData.replace(/^data:image\/(png|jpg|jpeg|gif);base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            const filePath = path.join('public/msgImgAttachments', `${channelID}`, `${threadID}`, `${messageID}.${imgExt}`); // Save in the 'uploads' folder
            
            // Save the image file to disk
            fs.writeFile(filePath, imageBuffer, (err) => {
                if (err) {
                    console.error('Error saving image attachedd to a message:', err);
                } else {
                    //console.log(`Image saved to ${filePath}`);
                }
            });
        }

        await updateLastActive(dbPool,userID);

    } catch (err) {
        console.error(err);
        return new Error("Failed to add message to thread" + err.toString())
    }
}

async function deleteMessageFromThread(dbPool, channelID, threadID, messageID, ownerID) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (channelID === undefined) { throw new Error('channelID is required as an argument')}
        if (threadID === undefined) { throw new Error('threadID is required as an argument')}
        if (messageID === undefined) { throw new Error('messageID is required as an argument')}
        if (ownerID === undefined) { throw new Error('ownerID is required as an argument')}

        if (Number(channelID) == NaN) {return false;};
        if (Number(threadID) == NaN) {return false;};
        if (Number(messageID) == NaN) {return false;};
        if (Number(ownerID) == NaN) {return false;};


        const messageTable = getMessageTableNameFromThread(channelID, threadID);
        // first check to make sure that the user owns this message
        const getMessageAtIDquery = `SELECT * FROM ${messageTable} WHERE ownerID = ? AND id = ?`;
        const [rows] =  await dbPool.query(getMessageAtIDquery, [ownerID, messageID]);
        if (rows == undefined || rows.length > 1 || rows.length == 0) {
            throw new Error("Failed to delete message!");
        }
        // the user owns the message, proceed with deletion
        if (rows[0].ownerID == ownerID) { 
            const query = `DELETE FROM ${messageTable} WHERE id = ?`;
            await dbPool.query(query, [messageID]);
        }

        updateLastActive(dbPool, ownerID);

    } catch (err) {
        console.log("Failed to delete message from thread: ", err);
        return false;
    }
}

async function getMessageCountOfThread (dbPool, channelID, threadID) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (channelID === undefined) { throw new Error('channelID is required as an argument')}
        if (threadID === undefined) { throw new Error('threadID is required as an argument')}

        
        const messageTableName = getMessageTableNameFromThread(channelID,threadID);
        const query = `SELECT COUNT(*) FROM ${messageTableName};`;

        const [rows] = await dbPool.query(query);
        return rows[0]["COUNT(*)"];

    } catch (err) {
        console.error("Failed to get messages from thread: ", err);
        return undefined;
    }
}

async function giveUserProfilePicture(dbPool, userID) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (userID === undefined) { throw new Error('userID is required as an argument')}

        const query = `UPDATE ${process.env.MYSQL_USER_TABLE} SET hasProfilePicture = 1 WHERE id = ?`
        await dbPool.query(query, [userID]);
    } catch (err) {
        console.log("Error updating user pfp: ", err)
        return undefined;
    }
}

async function getUnreadPingsFromUser(dbPool, userID) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (userID === undefined) { throw new Error('userID is required as an argument')}

        `   Table UserUnreadPings:::
            id INT AUTO_INCREMENT PRIMARY KEY,
            userID INT NOT NULL,
            channelID INT NOT NULL,
            threadID INT NOT NULL,
            messageID INT NOT NULL,
            fromUser VARCHAR(${process.env.USERNAME_MAX_LENGTH}) NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userID) REFERENCES ${process.env.MYSQL_USER_TABLE}(id),
            FOREIGN KEY (channelID) REFERENCES ${process.env.MYSQL_CHANNEL_TABLE}(id)
        `
        const query = 'SELECT * FROM UserUnreadPings WHERE userID = ?'
        const [rows] = await dbPool.query(query, [userID]);
        if (rows == undefined) {
            rows = [];
        }
        return rows;
    } catch (err) {
        console.log('Error getting unread pings of user: ', err);
        return undefined;
    }
}


/* a ping struct is like so:
{
    from: <username>
    channelID: <number>
    threadID: <number>
    messageSlice: <string. 32 chars max>
    messageID: <number>
}
*/
async function addUnreadPingToUser(dbPool, userID, pingObj) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (userID === undefined) { throw new Error('userID is required as an argument')}
        if (pingObj === undefined) { throw new Error('pingObj is required as an argument')}
        
        `
            Table UserUnreadPings:::
            id INT AUTO_INCREMENT PRIMARY KEY,
            userID INT NOT NULL,
            channelID INT NOT NULL,
            threadID INT NOT NULL,
            messageID INT NOT NULL,
            fromUser VARCHAR(${process.env.USERNAME_MAX_LENGTH}) NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userID) REFERENCES ${process.env.MYSQL_USER_TABLE}(id),
            FOREIGN KEY (channelID) REFERENCES ${process.env.MYSQL_CHANNEL_TABLE}(id)
        `
        const query = 'INSERT INTO UserUnreadPings (userID, channelID, threadID, messageId, fromUser) VALUES (?,?,?,?,?)'
        await dbPool.query(query, [userID, pingObj.channelID, pingObj.threadID, pingObj.messageID, pingObj.from]);
    } catch (err) {
        console.error("Failed to add unread ping to user: ", err);
        return undefined;
    }
}

async function removeUnreadPingsOfUserFromThread(dbPool, userID, channelID, threadID) {
    try {
        if (dbPool === undefined) { throw new Error('dbPool is required as an argument')}
        if (userID === undefined) { throw new Error('userID is required as an argument')}
        if (channelID === undefined) { throw new Error('channelID is required as an argument')}
        if (threadID === undefined) { throw new Error('threadID is required as an argument')}

        const query = `DELETE FROM UserUnreadPings WHERE userID = ? AND channelID = ? AND threadID = ?`;
        await dbPool.query(query, [userID, channelID, threadID]);
    } catch (err) {
        console.error("Failed to remove unread ping of user: ", err);
        return undefined;
    }
}
export default {
    initDB, clearDB, initChannels, getChannelCount, registerUser, updateUserPassword,
    isEmailInUse, getUserByUsername, getUserFromID, isUsernameTaken, resetUserPasswordResetToken,
    setUserPasswordResetToken, createChannel, getChannels, addThreadToChannel, getThreadsFromChannel, 
    getThreadFromID, deleteThread, getDescriptionFromChannel, getPublicUserInfo,
    updateUserName, updateUserDescription, updateUserCountryCode, getMessagesFromThread, 
    getMessageChunkFromThread, addMessageToThread, deleteMessageFromThread, 
    getMessageCountOfThread, giveUserProfilePicture, updateUserMutedChannel, getUserMutedChannels,
    getUnreadPingsFromUser, addUnreadPingToUser, removeUnreadPingsOfUserFromThread
};