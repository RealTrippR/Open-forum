import authenticate from 'passport';
import bcrypt from 'bcrypt'
import passportLocal from 'passport-local'


const localStrategy = passportLocal.Strategy


function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = getUserByEmail(email);
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
            return done(e);
        }
    }

    passport.use(new localStrategy({usernameField: 'email'},
        authenticateUser ));
    passport.serializeUser((user, done) =>  { done (null, user.id)} );
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    } );
}

export default {initialize};