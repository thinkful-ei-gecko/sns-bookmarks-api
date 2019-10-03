makeTestBookmarks = () => {
    return [
        {
            id: 1,
            title: 'google',
            link: 'https://www.google.com',
            rating: "5",
            details: 'words words words words',
        },
        {
            id: 2,
            title: 'poogle',
            link: 'https://www.poogle.com',
            rating: "5",
            details: 'different words words words words',
        },
        {
            id: 3,
            title: 'zoogle',
            link: 'https://www.zoogle.com',
            rating: "5",
            details: 'All the words words words words',
        },
    ];
}

module.exports = {
    makeTestBookmarks,
};