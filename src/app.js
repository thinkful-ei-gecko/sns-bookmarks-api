require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./logger');

const { NODE_ENV } = require('../test/config');
const bookmarksService = require('./bookmarksService');
const bookmarkRouter = require('./bookmarkRouter/bookmarkRouter');

const app = express();
const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';
app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

// app.use(function validateBearerToken(req, res, next) {
//     const apiToken = process.env.API_TOKEN;
//     console.log(apiToken);
//     const authToken = req.get('Authorization');
//     console.log(authToken)
//     if (!authToken || authToken.split(' ')[1] !== apiToken) {
//         logger.error(`Unauthorized request to path: ${req.path}`);
//         return res.status(401).json({ error: 'Unauthorized request'});
//     }
//     next();
// })

app.get('/', (req, res) => {
    res.send('Hello, world')
})

app.get('/api/bookmarks', (req, res, next) => {
    const db = req.app.get('db');
    bookmarksService.getAllBookmarks(db)
        .then(bm => {
            res.json(bm)
        })
        .catch(next)
})

app.get('/api/bookmarks/:id', (req, res, next) => {
    const db = req.app.get('db');
    bookmarksService.getBookmarkById(db, req.params.id)
        .then(bm => {
            if (!bm) {
                return res.status(404).json({
                    error: { message: 'Bookmark does not exist' }
                })
            }
            res.json(bm)
        })
        .catch(next)
})

//app.use(bookmarkRouter);

app.use(function errorHandler(error, req, res, next) {
    let response;
    if (NODE_ENV === 'production') {
        console.error(error);
        response = { error: { message: 'server error' } }
    } else {
        console.error(error);
        response = { message: error.message, error }
    }
    res.status(500).json(response);
})

module.exports = app;