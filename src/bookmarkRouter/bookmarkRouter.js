const express = require('express');
const bookmarkRouter = express.Router();
const bodyParser = express.json();
const uuid = require('uuid/v4');
const logger = require('../logger');

const bookmarksService = require('./bookmarksService');

// const bookmarks = [{
//     id: 1,
//     title: "I'm a bookmark!",
//     rating: 5,
//     url: 'http://www.thisisatotallylegitwebsite.bizbang',
//     description: 'All of the words are meeeeee'
// }]

bookmarkRouter
    .route('/api/bookmarks')
    .get((req, res) => {
        const db = req.app.get('db');
        bookmarksService.getAllBookmarks(db)
            .then(bm => {
                res.json(bm)
            })
            .catch(next)
    })
    .post(bodyParser, (req, res) => {
        const { title, url, rating, description } = req.body;

        if (!title) {
            logger.error('Title is required');
            return res.status(400).send('Invalid data')
        }
        if (!url) {
            logger.error('URL is required');
            return res.status(400).send('Invalid data')
        }
        if (!rating) {
            logger.error('Rating is required');
            return res.status(400).send('Invalid data')
        }
        if (!description) {
            logger.error('Description is required');
            return res.status(400).send('Invalid data')
        }
    
        const id = uuid();
        const bookmark = {
            id,
            title,
            rating,
            url,
            description
        };
        bookmarks.push(bookmark);
    
        logger.info(`Card with id ${id} created`);
        res.status(201).location(`http://localhost:8000/card/${id}`).json(bookmark);
    })

bookmarkRouter 
    .route('/api/bookmarks/:id')
    .get((req, res) => {
        const { id } = req.params;
        const bookmark = bookmarks.find(bm => bm.id == id);
        if (!bookmark) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send('Bookmark not found')
        }
        res.json(bookmark)
    })
    .delete((req, res) => {
        const { id } = req.params;

        const index = bookmarks.findIndex(bm => bm.id == id);
        if (index === -1) {
            logger.error(`Bookmark with id ${id} not found`);
            return res.status(404).send('not found');
        }
        bookmarks.splice(index, 1);
        logger.info(`Bookmark with id ${id} deleted.`);
        res.status(204).end();
   })

module.exports = bookmarkRouter;