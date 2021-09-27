import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import { issue } from '../services/auth.mjs'
import server from '../index.mjs'

// Apply knex migration & seed data
beforeAll(async () => {
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.AIRTABLE_DB_FINANCEADMIN = 'Some table'

    await db.migrate.latest()
    await db.seed.run()
})

// Overwrite the default airtable mock
jest.mock('airtable', () => {
    const findMock = jest
        .fn()
        .mockImplementationOnce(() => {
            throw new Error('Error finding channel by id')
        })
        .mockImplementation(() => ({
            fields: {
                'Trading Name 常用稱呼': 'Trading name 1',
                'Company Name 公司註冊名稱': 'Company name 1',
                'Business Address': 'Address 1',
            },
        }))

    const firstPageMock = jest
        .fn()
        .mockImplementationOnce(() => 'not-an-array')
        .mockImplementationOnce(() => [])
        .mockImplementation(() => [
            { fields: { Channels: 222, Name: 'Profile 1' } },
        ])

    const allMock = jest
        .fn()
        .mockImplementationOnce(cb => {
            cb({ message: 'Error getting data' })
        })
        .mockImplementation(cb => {
            cb(null, [
                {
                    fields: {
                        'Order ID': 'Order #1',
                        'Link Project': 'Link project 1',
                        'Unit Number': '1',
                        Channel: 111,
                        'Agency Eligibility': 'AE1',
                    },
                },
            ])
        })

    const airtableObj = {
        select: () => airtableObj,
        find: findMock,
        firstPage: firstPageMock,
        all: allMock,
    }

    const airtable = {
        configure: () => {},
        base: () => {
            return () => airtableObj
        },
    }

    return airtable
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/channel/getProfile get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/channel/getProfile').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/channel/getProfile')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/channel/getProfile')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/channel/getProfile')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return profile not found error if not get channelId', done => {
        const jwt = issue({ id: 9 })

        request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Profile not found')
            })
            .expect(400, done)
    })

    it('Should return an error if "Channel Representative" does not return an array', async done => {
        await request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Database query error')
            })

        done()
    })

    it('Should return an error if "Channel Representative" returns an empty array', async done => {
        await request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                expect(res.status).toBe(400)
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Profile not found')
            })

        done()
    })

    it('Should return an error if "Channel List" throws an error', async done => {
        await request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                expect(res.status).toBe(500)
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Error finding channel by id')
            })

        done()
    })

    it('Should return correct profile for channelAdmin', async done => {
        await request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                expect(res.status).toBe(200)
                const result = JSON.parse(res.text)
                expect(result.email).toBe('ming@nicecar.hk')
                expect(result.channelRep).toBe('Profile 1')
                expect(result.tradingName).toBe('Trading name 1')
                expect(result.companyName).toBe('Company name 1')
                expect(result.businessAddress).toBe('Address 1')
            })

        done()
    })

    it('Should return correct profile for channelUser', async done => {
        await request
            .get('/api/channel/getProfile')
            .set('authorization', `Bearer ${issue({ id: 12 })}`)
            .expect(function (res) {
                expect(res.status).toBe(200)
                const result = JSON.parse(res.text)
                expect(result.email).toBe('ming@nicecar.hk')
                expect(result.channelRep).toBe('Profile 1')
                expect(result.tradingName).toBe('Trading name 1')
                expect(result.companyName).toBe('Company name 1')
                expect(result.businessAddress).toBe('Address 1')
            })

        done()
    })
})
