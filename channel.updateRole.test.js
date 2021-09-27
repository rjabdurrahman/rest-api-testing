import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../index.mjs'
import { issue } from '../services/auth.mjs'

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

describe('/api/channel/updateRole post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/channel/updateRole').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/channel/updateRole')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/channel/updateRole')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/channel/updateRole')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/channel/updateRole')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if parameter not passed', done => {
        request
            .post('/api/channel/updateRole')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide the "entries" data array'
                )
            })
            .expect(400, done)
    })

    it('should return error if entries array not passed', done => {
        request
            .post('/api/channel/updateRole')
            .send({ abc: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide the "entries" data array'
                )
            })
            .expect(400, done)
    })

    it('should return error if empty entries details passed', done => {
        request
            .post('/api/channel/updateRole')
            .send({ entries: [] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide the "entries" data array'
                )
            })
            .expect(400, done)
    })

    it('should return error if required data not passed', done => {
        request
            .post('/api/channel/updateRole')
            .send({ entries: [{ abc: 123 }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Invalid role parameters provided')
            })
            .expect(400, done)
    })

    it('should return error if provided user_id not valid', done => {
        request
            .post('/api/channel/updateRole')
            .send({ entries: [{ user_id: 101, group_id: 101 }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('User not found')
            })
            .expect(400, done)
    })

    it('should return error if provided group_id not valid', done => {
        request
            .post('/api/channel/updateRole')
            .send({ entries: [{ user_id: 1, group_id: 101 }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Group not found')
            })
            .expect(400, done)
    })

    it('should return error if provided id for update is not valid', done => {
        request
            .post('/api/channel/updateRole')
            .send({ entries: [{ user_id: 1, group_id: 1, id: 1000 }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Auth membership id not found for update'
                )
            })
            .expect(400, done)
    })

    it('should return error if provided id for delete is not valid', done => {
        request
            .post('/api/channel/updateRole')
            .send({ entries: [{ id: 1000, isDelete: true }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Auth membership id not found for delete'
                )
            })
            .expect(400, done)
    })

    it('should add new membership record', async done => {
        const oldItems = await db('auth_membership').select()

        const res = await request
            .post('/api/channel/updateRole')
            .send({ entries: [{ user_id: 2, group_id: 2 }] })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const newItems = await db('auth_membership').select()
        const newItem = newItems[newItems.length - 1]

        expect(newItems.length - oldItems.length).toBe(1)
        expect(newItem.user_id).toBe(2)
        expect(newItem.group_id).toBe(2)
        expect(newItem.id).toBe(7)

        done()
    })

    it('should update existing membership record', async done => {
        const res = await request
            .post('/api/channel/updateRole')
            .send({ entries: [{ id: 1, user_id: 2, group_id: 2 }] })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const updatedItem = await db('auth_membership')
            .select()
            .where({ id: 1 })
            .first()
        expect(updatedItem.id).toBe(1)
        expect(updatedItem.user_id).toBe(2)
        expect(updatedItem.group_id).toBe(2)
        done()
    })

    it('should delete membership record', async done => {
        await request
            .post('/api/channel/updateRole')
            .send({
                entries: [
                    { id: 1, isDelete: true },
                    { id: 2, isDelete: true },
                ],
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                expect(res.status).toBe(200)
            })

        const items = await db('auth_membership')
            .select()
            .where({ id: [1, 2] })
        expect(items.length).toBe(0)
        done()
    })
})
