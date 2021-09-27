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

describe('/api/project/media post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/project/media').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/project/media')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/project/media')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/project/media')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/project/media')
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
            .post('/api/project/media')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'projectId'"
                )
            })
            .expect(400, done)
    })

    it('should return error if type not passed', done => {
        request
            .post('/api/project/media')
            .send({ projectId: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe("must have required property 'type'")
            })
            .expect(400, done)
    })

    it('should return error if fileId or url not passed', done => {
        request
            .post('/api/project/media')
            .send({ projectId: 123, type: 'abc' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide fileId or url')
            })
            .expect(400, done)
    })

    it('should return error if fileId and url both provided', done => {
        request
            .post('/api/project/media')
            .send({ projectId: 123, type: 'abc', fileId: 123, url: 'test.com' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide fileId or url not both'
                )
            })
            .expect(400, done)
    })

    it('should return error if required parameters not passed for update', done => {
        request
            .post('/api/project/media')
            .send({ id: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide required fields for update'
                )
            })
            .expect(400, done)
    })

    it('should return error if provided id is not valid', done => {
        request
            .post('/api/project/media')
            .send({ id: 100, projectId: 123, type: 'abc', fileId: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Provided id is not available')
            })
            .expect(400, done)
    })

    it('should return error if provided projectId is not valid', done => {
        request
            .post('/api/project/media')
            .send({ projectId: 123, type: 'abc', fileId: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided projectId is not available'
                )
            })
            .expect(400, done)
    })

    it('should return error if provided fileId is not valid', done => {
        request
            .post('/api/project/media')
            .send({ projectId: 1, type: 'abc', fileId: 123 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Provided fileId is not available')
            })
            .expect(400, done)
    })

    it('should add new project media record with url', async done => {
        const oldItems = await db('project_media').select()

        const res = await request
            .post('/api/project/media')
            .send({ projectId: 1, type: 'abc', url: 'abc.com' })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const newItems = await db('project_media').select()
        const newItem = newItems[newItems.length - 1]

        expect(newItems.length - oldItems.length).toBe(1)
        expect(newItem.projectId).toBe(1)
        expect(newItem.type).toBe('abc')
        expect(newItem.fileId).toBe(null)
        expect(newItem.url).toBe('abc.com')

        done()
    })

    it('should add new project media record with fileId', async done => {
        const oldItems = await db('project_media').select()

        const res = await request
            .post('/api/project/media')
            .send({ projectId: 1, type: 'abc', fileId: 1 })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const newItems = await db('project_media').select()
        const newItem = newItems[newItems.length - 1]

        expect(newItems.length - oldItems.length).toBe(1)
        expect(newItem.projectId).toBe(1)
        expect(newItem.type).toBe('abc')
        expect(newItem.fileId).toBe(1)
        expect(newItem.url).toBe(null)

        done()
    })

    it('should update existing project media record with projectId', async done => {
        const res = await request
            .post('/api/project/media')
            .send({ id: 1, projectId: 3 })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const updatedItem = await db('project_media')
            .select()
            .where({ id: 1 })
            .first()
        expect(updatedItem.id).toBe(1)
        expect(updatedItem.projectId).toBe(3)
        expect(updatedItem.type).toBe('PICTURE_PROJECT')
        expect(updatedItem.fileId).toBe(1)
        expect(updatedItem.url).toBe('URL1')
        done()
    })

    it('should update existing project media record with type', async done => {
        const res = await request
            .post('/api/project/media')
            .send({ id: 3, type: 'test' })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const updatedItem = await db('project_media')
            .select()
            .where({ id: 3 })
            .first()
        expect(updatedItem.id).toBe(3)
        expect(updatedItem.projectId).toBe(2)
        expect(updatedItem.type).toBe('test')
        expect(updatedItem.fileId).toBe(3)
        expect(updatedItem.url).toBe('URL3')
        done()
    })

    it('should update existing project media record with url & all other params & should remove existing fileId', async done => {
        const res = await request
            .post('/api/project/media')
            .send({ id: 2, projectId: 3, type: 'abc3', url: 'fackURL' })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const updatedItem = await db('project_media')
            .select()
            .where({ id: 2 })
            .first()
        expect(updatedItem.id).toBe(2)
        expect(updatedItem.projectId).toBe(3)
        expect(updatedItem.type).toBe('abc3')
        expect(updatedItem.fileId).toBe(null)
        expect(updatedItem.url).toBe('fackURL')
        done()
    })

    it('should update existing project media record with fileId & remove existing url', async done => {
        const res = await request
            .post('/api/project/media')
            .send({ id: 1, fileId: 1 })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const updatedItem = await db('project_media')
            .select()
            .where({ id: 1 })
            .first()
        expect(updatedItem.id).toBe(1)
        expect(updatedItem.projectId).toBe(3)
        expect(updatedItem.type).toBe('PICTURE_PROJECT')
        expect(updatedItem.fileId).toBe(1)
        expect(updatedItem.url).toBe(null)
        done()
    })
})
