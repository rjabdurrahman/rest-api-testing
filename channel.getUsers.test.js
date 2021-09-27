import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import { issue } from '../services/auth.mjs'
import server from '../index.mjs'

// Apply knex migration & seed data
beforeAll(async () => {
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.AIRTABLE_DB_FINANCEADMIN = 'Some table'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 11 })

describe('/api/channel/getUsers get endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/channel/getUsers').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/channel/getUsers')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/channel/getUsers')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/channel/getUsers')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/channel/getUsers')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should require valid id', done => {
        request
            .post('/api/channel/getUsers')
            .set('authorization', `Bearer ${jwt}`)
            .send({ id: true })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Invalid id')
            })
            .expect(400, done)
    })

    it('should require valid fields of array', done => {
        request
            .post('/api/channel/getUsers')
            .set('authorization', `Bearer ${jwt}`)
            .send({ fields: {} })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Invalid fields')
            })
            .expect(400, done)
    })

    it("should return user's list", done => {
        request
            .post('/api/channel/getUsers')
            .set('authorization', `Bearer ${jwt}`)
            .send()
            .expect(res => {
                const users = res.body
                expect(users.length).toBe(3)
                expect(users[0].reset_password_key).toBeFalsy()
                expect(users[0].partymaster_ref).toBe(1)
                expect(users[1].registration_key).toBeFalsy()
                expect(users[1].language).toBe('en')
                expect(users[1].email).toBe('officeAdminBoss@nicecar.hk')
            })
            .expect(200, done)
    })

    it("should return user's list by id", done => {
        request
            .post('/api/channel/getUsers')
            .send({ id: 11 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const users = res.body
                expect(users.length).toBe(1)
                expect(users[0].id).toBe(11)
                expect(users[0].first_name).toBe('officeAdmin')
            })
            .expect(200, done)
    })

    it("should return user's list by email with selected fields", done => {
        request
            .post('/api/channel/getUsers')
            .send({
                email: 'allAuthGroup@nicecar.hk',
                fields: ['username', 'country_code'],
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const users = res.body
                expect(users.length).toBe(1)
                expect(users[0].username).toBe('allAuthGroup')
                expect(users[0].country_code).toBe(2)
                expect(users[0].first_name).toBeUndefined()
            })
            .expect(200, done)
    })

    it("should return user's list with their role with empty array", done => {
        request
            .post('/api/channel/getUsers')
            .send({
                email: 'allAuthGroup@nicecar.hk',
                fields: ['username', 'country_code', 'role'],
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const users = res.body
                expect(users.length).toBe(1)
                expect(users[0].username).toBe('allAuthGroup')
                expect(users[0].country_code).toBe(2)
                expect(users[0].id).toBe(12)
                expect(users[0].first_name).toBeUndefined()
                expect(users[0].last_name).toBeUndefined()
                expect(users[0].role).toEqual([
                    {
                        group_id: 4,
                        id: 6,
                        user_id: 12,
                    },
                ])
            })
            .expect(200, done)
    })

    it("should return user's list with their role properly", done => {
        request
            .post('/api/channel/getUsers')
            .send({ id: 11, fields: ['first_name', 'role'] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const users = res.body
                expect(users.length).toBe(1)
                const [user] = users
                expect(user.id).toBe(11)
                expect(user.first_name).toBe('officeAdmin')
                expect(user.role.length).toBe(1)
                expect(user.role).toEqual([
                    {
                        group_id: 3,
                        id: 4,
                        user_id: 11,
                    },
                ])
            })
            .expect(200, done)
    })
})
