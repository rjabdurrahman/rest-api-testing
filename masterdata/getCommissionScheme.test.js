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

describe('/api/masterdata/commissionScheme get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/masterdata/commissionScheme').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/masterdata/commissionScheme')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/masterdata/commissionScheme')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/masterdata/commissionScheme')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it("should return Commission_scheme's list", done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/masterdata/commissionScheme')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const commissionSchemes = res.body
                expect(commissionSchemes.length).toBe(3)
                expect(commissionSchemes[0].id).toBe(1)
                expect(commissionSchemes[0].name).toBe('100% Commission Scheme')
                expect(commissionSchemes[0].scheme_details).toEqual([
                    {
                        id: 1,
                        paymentPercent: 80,
                        commissionPercent: 100,
                        paymentDueDay: '2030-02-17',
                    },
                ])
                expect(commissionSchemes[1].id).toBe(2)
                expect(commissionSchemes[1].name).toBe('95% Commission Scheme')
                expect(commissionSchemes[1].scheme_details).toEqual([
                    {
                        id: 2,
                        paymentPercent: 80,
                        commissionPercent: 95,
                        paymentDueDay: '2032-02-17',
                    },
                ])
                expect(commissionSchemes[2].id).toBe(3)
                expect(commissionSchemes[2].name).toBe('90% Commission Scheme')
                expect(commissionSchemes[2].scheme_details).toEqual([
                    {
                        id: 3,
                        paymentPercent: 85,
                        commissionPercent: 90,
                        paymentDueDay: '2030-12-07',
                    },
                ])
            })
            .expect(200, done)
    })
})
