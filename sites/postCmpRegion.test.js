import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../../index.mjs'
import { issue } from '../../services/auth.mjs'

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

describe('/api/sites/cmp/region post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/sites/cmp/region/UK').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/sites/cmp/region/UK')
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
            .post('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide required field to update sites cmp region'
                )
            })
            .expect(400, done)
    })

    it('should return error if provided heroProjects is not an array', done => {
        request
            .post('/api/sites/cmp/region/UK')
            .send({ heroProjects: 123, template: 'template1' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('heroProjects must be an array')
            })
            .expect(400, done)
    })

    it('should return error if provided template is not a string', done => {
        request
            .post('/api/sites/cmp/region/UK')
            .send({ heroProjects: [1, 2, 3], template: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Template must be a string')
            })
            .expect(400, done)
    })

    it('should return error if provided heroProjects ids are not available in DB', done => {
        request
            .post('/api/sites/cmp/region/UK')
            .send({ heroProjects: [1234, 2341] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided heroProjects are not available'
                )
            })
            .expect(400, done)
    })

    it('should return error if cmp region is not available in DB', done => {
        request
            .post('/api/sites/cmp/region/japan')
            .send({ heroProjects: [1, 2, 3], template: 'template1' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('The Site Region is not available')
            })
            .expect(500, done)
    })

    it('should return ok if cmp region is available in DB', async done => {
        const res = await request
            .post('/api/sites/cmp/region/UK')
            .send({ heroProjects: [1, 2], template: 'template1' })
            .set('authorization', `Bearer ${jwt}`)
        expect(res.status).toBe(200)

        const updatedItem = await db('template')
            .select('v')
            .where({ k: 'sites_cmp_project_region_UK' })
        expect(updatedItem[0].v).toBe(
            '{"heroProjects":[1,2],"template":"template1"}'
        )
        done()
    })
})
