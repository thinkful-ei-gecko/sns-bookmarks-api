DROP TABLE IF EXISTS bookmarks;

CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    rating numeric,
    details TEXT
);