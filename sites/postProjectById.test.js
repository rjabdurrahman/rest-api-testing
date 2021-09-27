import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../../index.mjs'
import { issue } from '../../services/auth.mjs'

beforeAll(async () => {
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

const projectInfo = {
    template: 'template1',
    pamphlet: [68, 71, 208],
    gallery: { exterior: [31, 50], facilities: [], showroom: [9] },
    floorplan: { aino: [5], gemi: [9] },
    unitplan: { aino: [9], gemi: [5] },
    map: { surrounding: [9] },
}

describe('/api/sites/cmp/project/:id POST endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/sites/cmp/project/1').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user does not belong to an authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if parameter not passed for updating template', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide required field to update template'
                )
            })
            .expect(400, done)
    })

    it('should return error if parameter template not a string', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, template: [] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('template must be a string')
            })
            .expect(400, done)
    })

    it('should return error if parameter pamphlet not an array', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, pamphlet: 'pamplate' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('pamphlet must be an array')
            })
            .expect(400, done)
    })

    it('should return error if parameter gallery not an bject', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, gallery: 'fun' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('gallery must be an object')
            })
            .expect(400, done)
    })

    it('should return error if gallery object key value is not array', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, gallery: { test: 'fun' } })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "gallery's test value must be an array"
                )
            })
            .expect(400, done)
    })

    it('should return error if gallery object key value is not array of number', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({
                ...projectInfo,
                gallery: { exterior: [123], test: ['fun'] },
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "gallery's test value must be an array of number"
                )
            })
            .expect(400, done)
    })

    it('should return error if parameter floorplan not an bject', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, floorplan: 'fun' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('floorplan must be an object')
            })
            .expect(400, done)
    })

    it('should return error if floorplan object key value is not array', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, floorplan: { aaa: 'fun' } })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "floorplan's aaa value must be an array"
                )
            })
            .expect(400, done)
    })

    it('should return error if floorplan object key value is not array of number', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({
                ...projectInfo,
                floorplan: { exterior: [123], bbb: ['fun'] },
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "floorplan's bbb value must be an array of number"
                )
            })
            .expect(400, done)
    })

    it('should return error if parameter unitplan not an bject', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, unitplan: 'fun' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('unitplan must be an object')
            })
            .expect(400, done)
    })

    it('should return error if unitplan object key value is not array', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, unitplan: { test: 'fun' } })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "unitplan's test value must be an array"
                )
            })
            .expect(400, done)
    })

    it('should return error if unitplan object key value is not array of number', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({
                ...projectInfo,
                unitplan: { exterior: [123], ccc: ['fun'] },
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "unitplan's ccc value must be an array of number"
                )
            })
            .expect(400, done)
    })

    it('should return error if parameter map not an bject', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, map: 'fun' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('map must be an object')
            })
            .expect(400, done)
    })

    it('should return error if map object key value is not array', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({ ...projectInfo, map: { surrounding: 'fun' } })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "map's surrounding value must be an array"
                )
            })
            .expect(400, done)
    })

    it('should return error if map object key value is not array of number', done => {
        request
            .post('/api/sites/cmp/project/1')
            .send({
                ...projectInfo,
                map: { exterior: [123], surrounding: ['fun'] },
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "map's surrounding value must be an array of number"
                )
            })
            .expect(400, done)
    })

    it('should return error if provided id is not available in template', done => {
        request
            .post('/api/sites/cmp/project/6')
            .send(projectInfo)
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Required key is not available in template'
                )
            })
            .expect(500, done)
    })

    it('should return ok if project is available in template', async done => {
        const res = await request
            .post('/api/sites/cmp/project/1')
            .send(projectInfo)
            .set('authorization', `Bearer ${jwt}`)
        expect(res.status).toBe(200)

        const updatedItem = await db('template')
            .select('v')
            .where({ k: 'sites_cmp_project_1' })
        expect(updatedItem[0].v).toBe(
            '{"template":"template1","pamphlet":[68,71,208],"gallery":{"exterior":[31,50],"facilities":[],"showroom":[9]},"floorplan":{"aino":[5],"gemi":[9]},"unitplan":{"aino":[9],"gemi":[5]},"map":{"surrounding":[9]}}'
        )
        done()
    })
})
