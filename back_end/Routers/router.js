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
            res.render('index.ejs', { channels: JSON.stringify(channels) })
        } catch (err) {
            console.error(err);
            res.status(500);
        }
    });

    app.get('/login', async (req, res) => {
        try {
            res.render('login.ejs');
        } catch (err) {
            console.err(err);
            res.status(500);
        }
    })

    app.post('/login',(req,res,next) => {
        console.log("Recieved login request");
        checkNotAuthenticated(req,res,next);
    },
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    }));
}
    
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    // they are not logged in yet, send them to the login page
    res.redirect('/login');
}

function checkNotAuthenticated(req,res,next) {
    if (req.isAuthenticated()) {
       return res.redirect('/');
    }
    next();
}

export default {init}