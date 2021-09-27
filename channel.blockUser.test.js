import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../index.mjs'
import { issue } from '../services/auth'

// Apply knex migration & seed data
beforeAll(async () => {
    // These database names can be any names as long as they are the same as the ones used in 'migrations' folder
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/channel/blockUser post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/channel/blockUser').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/channel/blockUser')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/channel/blockUser')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/channel/blockUser')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/channel/blockUser')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it("should return an error if there's no user's id provided", done => {
        request
            .post('/api/channel/blockUser')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const err = JSON.parse(res.text)
                expect(err.message).toBe('Please provide user\'s "id"')
            })
            .expect(400, done)
    })

    it('should return an error if isBlock is not provided', done => {
        request
            .post('/api/channel/blockUser')
            .send({ id: 1 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const err = JSON.parse(res.text)
                expect(err.message).toBe('Please provide "isBlock" param')
            })
            .expect(400, done)
    })

    it('should return an error if user is blocking/unblocking himself', done => {
        request
            .post('/api/channel/blockUser')
            .send({ id: 1, isBlock: false })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('User cannot block/unblock himself')
            })
            .expect(400, done)
    })

    it('should return an error if user is not existing', done => {
        request
            .post('/api/channel/blockUser')
            .send({ id: 100, isBlock: false })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('User with #id = 100 does not exist')
            })
            .expect(400, done)
    })

    it("should update user's is_active = true properly", done => {
        request
            .post('/api/channel/blockUser')
            .send({
                id: 2,
                isBlock: false,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(200)
            .end(async () => {
                const user = await db
                    .table('auth_user')
                    .select('is_active')
                    .where('id', 2)
                expect(user[0].is_active).toBeTruthy()
                done()
            })
    })

    it("should update user's is_active = false properly", done => {
        request
            .post('/api/channel/blockUser')
            .send({
                id: 2,
                isBlock: true,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(200)
            .end(async () => {
                const user = await db
                    .table('auth_user')
                    .select('is_active')
                    .where('id', 2)
                expect(user[0].is_active).toBeFalsy()
                done()
            })
    })
})
