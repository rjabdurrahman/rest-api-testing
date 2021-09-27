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

describe('/api/masterdata/projectMarketing get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/masterdata/projectMarketing').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/masterdata/projectMarketing')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/masterdata/projectMarketing')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/masterdata/projectMarketing')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/masterdata/projectMarketing')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if projectId is not provided', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/masterdata/projectMarketing')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('projectId required')
            })
            .expect(400, done)
    })

    it('should return an empty array', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/masterdata/projectMarketing?projectId=100')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const items = res.body.data
                expect(items.length).toBe(0)
            })
            .expect(200, done)
    })

    it('should return an array of project marketings', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/masterdata/projectMarketing?projectId=1')
            .send({ projectId: 1 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const data = res.body.data
                expect(data.length).toBe(1)
                expect(data[0].id).toBe(1)
                expect(data[0].projectId).toBe(1)
                expect(data[0].sloganTextColor).toBe('#000')
                expect(data[0].locationTagColor).toBe('#FF0000')
                expect(data[0].projectStatus).toBe('Promtion')
                expect(data[0].isActive).toBeTruthy()
                expect(data[0].heroBannerId).toBe(1)
                expect(data[0].lat).toBe(25.778978)
                expect(data[0].lon).toBe(-80.18234)

                expect(data[0].sloganTransId.id).toBe(1)
                expect(data[0].sloganTransId.en).toBe('Move to What Moves You')
                expect(data[0].sloganTransId['zh-CN']).toBe(
                    '移动到让你感动的地方'
                )
                expect(data[0].sloganTransId['zh-HK']).toBe(
                    '移動到讓你感動的地方'
                )
            })
            .expect(200, done)
    })
})
