import authenticate from 'passport';
import bcrypt from 'bcrypt'
import passportLocal from 'passport-local'
import dbUtils from './databaseUtils.js'


const localStrategy = passportLocal.Strategy

let dbPool = undefined;

function initialize(_dbPool, passport, getUserByUsername, getUserById) {
    dbPool = _dbPool;
    const authenticateUser = async (username, password, done) => {
        const user = await dbUtils.getUserByUsername(dbPool, username);
        if (user == null) {
            return done(null, false, {message: 'No user with this email exists!'});
        }
        
        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, {message: 'Incorrect password'});
            }
        } catch (err) {
            return done(err);
        }
    }

    
    passport.use(new localStrategy({usernameField: 'username'}, authenticateUser ));
    passport.serializeUser((user, done) =>  { done (null, user.id)} );
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await dbUtils.getPublicUserInfo(dbPool, id);
            // Pass the user object to done() to populate req.user
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
}

export  {initialize};