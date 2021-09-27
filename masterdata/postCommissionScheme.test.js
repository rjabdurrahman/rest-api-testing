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

describe('/api/masterdata/commissionScheme post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/masterdata/commissionScheme').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error for list required parameter', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide the "list" data array'
                )
            })
            .expect(400, done)
    })

    it('list parameter should be an array', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({ list: 'test' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide the "list" data array'
                )
            })
            .expect(400, done)
    })

    it('list array parameter should contain name', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({ list: [{ name1: 'test' }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide name or scheme_details properly'
                )
            })
            .expect(400, done)
    })

    it('list array parameter should contain scheme_details', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({ list: [{ name: 'test', scheme_details1: 'test scheme' }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide name or scheme_details properly'
                )
            })
            .expect(400, done)
    })

    it('list array parameter should contain scheme_details array', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({ list: [{ name: 'test', scheme_details: 'test scheme' }] })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide name or scheme_details properly'
                )
            })
            .expect(400, done)
    })

    it('scheme_details of list array should contain paymentPercent', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({
                list: [{ name: 'test', scheme_details: [{ name: 'fack' }] }],
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'paymentPercent'"
                )
            })
            .expect(400, done)
    })

    it('scheme_details of list array should contain commissionPercent', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({
                list: [
                    {
                        name: 'test',
                        scheme_details: [{ paymentPercent: 10.0 }],
                    },
                ],
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'commissionPercent'"
                )
            })
            .expect(400, done)
    })

    it('scheme_details of list array should contain paymentDueDay', done => {
        request
            .post('/api/masterdata/commissionScheme')
            .send({
                list: [
                    {
                        name: 'test',
                        scheme_details: [
                            { paymentPercent: 10.0, commissionPercent: 20.0 },
                        ],
                    },
                ],
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'paymentDueDay'"
                )
            })
            .expect(400, done)
    })

    it('should insert a record in commission_scheme & commission_scheme_details properly', async done => {
        const oldCommissionScheme = await db('commission_scheme').select()
        const oldCommissionSchemeDetails = await db(
            'commission_scheme_details'
        ).select()

        const res = await request
            .post('/api/masterdata/commissionScheme')
            .send({
                list: [
                    {
                        name: 'test',
                        scheme_details: [
                            {
                                paymentPercent: 10.0,
                                commissionPercent: 20.0,
                                paymentDueDay: 2,
                            },
                        ],
                    },
                ],
            })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))
        const newCommissionScheme = await db('commission_scheme').select()
        expect(newCommissionScheme.length).toBe(oldCommissionScheme.length + 1)

        const newCommissionSchemeDetails = await db(
            'commission_scheme_details'
        ).select()
        expect(newCommissionSchemeDetails.length).toBe(
            oldCommissionSchemeDetails.length + 1
        )

        done()
    })

    it('should update a record in commission_scheme & commission_scheme_details properly', async done => {
        const res = await request
            .post('/api/masterdata/commissionScheme')
            .send({
                list: [
                    {
                        id: 2,
                        name: 'update commission',
                        scheme_details: [
                            {
                                paymentPercent: 15.0,
                                commissionPercent: 10.0,
                                paymentDueDay: 5,
                            },
                        ],
                    },
                ],
            })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))
        const updatedCommissionScheme = await db('commission_scheme')
            .select('name')
            .where('id', 2)
            .first()
        expect(updatedCommissionScheme.name).toBe('update commission')

        const updatedCommissionSchemeDetails = await db(
            'commission_scheme_details'
        )
            .select('*')
            .where('commissionSchemeId', 2)
            .first()
        expect(updatedCommissionSchemeDetails.paymentPercent).toBe(15.0)
        expect(updatedCommissionSchemeDetails.commissionPercent).toBe(10.0)
        expect(updatedCommissionSchemeDetails.paymentDueDay).toBe(5)

        done()
    })
})
