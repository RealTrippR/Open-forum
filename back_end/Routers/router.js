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
    //app.engine('html', ejs.renderFile)
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
            //maxAge: TWO_HOURS,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production' // setting secure to true breaks session functionality, but why? Also, it should be fine as long as the server is running on https
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
            if (req.user) { // check if logged in
            next();
            } else { // if not logged in, return 401 Unauthorized error
            res.writeHead(401);
            res.end();
            }
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
            windowMs: 10 * 60 * 1000, // 10 minutes
            max: 10, // Limit each IP to 10 requests per window
            message: 'Too many requests, please try again later.',
        });

        app.use('/register', limiter);
        app.use('/login', limiter);
        app.use('/request-password-reset', limiter);
        app.use('/reset-password', limiter);
    }

    
    /******************** */
    // forum homepage
    app.get('/', async (req, res) => {
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
            res.render('index.ejs', {messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated)})
          
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    });

    app.get('/login',returnToHomepageIfAuthenticated, async (req, res) => {
        try {
            if (req.isAuthenticated()) {
                res.redirect('/');
            }
            const loggedIn = await req.isAuthenticated();
            res.render('login.ejs', {loggedIn: JSON.stringify(loggedIn)});
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    })

    app.post('/login', (req, res, next) => {
        
        passport.authenticate('local', (err, user, info) => {
            if (err) return next(err);
            //if (!user) return res.redirect(401, '/login');
            if (!user) {return res.status(401).send() };

            req.logIn(user, (err) => {
                if (err) return next(err);
                return res.redirect('/');
            });
            // if (err) return next(err);
            // if (!user) return res.redirect('/login');
        
            // req.logIn(user, (err) => {
            //     if (err) return next(err);
            //     return res.redirect('/');
            // });
        })(req, res, next);
    });

    app.get('/register', returnToHomepageIfAuthenticated, async (req, res)  =>  {
        const loggedIn = await req.isAuthenticated();
        res.render('register.ejs', {loggedIn: JSON.stringify(loggedIn)});
    });

    app.post('/register', returnToHomepageIfAuthenticated, async (req,res) => {
        try {
            if (req.body.username.length < process.env.USERNAME_MIN_LENGTH ||  req.body.password.length < process.env.PASSWORD_MIN_LENGTH) {
                return res.status(400).send();
            }
            if (req.body.username.length > process.env.USERNAME_MAX_LENGTH) {
                return res.status(400).send();
            }
            const registerRES = await dbUtils.registerUser(dbPool, req.body.email, req.body.username,  req.body.password);
            if (typeof(registerRES)==='string' || registerRES===undefined) { // register user will return a string if it fails
                res.redirect('/login');
                //res.pos // use socket to send error messages
            } else {
                //console.log("Registered user: ", registerRES);
                res.redirect('/login');
            }
        } catch (err) {
            res.redirect('/register');
            console.log("Error registering user: ", err)
        }
    })

    app.get('/users/:username', async (req,res,next) => {
        const { username } = req.params;
        
        try {
            const requestedUserPrivate = await dbUtils.getUserByUsername(dbPool, username);
            if (requestedUserPrivate == undefined) { // user does not exist
                return res.status(404).send();
            } 
            const requestedUserID = requestedUserPrivate.id;
            const requestedUser = await dbUtils.getPublicUserInfo(dbPool, requestedUserID);
            const loggedIn = await req.isAuthenticated();

            if (req.isAuthenticated() && requestedUser.username==req.user.username) {
                res.render('userPage.ejs', {user:  JSON.stringify(requestedUser), isPrivatePage: true, loggedIn: JSON.stringify(loggedIn)});
                return;
            }
            res.render('userPage.ejs', {messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, user: JSON.stringify(requestedUser), isPrivatePage: false, loggedIn: loggedIn});
        } catch (err) {
            console.error(err);
            res.status(500).send();
            return;
        }
    });


    app.post('/logout', (req, res) => {
        try {
            req.logout(function(err) {
                if (err) {
                    console.error('Error logging out:', err);
                    return res.status(500).send('Logout failed.');
                }
                // After logout is successful, redirect to /login
                res.redirect('/login');
            });
        } catch (err) {
            console.log(`Error logging out user: `, err);
            res.status(500).send();
        }
    });

    // load channel from URL
    app.get('/channels/:channelId', async (req,res) => {
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
            res.render('index.ejs', {messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), loadChannel: channelId})
          
        } catch (err) {
            console.error("Failed to load channel page: ", err);
            res.status(500).send();
        }
    });

    // load thead from URL
    app.get('/channels/:channelId/:threadId', async (req, res) => {
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
            res.render('index.ejs', {messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), loadChannel: channelId, loadThread: threadId})
          
        } catch (err) {
            console.error("Failed to load thread page: ", err);
            res.status(500).send();
        }
    });
    // load message from URL
    app.get('/channels/:channelId/:threadId/messages/:messageID', async (req, res) => {
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
            res.render('index.ejs', {messageChunkSize: process.env.MESSAGE_CHUNK_SIZE, channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated), loadChannel: channelId, loadThread: threadId, loadMessage: messageID})
          
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
            user: "openforummessenger@gmail.com",  // gmail
            pass: "tacqtcpcpccdhcng"   // password
            }
        });
        
        app.get('/request-password-reset', (req, res) => {
            res.render('request-password-reset.ejs');
        });
        app.post('/request-password-reset', async (req, res) => {
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
                const resetLink = `${protocol}://${host}/reset-password?username=${username}&token=${token}`;
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

                
        app.get('/reset-password', (req, res) => {
            res.render('reset-password.ejs');
        });
        app.post('/reset-password', async(req, res) => {
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
            return res.redirect('/');
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
        res.redirect('/login');
    } catch {
        // they are not logged in yet, send them to the login page
        res.redirect('/login');
    }
}

function checkNotAuthenticated(req,res,next) {
    try {
        if (req.isAuthenticated()) {
        return res.redirect('/');
        }
        next();
    } catch {
        next();
    }
}
*/



export default {init}