import axios from 'axios'
import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../index.mjs'
import { issue } from '../services/auth.mjs'

jest.mock('axios')

// Apply knex migration & seed data
beforeAll(async () => {
    // These database names can be any names as long as they are the same as the ones used in 'migrations' folder
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.IPCHECK_USERNAME = 'username'
    process.env.IPCHECK_PASSWORD = 'password'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/gps get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/gps').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/gps')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/gps')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/gps')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/gps')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return country after getting IP', async done => {
        axios.mockResolvedValue({
            data: { country: { names: { en: 'Hong Kong' } } },
        })

        request
            .get('/api/gps')
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                expect(res.text).toBe('')
            })
            .expect(200, done)
    })
})
