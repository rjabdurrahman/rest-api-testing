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

describe('/api/sites/cmp/projects post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/sites/cmp/projects').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/sites/cmp/projects')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/sites/cmp/projects')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/sites/cmp/projects')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/sites/cmp/projects')
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
            .post('/api/sites/cmp/projects')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide required field to update cmp sites'
                )
            })
            .expect(400, done)
    })

    it('should return error if provided projects is not an array', done => {
        request
            .post('/api/sites/cmp/projects')
            .send({ projects: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Projects must be an array')
            })
            .expect(400, done)
    })

    it('should return error if provided countries is not an array', done => {
        request
            .post('/api/sites/cmp/projects')
            .send({ countries: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Countries must be an array')
            })
            .expect(400, done)
    })

    it('should return error if provided template is not a string', done => {
        request
            .post('/api/sites/cmp/projects')
            .send({ template: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Template must be a string')
            })
            .expect(400, done)
    })

    it('should return error if provided project ids are not available in DB', done => {
        request
            .post('/api/sites/cmp/projects')
            .send({ projects: [1234, 2341] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided projects are not available'
                )
            })
            .expect(400, done)
    })

    it('should return error if provided country ids are not available in DB', done => {
        request
            .post('/api/sites/cmp/projects')
            .send({ countries: [1234, 2341] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided countries are not available'
                )
            })
            .expect(400, done)
    })

    it('should update sites_cmp_projects key in template with updated projects', async done => {
        const res = await request
            .post('/api/sites/cmp/projects')
            .send({ projects: [2, 3] })
            .set('authorization', `Bearer ${jwt}`)
        expect(res.status).toBe(200)

        const updatedItem = await db('template')
            .select('v')
            .where({ k: 'sites_cmp_projects' })
        expect(updatedItem[0].v).toBe(
            '{"projects":[2,3],"countries":[1,2],"template":"template1"}'
        )
        done()
    })

    it('should update sites_cmp_projects key in template with updated countries', async done => {
        const res = await request
            .post('/api/sites/cmp/projects')
            .send({ countries: [1, 3] })
            .set('authorization', `Bearer ${jwt}`)
        expect(res.status).toBe(200)

        const updatedItem = await db('template')
            .select('v')
            .where({ k: 'sites_cmp_projects' })
        expect(updatedItem[0].v).toBe(
            '{"projects":[2,3],"countries":[1,3],"template":"template1"}'
        )
        done()
    })

    it('should update sites_cmp_projects key in template with updated template', async done => {
        const res = await request
            .post('/api/sites/cmp/projects')
            .send({ template: 'template 123' })
            .set('authorization', `Bearer ${jwt}`)
        expect(res.status).toBe(200)

        const updatedItem = await db('template')
            .select('v')
            .where({ k: 'sites_cmp_projects' })
        expect(updatedItem[0].v).toBe(
            '{"projects":[2,3],"countries":[1,3],"template":"template 123"}'
        )
        done()
    })

    it('should update sites_cmp_projects key in template with updated projects', async done => {
        const res = await request
            .post('/api/sites/cmp/projects')
            .send({
                projects: [1, 2],
                countries: [1, 2],
                template: 'template 123',
            })
            .set('authorization', `Bearer ${jwt}`)
        expect(res.status).toBe(200)

        const updatedItem = await db('template')
            .select('v')
            .where({ k: 'sites_cmp_projects' })
            .first()
        expect(updatedItem.v).toBe(
            '{"projects":[1,2],"countries":[1,2],"template":"template 123"}'
        )
        done()
    })
})
