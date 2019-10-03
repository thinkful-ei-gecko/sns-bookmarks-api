const express = require('express');
const bookmarkRouter = express.Router();
const parser = express.json();
const uuid = require('uuid/v4');
const xss = require('xss');

const logger = require('../logger');

const bookmarksService = require('../bookmarksService');

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    link: bookmark.link,
    details: xss(bookmark.details),
    rating: bookmark.rating,
  })

bookmarkRouter
    .route('/api/bookmarks')
    .get((req, res, next) => {
        const db = req.app.get('db');
        bookmarksService.getAllBookmarks(db)
            .then(bm => {
                res.json(bm)
            })
            .catch(next)
    })
    .post(parser, (req, res, next) => {
        const { title, link, rating, details } = req.body
        const newBM = {
            title: xss(title),
            link: link,
            rating: rating,
            details: xss(details)
        }

        for (const [key, value] of Object.entries(newBM)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `missing ${key} in request body` }
                })
            }
        }
        bookmarksService.addBookmark(
            req.app.get('db'), newBM)
            .then(bookmark => {
                res.status(201).location(`/api/bookmarks/${bookmark.id}`).json(bookmark)
            })
            .catch(next)
    })

bookmarkRouter
    .route('/api/bookmarks/:id')
    .all((req, res, next) => {
        bookmarksService.getBookmarkById(req.app.get('db'), req.params.id)
        .then(bm => {
            if (!bm) {
                return res.status(404).json({
                    error: { message: 'bookmark does not exist' }
                })
            }
            res.bm = bm
            next()
        })
        .catch(next)
    })
    .get((req, res) => {
        res.json(serializeBookmark(res.bm))
    })

    .delete((req, res, next) => {
        bookmarksService.deleteById(req.app.get('db'), req.params.id)
        .then(() => {
            res.status(204).end()
        })
        .catch(next)
    })

module.exports = bookmarkRouter;