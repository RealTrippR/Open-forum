import '../../env.js'
import ejs from 'ejs';

import dbUtils from '../Server/databaseUtils.js'

import express from 'express'
const PORT = process.env.SERVER_PORT;

let dbPool;

async function init(app, _dbPool) {
    dbPool = _dbPool
    app.set('port', PORT);
    app.set('views', process.env.FRONT_END_DIR);
    app.set('view engine', 'ejs')
    app.engine('html', ejs.renderFile)
    app.use(express.static('public'));  // Ensure your static files are inside a "public" folder
    app.use(express.json()); // ✅ Enable JSON parsing
    // forum homepage
    app.get('/', async (req, res) => {
        try {
            const channels = await dbUtils.getChannels(dbPool);
            console.log(JSON.stringify(channels) );
            res.render('index.ejs', { channels: JSON.stringify(channels) })
        } catch (error) {
            console.error(error);
            res.status(500).send("Error loading channels");
        }
    });
}

export default {init};