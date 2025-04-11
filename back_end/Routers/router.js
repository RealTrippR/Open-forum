import '../../env.js'
import ejs from 'ejs';

import dbUtils from '../Server/databaseUtils.js'

import flash from 'express-flash'
import session from 'express-session'
import expressMysqlSession from 'express-mysql-session';


const MySQLStore = expressMysqlSession(session);
let sessionStore = undefined
let dbOptions = undefined;

import express from 'express'
const PORT = process.env.SERVER_PORT;

let passport;
let dbPool;
let io;

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
    //app.use(express.static('socket-io'));  // Ensure that static files are inside a "public" folder

    //app.use(express.json());
    
    // init passport
    app.use(express.urlencoded({extended: false}))
    app.use(flash())
    const TWO_HOURS = 1000 * 60 * 60 * 2
    // https://darifnemma.medium.com/how-to-store-session-in-mysql-database-using-express-mysql-session-ae2f67ef833e
    app.use(session({
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
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    /******************** */
    // forum homepage
    app.get('/', async (req, res) => {
        try {
            const channels = await dbUtils.getChannels(dbPool);

            const authenticated = await req.isAuthenticated();

            let currentUser = undefined;
            if ( authenticated && req.user != undefined) {
                currentUser = req.user;
            }
            res.render('index.ejs', { channels: JSON.stringify(channels), user: JSON.stringify(currentUser), loggedIn: JSON.stringify(authenticated)})
          
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
          if (!user) return res.redirect('/login');
      
          req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/');
          });
        })(req, res, next);
      });
    app.post('/login', (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
          if (err) return next(err);
          if (!user) return res.redirect('/login');
      
          req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/');
          });
        })(req, res, next);
      });

    app.get('/register', returnToHomepageIfAuthenticated, async (req, res)  =>  {
        const loggedIn = await req.isAuthenticated();
        res.render('register.ejs', {loggedIn: JSON.stringify(loggedIn)});
    });

    app.post('/register', returnToHomepageIfAuthenticated, async (req,res) => {
        try {
            const registerRES = await dbUtils.registerUser(dbPool, req.body.email, req.body.username,  req.body.password);
            if (typeof(registerRES)==='string' || registerRES===undefined) { // register user will return a string if it fails
                res.redirect('/login');
                res.redirect('/login');
                //res.pos // use socket to send error messages
            } else {
                console.log("Registered user: ", registerRES);
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
            try {
                const requestedUserPrivate = await dbUtils.getUserByUsername(dbPool, username);
                const requestedUserID = requestedUserPrivate.id;
                const requestedUser = await dbUtils.getPublicUserInfo(dbPool, requestedUserID);
                const loggedIn = await req.isAuthenticated();

                if (req.isAuthenticated() && requestedUser.username==req.user.username) {
                    res.render('privateUserPage.ejs', {user:  JSON.stringify(requestedUser), isPrivatePage: JSON.stringify(true), loggedIn: JSON.stringify(loggedIn)});
                    return;
                }
            } catch (err) {
                console.error(err);
            }
            res.render('publicUserPage.ejs', {user: JSON.stringify(requestedUser), isPrivatePage: JSON.stringify(false)});
        } catch (err) {
            console.error(err);
            console.error(err);
            res.status(500);
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

    app.get('/channels/:channelId/:threadId', async (req, res) => {
        try {
            const { channelId, threadId } = req.params;
        
            console.log("Channel ID:", channelId);
            console.log("Thread ID:", threadId);
            
            //const messages = await dbUtils.getMessagesFromThread();
            res.render('thread.ejs', {user: JSON.stringify(req.user), threadID: JSON.stringify(threadId)});
            //res.status(200).send();

        } catch (err) {
            const { channelId, threadId } = req.params;
            console.error(`Failed to fetch thread #${channelId} of channel #${threadId}`, err);
            res.status(500).send();
            return;
        }
    });
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




    /******************************************************** */
    /* SOCKET IO */

 

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