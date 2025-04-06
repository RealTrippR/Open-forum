import '../../env.js'
import ejs from 'ejs';

import dbUtils from '../Server/databaseUtils.js'

import session from 'express-session'
import flash from 'express-flash'

import express from 'express'
const PORT = process.env.SERVER_PORT;

let passport;
let dbPool;

async function init(app, _dbPool, _passport) {
    dbPool = _dbPool
    passport = _passport;
    
    app.set('port', PORT);
    app.set('views', process.env.FRONT_END_DIR);
    app.set('view engine', 'ejs')
    app.engine('html', ejs.renderFile)
    app.use(express.static('public'));  // Ensure that static files are inside a "public" folder
    app.use(express.json());
    
    // init passport
    app.use(express.urlencoded({extended: false}))
    app.use(flash())
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    /******************** */
    // forum homepage
    app.get('/', async (req, res) => {
        try {
            const channels = await dbUtils.getChannels(dbPool);
            console.log(JSON.stringify(channels) );
            res.render('index.ejs', { channels: JSON.stringify(channels), debugINFO: JSON.stringify(req.isAuthenticated()) })
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    });

    app.get('/login',returnToHomepageIfAuthenticated, async (req, res) => {
        try {
            res.render('login.ejs');
        } catch (err) {
            console.err(err);
            res.status(500);
        }
    })

    app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/register', returnToHomepageIfAuthenticated, (req, res)  =>  {
        res.render('register.ejs');
    });

    app.post('/register', returnToHomepageIfAuthenticated, async (req,res) => {
        try {
            const registerRES = dbUtils.registerUser(dbPool, req.body.email, req.body.username,  req.body.password);
            if (typeof(registerRES)==='string' || registerRES===undefined) { // register user will return a string if it fails
                //res.pos // use socket to send error messages
            }
            console.log("Registered user: ", registerRES);
            res.redirect('/login');
            
        } catch (err) {
            res.redirect('/register');
            console.log("Error registering user: ", err)
        }
    })

    app.get('/users/:username', (req,res,next) => {
        const { username } = req.params;
        console.log("Attempted to get user with username: ", username)
        
        try {
            const authenticated = req.isAuthenticated();
            if (authenticated) {
                res.render('privateUserPage', {username: {name: req.user.username}})
            } else {
                res.render('publicUserPage');
            }
        } catch (err) {
            res.status(500);
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