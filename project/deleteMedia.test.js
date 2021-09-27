import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../../index.mjs'
import { issue } from '../../services/auth.mjs'

// Overwrite the default axios mock
jest.mock('axios', () => {
    return jest
        .fn()
        .mockImplementationOnce(
            () =>
                new Promise((resolve, reject) => {
                    reject('Weird error')
                })
        )
        .mockImplementation(
            () =>
                new Promise(resolve => {
                    resolve({ status: 200 })
                })
        )
})

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

describe('/api/project/media/:id DELETE endpoint', () => {
    it('should require a header token', done => {
        request.delete('/api/project/media/1').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .delete('/api/project/media/1')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .delete('/api/project/media/1')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .delete('/api/project/media/1')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .delete('/api/project/media/1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if media item not found', async done => {
        request
            .delete('/api/project/media/xyz')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Media item not found')
            })
            .expect(404, done)
    })

    it('should return error if axios returns error', async done => {
        request
            .delete('/api/project/media/1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Error deleting file: Weird error')
            })
            .expect(500, done)
    })

    it('should delete a record of project_media table', async done => {
        const fileId = 1

        const before = await db('project_media')
            .where({ fileId })
            .select()
            .first()

        // Before deleting, the file is in the table
        expect(before).toBeTruthy()

        const res = await request
            .delete(`/api/project/media/${fileId}`)
            .send()
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)

        const after = await db('project_media')
            .where({ fileId })
            .select()
            .first()

        // After deleting, the file is no longer there in the table
        expect(after).toBeFalsy()

        done()
    })
})
