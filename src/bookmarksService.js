const BookmarksService = {
    getAllBookmarks(db) {
        return db.select('*').from('bookmarks')
    },

    addBookmark(db, newBM) {
        return db
            .insert(newBM)
            .into('bookmarks')
            .returning('*')
            .then(rows => rows[0])
    },

    getBookmarkById(db, id) {
        return db
            .from('bookmarks')
            .select('*')
            .where('id', id)
            .first()
    },

    deleteById(db, id) {
        return db('bookmarks')
            .where({ id })
            .delete()
    },

    updateBookmark(db, id, newData) {
        return db('bookmarks')
            .where({ id })
            .update(newData)
    }
}

module.exports = BookmarksService;