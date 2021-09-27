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

describe('/api/sites/cmp/projectInventory POST endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/sites/cmp/projectInventory').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user does not belong to an authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/sites/cmp/projectInventory')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if "ids" is not provided', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('"ids" is required and is an array')
            })
            .expect(400, done)
    })

    it('should return error if "ids" is not an array', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send({ ids: {} })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('"ids" is required and is an array')
            })
            .expect(400, done)
    })

    it('should return error if "ids" is an empty array', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send({ ids: [] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'No project inventory id to be updated'
                )
            })
            .expect(400, done)
    })

    it('should return error if "ids" contains NaN items', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send({ ids: [1, 'a'] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Inventory id #a is not a number')
            })
            .expect(400, done)
    })

    it('should return error if "marketing_cmp_unitpage" is not provided', done => {
        request
            .post('/api/sites/cmp/projectInventory')
            .send({ ids: [1] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    '"marketing_cmp_unitpage" is required'
                )
            })
            .expect(400, done)
    })

    it('should update marketing_cmp_unitpage property properly', async done => {
        const res = await request
            .post('/api/sites/cmp/projectInventory')
            .send({
                ids: [1, 2],
                marketing_cmp_unitpage: { heading: [1, 2], gallery: [3, 4] },
            })
            .set('authorization', `Bearer ${jwt}`)

        const result = JSON.parse(res.text)
        expect(result.ok).toBe(true)

        const inventory1 = await db('project_inventory')
            .select('*')
            .where('id', 1)
            .first()
        const inventory2 = await db('project_inventory')
            .select('*')
            .where('id', 2)
            .first()

        const mcu1 = JSON.parse(inventory1.marketing_cmp_unitpage)
        const mcu2 = JSON.parse(inventory2.marketing_cmp_unitpage)
        expect(mcu1.heading).toStrictEqual([1, 2])
        expect(mcu2.gallery).toStrictEqual([3, 4])

        done()
    })
})
