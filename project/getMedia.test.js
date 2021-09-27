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
const jwt = issue({ id: 1 })

describe('/api/project/media get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/project/media').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/project/media')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/project/media')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/project/media')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/project/media')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if provied projectId is not a number', done => {
        request
            .get('/api/project/media?projectId=abc')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided projectId is not available'
                )
            })
            .expect(400, done)
    })

    it('should return error if provied fileId is not a number', done => {
        request
            .get('/api/project/media?fileId=abc')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Provided fileId is not available')
            })
            .expect(400, done)
    })

    it("should return project media's list with all fields", done => {
        request
            .get('/api/project/media')
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                expect(res.status).toBe(200)

                const projectMedias = JSON.parse(res.text)
                expect(projectMedias.length).toBe(3)
                expect(projectMedias[0].id).toBe(1)
                expect(projectMedias[0].projectId).toBe(1)
                expect(projectMedias[0].fileId).toEqual({
                    bucket: 'ncproductpic',
                    filename: '1581308611_CCG01.JPG',
                    id: 1,
                    type: 'PICTURE_PRODUCT',
                })
                expect(projectMedias[0].type).toBe('PICTURE_PROJECT')
                expect(projectMedias[0].url).toBe('URL1')
            })
            .expect(200, done)
    })

    it("should return project media's list based on passing projectId", done => {
        request
            .get('/api/project/media?projectId=2')
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                expect(res.status).toBe(200)

                const projectMedias = JSON.parse(res.text)
                expect(projectMedias.length).toBe(2)
                expect(projectMedias[0].id).toBe(2)
                expect(projectMedias[0].projectId).toBe(2)
                expect(projectMedias[0].fileId).toEqual({
                    bucket: 'fulcrum-productmedia',
                    filename: '1609815549_2021.jpg',
                    id: 2,
                    type: 'PICTURE_PRODUCT',
                })
                expect(projectMedias[0].type).toBe('PICTURE_PROJECT')
                expect(projectMedias[0].url).toBe('URL2')
            })
            .expect(200, done)
    })

    it("should return project media's list based on passing projectId & fileId", done => {
        request
            .get('/api/project/media?projectId=2&fileId=3')
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                expect(res.status).toBe(200)

                const projectMedias = JSON.parse(res.text)
                expect(projectMedias.length).toBe(1)
                expect(projectMedias[0].id).toBe(3)
                expect(projectMedias[0].projectId).toBe(2)
                expect(projectMedias[0].fileId).toEqual({
                    bucket: 'fulcrum-productmedia',
                    filename: '1609815752_2021.jpg',
                    id: 3,
                    type: 'PICTURE_PRODUCT',
                })
                expect(projectMedias[0].type).toBe('PICTURE_PROJECT')
                expect(projectMedias[0].url).toBe('URL3')
            })
            .expect(200, done)
    })

    it("should return project media's list based on passing projectId & fileId & type", done => {
        request
            .get('/api/project/media?projectId=2&fileId=2&type=PICTURE_PROJECT')
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                expect(res.status).toBe(200)

                const projectMedias = JSON.parse(res.text)
                expect(projectMedias.length).toBe(1)
                expect(projectMedias[0].id).toBe(2)
                expect(projectMedias[0].projectId).toBe(2)
                expect(projectMedias[0].fileId.bucket).toBe(
                    'fulcrum-productmedia'
                )
                expect(projectMedias[0].fileId.filename).toBe(
                    '1609815549_2021.jpg'
                )
                expect(projectMedias[0].fileId.id).toBe(2)
                expect(projectMedias[0].fileId.type).toBe('PICTURE_PRODUCT')
                expect(projectMedias[0].type).toBe('PICTURE_PROJECT')
                expect(projectMedias[0].url).toBe('URL2')
            })
            .expect(200, done)
    })

    it("should return project media's empty array if provided projectId & fileId & type not getting properly", done => {
        request
            .get(
                '/api/project/media?projectId=2&fileId=2&type=PICTURE_PROJECTs'
            )
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                expect(res.status).toBe(200)
                const projectMedias = JSON.parse(res.text)
                expect(projectMedias.length).toBe(0)
            })
            .expect(200, done)
    })
})
