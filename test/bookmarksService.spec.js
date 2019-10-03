require('dotenv').config();
//const { expect } = require('chai');
const supertest = require('supertest');

const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeTestBookmarks } = require('./bookmarks.fixtures');

describe(`Articles endpoints`, () => {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db);
    })
    after('disconnect from db after test', () => db.destroy());
    before('clean the table', () => db('bookmarks').truncate());
    afterEach('cleanup', () => db('bookmarks').truncate());

    context(`given bookmarks are present`, () => {
        const testBMs = makeTestBookmarks();

        beforeEach('insert test BMs', () => db.into('bookmarks').insert(testBMs));

        it('GET /api/bookmarks responds with 200 and bookmarks', () => {
            return supertest(app)
                .get('/api/bookmarks')
                .expect(200, testBMs)
        })
        it('GET /api/bookmarks/:bmId responds with 200 and the bookmark', () => {
            const testId = 2;
            const expectedBM = testBMs[testId - 1];
            return supertest(app)
                .get(`/api/bookmarks/${testId}`)
                .expect(200, expectedBM)
        })

        context('given an XSS attack bookmark', () => {
            const maliciousBM = {
                id: 911,
                title: 'Naughty naughty very naughty <script>alert("xss");</script>',
                link: 'http://www.test.com',
                rating: '4',
                details: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
            }

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBM])
            })
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBM.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                        expect(res.body.details).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
                    })
            })
        })
    })

    describe('GET /api/bookmarks', () => {
        context('Given no bookmarks', () => {
            it('responds with 200 and an empy list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, [])
            })
        })
    })

    describe('GET /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const testId = 666666666;
                return supertest(app)
                    .get(`/api/bookmarks/${testId}`)
                    .expect(404, { error: { message: 'bookmark does not exist' } })
            })
        })
    })

    describe('POST /api/bookmarks', () => {
        it('creates a new bookmarks, responds with 201 and the new article', () => {

            const testBM = {
                title: 'test title',
                link: 'http://www.test.com',
                rating: '4',
                details: 'I am a new bookmarks for testing purposes'
            }

            return supertest(app)
                .post('/api/bookmarks')
                .send(testBM)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(testBM.title)
                    expect(res.body.link).to.eql(testBM.link)
                    expect(res.body.rating).to.eql(testBM.rating)
                    expect(res.body.details).to.eql(testBM.details)
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(postRes =>
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .expect(postRes.body)
                )
        })

        it('sanitizes XSS attacks on POST', () => {
            const maliciousBM = {
                id: 911,
                title: 'Naughty naughty very naughty <script>alert("xss");</script>',
                link: 'http://www.test.com',
                rating: '4',
                details: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
            }
            return supertest(app)
            .post('/api/bookmarks')
            .send(maliciousBM)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                expect(res.body.link).to.eql(maliciousBM.link)
                expect(res.body.rating).to.eql(maliciousBM.rating)
                expect(res.body.details).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
                expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
            })
            .then(postRes =>
                supertest(app)
                    .get(`/api/bookmarks/${postRes.body.id}`)
                    .expect(postRes.body)
            )
        })

        it('responds with 400 and an error when the title is missing', () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: null,
                    link: 'http://www.test.com',
                    rating: '4',
                    details: 'I am a new bookmarks for testing purposes'
                })
                .expect(400, {
                    error: { message: 'missing title in request body' }
                })
        })

        it('responds with 400 and an error when the link is missing', () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: 'test title',
                    rating: '4',
                    details: 'I am a new bookmarks for testing purposes'
                })
                .expect(400, {
                    error: { message: 'missing link in request body' }
                })
        })

        it('responds with 400 and an error when the rating is missing', () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: 'test title',
                    link: 'http://www.test.com',
                    details: 'I am a new bookmarks for testing purposes'
                })
                .expect(400, {
                    error: { message: 'missing rating in request body' }
                })
        })
    })

    describe('DELETE /api/bookmarks/:id', () => {
        context('Given there are bookmarks', () => {
            const testBMs = makeTestBookmarks();
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBMs)
            })

            it('responds with 204 and remove the bookmark', () => {
                const testId = 2;
                const expectedRes = testBMs.filter(bm => bm.id !== testId);
                return supertest(app)
                    .delete(`/api/bookmarks/${testId}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get('/api/bookmarks')
                            .expect(expectedRes)
                    })
            })
        })
        context('Given there are no bookmarks', () => {
            it('responds with 404', () => {
                const testId = 12345;
                return supertest(app)
                    .delete(`/api/bookmarks/${testId}`)
                    .expect(404, { error: { message: 'bookmark does not exist' }})
            })
        })
    })
})




// require('dotenv').config();
// const { expect } = require('chai');
// const supertest = require('supertest');
// const ShoppingListService = require('../src/shopping-list-service')
// const knex = require('knex');

// describe('Shopping List Service', () => {
//     let db;
//     let testItems = [
//         {
//             id: 1,
//             name: 'banana',
//             checked: false,
//             price: "0.50",
//             category: 'Snack',
//             date_added: new Date('2120-04-22T16:28:32.615Z')
//         },
//         {
//             id: 2,
//             name: 'fish',
//             checked: false,
//             price: "12.00",
//             category: 'Lunch',
//             date_added: new Date('2100-05-22T16:28:32.615Z'),
//         },
//         {
//             id: 3,
//             name: 'meat?',
//             checked: false,
//             price: "99.00",
//             category: 'Main',
//             date_added: new Date('1919-12-22T16:28:32.615Z'),
//         },
//     ]

//     before(() => {
//         db = knex({
//             client: 'pg',
//             connection: 'postgresql://dunder_mifflin:asdf@localhost/knex-practice-test'
//         })
//     })
//     after(() => db.destroy())
//     before(() => db('shopping_list').truncate());
//     afterEach(() => db('shopping_list').truncate());

//     context(`given 'shopping_list' has data`, () => {
//         beforeEach(() => {
//             return db
//                 .into('shopping_list')
//                 .insert(testItems)
//         })
//         it('resolves all items from db', () => {
//             return ShoppingListService.getAllItems(db)
//                 .then(actual => {
//                     expect(actual).to.eql(testItems)
//                 })
//         })

//         it(`getItemById() resolves an item by id`, () => {
//             const testId = 3;
//             const testItem = testItems[testId - 1];
//             return ShoppingListService.getItemById(db, testId)
//                 .then(actual => {
//                     expect(actual).to.eql({
//                         id: testId,
//                         name: testItem.name,
//                         checked: testItem.checked,
//                         price: testItem.price,
//                         category: testItem.category,
//                         date_added: testItem.date_added,
//                     })
//                 })
//         })

//         it(`deleteById() remove an item by id`, () => {
//             const testId = 3;
//             return ShoppingListService.deleteById(db, testId)
//                 .then(() => ShoppingListService.getAllItems(db))
//                 .then(allItems => {
//                     const expected = testItems.filter(item => item.id !== testId)
//                     expect(allItems).to.eql(expected)
//                 })
//         })

//         it(`updateItem() updates an article by id`, () => {
//             const testId = 3
//             const newItem = {
//                 name: 'updated item',
//                 checked: false,
//                 price: "12.00",
//                 category: 'Lunch',
//                 date_added: new Date(),
//             }
//             return ShoppingListService.updateItem(db, testId, newItem)
//                 .then(() => ShoppingListService.getItemById(db, testId))
//                 .then(item => {
//                     expect(item).to.eql({ id: testId, ...newItem })
//                 })
//         })
//     })

//     context(`Given 'shopping_list' has no data`, () => {
//         it(`getAllItems() resolves an empty array`, () => {
//             return ShoppingListService.getAllItems(db)
//                 .then(actual => {
//                     expect(actual).to.eql([])
//                 })
//         })
//         it(`addItem() inserts an item and resolves it with id`, () => {

//             const newItem = {
//                 name: 'added item',
//                 checked: false,
//                 price: "122.00",


//                 checked: false,
//                 price: "122.00",
//                 category: 'Lunch',
//                 date_added: new Date(),
//             }
//             return ShoppingListService.addItem(db, newItem)
//                 .then(actual => {
//                     expect(actual).to.eql({
//                         id: 1,
//                         name: newItem.name,
//                         checked: newItem.checked,
//                         price: newItem.price,
//                         category: newItem.category,
//                         date_added: newItem.date_added,
//                     })
//                 })
//         })
//     })
// })