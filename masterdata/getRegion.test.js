import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import { issue } from '../../services/auth.mjs'
import server from '../../index.mjs'

// Apply knex migration & seed data
beforeAll(async () => {
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)

describe('/api/masterdata/region get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/masterdata/region').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/masterdata/region')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/masterdata/region')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/masterdata/region')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 11 })

        request
            .get('/api/masterdata/region')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it("should return region's list", done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/masterdata/region')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const regions = res.body
                expect(regions.length).toBe(3)
                expect(regions[0].id).toBe(1)
                expect(regions[0].name).toBe('UK')
                expect(regions[0].currency).toBe('GBP')
            })
            .expect(200, done)
    })
})
