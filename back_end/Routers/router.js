import '../../env.js'
import ejs from 'ejs';

import dbUtils from '../Server/databaseUtils.js'

import flash from 'express-flash'
import session from 'express-session'
import expressMysqlSession from 'express-mysql-session';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import nodemailer from 'nodemailer';


const MySQLStore = expressMysqlSession(session);
let sessionStore = undefined
let dbOptions = undefined;

import express from 'express'
const PORT = process.env.SERVER_PORT;

let passport;
let dbPool;
let io;
  

function newNonce() {
    return crypto.randomBytes(16).toString('base64');
}

function addNonceToRes(res) {
    const nonce = newNonce();
    res.locals.nonce = '"'+nonce+'"';
    res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self'; style-src  'self'; img-src 'self' blob:;`);
    //res.setHeader("Content-Security-Policy", `script-src 'self' 'nonce-${nonce}'`);
    //res.setHeader("Content-Security-Policy", `default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` );
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

async function init(app,_dbOptions, _dbPool, _passport, _io) {
    dbOptions = _dbOptions;
    sessionStore = new MySQLStore(dbOptions);

    dbPool = _dbPool
    passport = _passport;
    io = _io;
    
    app.set('port', PORT);
    app.set('views', process.env.FRONT_END_DIR);
    app.set('view engine', 'ejs')
    app.use(express.static('public'));  // Ensure that static files are inside a "public" folder
    app.use(express.static('socket-io'));  // Ensure that static files are inside a "public" folder

    app.use(express.json());
    
    // init passport
    app.use(express.urlencoded({extended: false}))
    app.use(flash())
    const TWO_HOURS = 1000 * 60 * 60 * 2

    // https://darifnemma.medium.com/how-to-store-session-in-mysql-database-using-express-mysql-session-ae2f67ef833e

    const middleWare = session({
        name: process.env.SESSION_NAME,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
            maxAge:  1000 * 60 * 60 * 24 * 365 /* 1 year */,
            sameSite: 'Lax',
            secure: false
        }
    })

    /*********************************************************/
    /* SOCKET IO */

    function onlyForHandshake(middleware) {
        return (req, res, next) => {
            const isHandshake = req._query.sid === undefined;
            if (isHandshake) {
            middleware(req, res, next);
            } else {
            next();
            }
        };
    }
        
    io.engine.use(onlyForHandshake(middleWare));
    io.engine.use(onlyForHandshake(passport.session()));
    io.engine.use(
        onlyForHandshake((req, res, next) => {
            next();
        }),
    );

    /*********************************************************/

    app.use(middleWare);
    app.use(passport.initialize());
    app.use(passport.session());

    /*********************************************************/
    if (process.env.NODE_ENV != 'development') {
        // stall brute force attacks
        const limiter = rateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 30, // Limit each IP to 30 visits per window
            message: 'Too many requests, please try again later.',
        });

        app.use(`${process.env.SERV_URL}/register`, limiter);
        app.use(`${process.env.SERV_URL}/login`, limiter);
        app.use(`${process.env.SERV_URL}/request-password-reset`, limiter);
        app.use(`${process.env.SERV_URL}/reset-password`, limiter);
    }

    
    /******************** */
    // forum homepage
    app.get(`${process.env.SERV_URL}/`, async (req, res) => {
        try {
            const channels = await dbUtils.getChannels(dbPool);

            const authenticated = await req.isAuthenticated();

            let currentUser = undefined;
            if ( authenticated && req.user != undefined) {
                currentUser = req.user;
                const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username)
                const unreadPings = await dbUtils.getUnreadPingsFromUser(dbPool, privUser.id);
                currentUser.unreadPings = unreadPings;
            }

            addNonceToRes(res);
            res.render('index.ejs', {baseURL: process.env.BASE_URL,messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), maxImgSize: process.env.MAX_ATTACHED_IMG_SIZE})
          
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    });

    app.get(`${process.env.SERV_URL}/login`,returnToHomepageIfAuthenticated, async (req, res) => {
        try {
            if (req.isAuthenticated()) {
                res.redirect(`${process.env.BASE_URL}/`);
            }
            const loggedIn = await req.isAuthenticated();

            addNonceToRes(res);
            res.render('login.ejs', {baseURL: process.env.BASE_URL,loggedIn: JSON.stringify(loggedIn)});
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    })

    app.post(`${process.env.SERV_URL}/login`, (req, res, next) => {
        
        passport.authenticate('local', (err, user, info) => {
            if (err) return next(err);
            //if (!user) return res.redirect(401, '/login');
            if (!user) {return res.status(401).send() };

            req.logIn(user, (err) => {
                if (err) {return next(err)};
                return res.redirect(`${process.env.BASE_URL}/`);
            });
        
            // req.logIn(user, (err) => {
            //     if (err) return next(err);
            //     return res.redirect('/');
            // });
        })(req, res, next);
    });

    app.get(`${process.env.SERV_URL}/register`, returnToHomepageIfAuthenticated, async (req, res)  =>  {
        const loggedIn = await req.isAuthenticated();
        addNonceToRes(res);
        res.render('register.ejs', {baseURL: process.env.BASE_URL,loggedIn: JSON.stringify(loggedIn)});
    });

    app.post(`${process.env.SERV_URL}/register`, returnToHomepageIfAuthenticated, async (req,res) => {
        try {
            if (req.body.username.length < process.env.USERNAME_MIN_LENGTH ||  req.body.password.length < process.env.PASSWORD_MIN_LENGTH) {
                return res.status(400).send();
            }
            if (req.body.username.length > process.env.USERNAME_MAX_LENGTH) {
                return res.status(400).send();
            }
            const emailTaken = await dbUtils.isEmailInUse(dbPool, req.body.email);
            if (emailTaken == true) {
                return res.status(409).send() // email conflict, username conflict is handled seperately
            }

            
            const registerRES = await dbUtils.registerUser(dbPool, req.body.email, req.body.username,  req.body.password);
            if (typeof(registerRES)==='string' || registerRES===undefined) { // register user will return a string if it fails
                res.redirect(`${process.env.BASE_URL}/login`);
                //res.pos // use socket to send error messages
            } else {
                //console.log("Registered user: ", registerRES);
                res.redirect(`${process.env.BASE_URL}/login`);
            }
        } catch (err) {
            res.redirect(`${process.env.BASE_URL}/register`);
            console.log("Error registering user: ", err)
        }
    })

    app.get(`${process.env.SERV_URL}/users/:username`, async (req,res,next) => {
        const { username } = req.params;
        
        try {
            const requestedUserPrivate = await dbUtils.getUserByUsername(dbPool, username);
            if (requestedUserPrivate == undefined) { // user does not exist
                return res.status(404).send();
            } 
            const requestedUserID = requestedUserPrivate.id;
            const loggedIn = await req.isAuthenticated();
            const requestedUser = await dbUtils.getPublicUserInfo(dbPool, requestedUserID,loggedIn);

            let currentUserPublic = undefined;
            if (req.isAuthenticated()) {
                const currentUserPriv =  await dbUtils.getUserByUsername(dbPool, req.user.username);
                currentUserPublic = await dbUtils.getPublicUserInfo(dbPool, currentUserPriv.id);
            }

            addNonceToRes(res);
            if (currentUserPublic!=undefined && requestedUser.username==req.user.username) {
                res.render('userPage.ejs', {baseURL: process.env.BASE_URL,viewingUser:  JSON.stringify(requestedUser), user: JSON.stringify(currentUserPublic), isPrivatePage: true, loggedIn: JSON.stringify(loggedIn)});
                return;
            }
            res.render('userPage.ejs', {baseURL: process.env.BASE_URL,messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, viewingUser: JSON.stringify(requestedUser), user: JSON.stringify(currentUserPublic), isPrivatePage: false, loggedIn: loggedIn});
        } catch (err) {
            console.error(err);
            res.status(500).send();
            return;
        }
    });


    app.post(`${process.env.SERV_URL}/logout`, (req, res) => {
        try {
            req.logout(function(err) {
                if (err) {
                    console.error('Error logging out:', err);
                    return res.status(500).send('Logout failed.');
                }
                // After logout is successful, redirect to /login
                res.redirect(`${process.env.BASE_URL}/login`);
            });
        } catch (err) {
            console.log(`Error logging out user: `, err);
            res.status(500).send();
        }
    });

    // load channel from URL
    app.get(`${process.env.SERV_URL}/channels/:channelId`, async (req,res) => {
        try {
            const { channelId } = req.params;

            if (isNumeric(channelId) == false) {
                return;
            } 

            const channels = await dbUtils.getChannels(dbPool);

            const authenticated = await req.isAuthenticated();

            
            let currentUser = undefined;
            if ( authenticated && req.user != undefined) {
                currentUser = req.user;
                const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username)
                const unreadPings = await dbUtils.getUnreadPingsFromUser(dbPool, privUser.id);
                currentUser.unreadPings = unreadPings;
            }

            addNonceToRes(res);
            res.render('index.ejs', {baseURL: process.env.BASE_URL,messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), loadChannel: channelId, maxImgSize: process.env.MAX_ATTACHED_IMG_SIZE})
          
        } catch (err) {
            console.error("Failed to load channel page: ", err);
            res.status(500).send();
        }
    });

    // load thead from URL
    app.get(`${process.env.SERV_URL}/channels/:channelId/:threadId`, async (req, res) => {
        try {
            const { channelId, threadId} = req.params;

            if ((isNumeric(channelId) && isNumeric(threadId)) == false) {
                return res.send();
            } 
            const channels = await dbUtils.getChannels(dbPool);

            const authenticated = await req.isAuthenticated();

            let currentUser = undefined;
            if ( authenticated && req.user != undefined) {
                currentUser = req.user;
                const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username)
                const unreadPings = await dbUtils.getUnreadPingsFromUser(dbPool, privUser.id);
                currentUser.unreadPings = unreadPings;
            }

            addNonceToRes(res);
            res.render('index.ejs', {baseURL: process.env.BASE_URL,messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), loadChannel: channelId, loadThread: threadId, maxImgSize: process.env.MAX_ATTACHED_IMG_SIZE})
          
        } catch (err) {
            console.error("Failed to load thread page: ", err);
            res.status(500).send();
        }
    });
    // load message from URL
    app.get(`${process.env.SERV_URL}/channels/:channelId/:threadId/messages/:messageID`, async (req, res) => {
        try {
            const { channelId, threadId, messageID} = req.params;
            if ((isNumeric(channelId) && isNumeric(threadId) && isNumeric(messageID)) == false) {
                return res.status(400).send();
            } 
            const channels = await dbUtils.getChannels(dbPool);

            const authenticated = await req.isAuthenticated();

            let currentUser = undefined;
            if ( authenticated && req.user != undefined) {
                currentUser = req.user;
                const privUser = await dbUtils.getUserByUsername(dbPool, req.user.username)
                const unreadPings = await dbUtils.getUnreadPingsFromUser(dbPool, privUser.id);
                currentUser.unreadPings = unreadPings;
            }

            addNonceToRes(res);
            res.render('index.ejs', {baseURL: process.env.BASE_URL,messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), loadChannel: channelId, loadThread: threadId, loadMessage: messageID, maxImgSize: process.env.MAX_ATTACHED_IMG_SIZE})
          
        } catch (err) {
            console.error("Failed to load thread page: ", err);
            res.status(500).send();
        }
    });


    /****************************************************/
    // password reset system //
    { 
        // Email setup (email SMTP)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            secure: true,
            auth: {
            user: process.env.STMP_EMAIL,
            pass: process.env.STMP_PASSWORD
            }
        });
        
        app.get(`${process.env.SERV_URL}/request-password-reset`, (req, res) => {
            addNonceToRes(res);
            res.render('request-password-reset.ejs', {baseURL: process.env.BASE_URL});
        });
        app.post(`${process.env.SERV_URL}/request-password-reset`, async (req, res) => {
            try {
                const { username, email} = req.body;
                if (typeof(username) !== "string") {return res.status(400).send()};

                const user = await dbUtils.getUserByUsername(dbPool, username);
            
                if (user==undefined) {return res.status(400).send()};
                if (user.email != email) {return res.status(400).send()};
                // Check if token was already used
                // if (user.resetTokenUsed == true) {
                //     return res.status(410).send('Password reset already done.');
                // }
            
                // Generate reset token
                const token = crypto.randomBytes(64).toString('hex');
                const expiration = new Date(Date.now() + 15 * 60000); // Token expires in 15 mins

                const tmpRes = await dbUtils.setUserPasswordResetToken(dbPool, user.id, token, expiration);
                if (tmpRes == false) {
                    return res.status(500).send();
                }
            
                
                const protocol = req.protocol; // 'http' or 'https'
                const host = req.get('host');  // current domain

                        // Send reset email
                const resetLink = `${process.env.BASE_URL}/reset-password?username=${username}&token=${token}`;
                transporter.sendMail({
                    to: user.email,
                    subject: 'Password Reset',
                    html: `
                        <H2 style='color: black'> OPEN-FORUM </H2>
                        <p style="color: red;">DO NOT SHARE THIS LINK WITH ANYONE. <BR> It will expire in 15 minutes.</p>
                        <p style='color: black'>Click the link below to reset your password:</p>
                        <a href="${resetLink}">${resetLink}</a>
                        `
                });
            
                return res.status(200).send()
            } catch (err) {
                console.error('Password reset request failure: ', err)
                return res.status(500).send();
            }
        });

                
        app.get(`${process.env.SERV_URL}/reset-password`, (req, res) => {
            addNonceToRes(res);
            res.render('reset-password.ejs', {baseURL: process.env.BASE_URL});
        });
        app.post(`${process.env.SERV_URL}/reset-password`, async(req, res) => {
            try {
                const { username, token, newPassword } = req.body;
                const user = await dbUtils.getUserByUsername(dbPool, username);
                
                if (user == undefined) { return res.status(400).send('Invalid username'); }
                if (newPassword == undefined) { return res.status(400).send('Invalid password'); }
                // Validate token
                if (user.resetToken !== token || user.resetTokenExpiration < Date.now()) {
                    return res.status(401).send('Invalid token');
                }
            
                let tmpRes = await dbUtils.resetUserPasswordResetToken(dbPool, user.id);
                if (tmpRes == false) {return res.status(500).send();}
                tmpRes = await dbUtils.updateUserPassword(dbPool, user.id, newPassword);
                if (tmpRes == false) {return res.status(500).send();}
            
                return res.status(200).send();
            } catch (err) {
                console.error('Password reset failure: ', err)
                return res.status(500).send();
            }
        });
    }
    
}

function returnToHomepageIfAuthenticated (req,res,next) {
    try {
        if (req.isAuthenticated()) {
            return res.redirect(`${process.env.BASE_URL}/`);
        }
        next();
    } catch {
        next();
    }
}
/*
function checkAuthenticated(req, res, next) {
    try {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect(`${process.env.BASE_URL}/login`);
    } catch {
        // they are not logged in yet, send them to the login page
        res.redirect(`${process.env.BASE_URL}/login`);
    }
}

function checkNotAuthenticated(req,res,next) {
    try {
        if (req.isAuthenticated()) {
        return res.redirect(`${process.env.BASE_URL}/`);
        }
        next();
    } catch {
        next();
    }
}
*/



export default {init}