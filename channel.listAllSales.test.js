import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import { issue } from '../services/auth.mjs'
import server from '../index.mjs'

// Apply knex migration & seed data
beforeAll(async () => {
    process.env.JWT_SECRET = 'jwtsecret'
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.AIRTABLE_DB_FINANCEADMIN = 'Some table'

    await db.migrate.latest()
    await db.seed.run()
})

// Overwrite the default airtable mock
jest.mock('airtable', () => {
    const salesStatusData = [
        {
            fields: {
                'Order ID': 'Order #1',
                'Link Project': ['link-project-1'],
                'Unit Number': '1',
                Channel: 111,
                'Agency Eligibility': 'AE1',
                'Reserve Date': '1/6/2021',
                'Transacted Price': 3000,
                'Paid Percentage': 30,
                'SPA post date': '1/6/2021',
                'Applied Project Agreement': ['ca1'],
            },
        },
        {
            fields: {
                'Order ID': 'Order #2',
                'Link Project': ['link-project-2'],
                'Unit Number': '2',
                Channel: 222,
                'Agency Eligibility': 'AE2',
                'Reserve Date': '2/6/2021',
                'Transacted Price': 3000,
                'Paid Percentage': 30,
                'SPA post date': '2/6/2021',
                'Applied Project Agreement': ['ca1'],
            },
        },
        {
            fields: {
                'Order ID': 'Order #3',
                'Link Project': ['link-project-3'],
                'Unit Number': '3',
                Channel: 333,
                'Agency Eligibility': 'AE3',
                'Reserve Date': '3/6/2021',
                'Transacted Price': 3000,
                'Paid Percentage': 30,
                'SPA post date': '3/6/2021',
                'Applied Project Agreement': ['ca2'],
            },
        },
    ]

    const airtableChannelRepresentative = {
        select: () => airtableChannelRepresentative,
        all: jest
            .fn()
            .mockImplementationOnce(() => 'not-an-array')
            .mockImplementationOnce(() => [])
            .mockImplementation(() => [
                { fields: { Channels: [222], Name: 'CR1' } },
            ]),
    }

    const airtableChannelList = {
        find: () => ({
            fields: { 'Trading Name 常用稱呼': 'Channel Trading Name 123' },
        }),
    }

    const airtableChannelAgreement = {
        select: () => airtableChannelAgreement,
        all: jest.fn().mockImplementation(() => [
            { id: 'ca1', fields: { 'Contract ID': 'contract-id-1' } },
            { id: 'ca2', fields: { 'Contract ID': 'contract-id-2' } },
        ]),
    }

    const airtableSalesStatus = {
        select: () => airtableSalesStatus,
        all: jest
            .fn()
            .mockImplementationOnce(() => {
                throw new Error('Error getting data from Sales Status')
            })
            .mockImplementation(() => salesStatusData),
    }

    const airtableProjectsSyncedView = {
        find: jest
            .fn()
            .mockImplementationOnce(() => {
                throw new Error('Error getting data from Projects Synced View')
            })
            .mockImplementationOnce(() => ({
                fields: { 'Project Name': 'Link project 1' },
            }))
            .mockImplementationOnce(() => ({
                fields: { 'Project Name': 'Link project 2' },
            }))
            .mockImplementation(() => ({
                fields: { 'Project Name': 'Link project 1' },
            })),
    }

    const airtable = {
        configure: () => {},
        base: () => {
            return tableName => {
                switch (tableName) {
                    case 'Channel Representative':
                        return airtableChannelRepresentative

                    case 'Channel List':
                        return airtableChannelList

                    case 'Channel Agreement - Projects':
                        return airtableChannelAgreement

                    case 'Sales Status':
                        return airtableSalesStatus

                    case 'Projects Synced View':
                        return airtableProjectsSyncedView
                }
            }
        },
    }

    return airtable
})

const request = supertest(server)

describe('airtable /api/channel/listAllSales get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/channel/listAllSales').expect(401, done)
    })

    it('should require valid token: BearerS', done => {
        request
            .get('/api/channel/listAllSales')
            .set('authorization', 'BearerS')
            .send()
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.status).toBe(401)
                expect(error.message).toBe('Invalid token')
            })
            .expect(401, done)
    })

    it('should require valid token: Bearer ', done => {
        request
            .get('/api/channel/listAllSales')
            .set('authorization', 'Bearer ')
            .send()
            .expect(401, done)
    })

    it('should require valid token: Bearer 123', done => {
        request
            .get('/api/channel/listAllSales')
            .set('authorization', 'Bearer 123')
            .send()
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/channel/listAllSales')
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
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Profile not found')
            })
            .expect(400, done)
    })

    it('Should return an error if "Channel Representative" does not return an array', async done => {
        await request
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Database query error')
            })

        done()
    })

    it('Should return an error if "Channel Representative" returns an empty array', async done => {
        await request
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(400)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Profile not found')
            })

        done()
    })

    it('Should return an error getting sale data from "Sales Status" table', async done => {
        await request
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Database query error: Error getting data from Sales Status'
                )
            })
        done()
    })

    it('Should return an error getting sale data from "Projects Synced View" table', async done => {
        await request
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Database query error: Error getting data from Projects Synced View'
                )
            })
        done()
    })

    it('Should return the correct sale data', async done => {
        await request
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(200)

                const result = JSON.parse(res.text)
                console.log(result)
                expect(result.data.length).toBe(3)
                expect(result.data[0]['Sales Order']).toBe('Order #1')
                expect(result.data[0]['Project'][0]).toBe('Link project 1')
                expect(result.data[0]['Channel']).toBe(
                    'Channel Trading Name 123'
                )
                expect(result.data[0]['Commission Status']).toBe('AE1')

                expect(result.data[1]['Sales Order']).toBe('Order #2')
                expect(result.data[1]['Project'][0]).toBe('Link project 2')
                expect(result.data[1]['Channel']).toBe(
                    'Channel Trading Name 123'
                )
                expect(result.data[1]['Commission Status']).toBe('AE2')
                expect(result.data[1]['Reserve Date']).toBe('2/6/2021')
                expect(result.data[1]['Transacted Price']).toBe(3000)
                expect(result.data[1]['Paid Percentage']).toBe(30)
                expect(result.data[1]['SPA post date']).toBe('2/6/2021')
                expect(result.data[1]['Applied Project Agreement']).toBe(
                    'contract-id-1'
                )
            })

        done()
    })

    it('Should return the correct sale data for channelUser also', async done => {
        await request
            .get('/api/channel/listAllSales')
            .set('authorization', `Bearer ${issue({ id: 12 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(200)

                const result = JSON.parse(res.text)
                console.log(result)
                expect(result.data.length).toBe(3)
                expect(result.data[0]['Sales Order']).toBe('Order #1')
                expect(result.data[0]['Project'][0]).toBe('Link project 1')
                expect(result.data[0]['Channel']).toBe(
                    'Channel Trading Name 123'
                )
                expect(result.data[0]['Commission Status']).toBe('AE1')

                expect(result.data[1]['Sales Order']).toBe('Order #2')
                expect(result.data[1]['Project'][0]).toBe('Link project 1')
                expect(result.data[1]['Channel']).toBe(
                    'Channel Trading Name 123'
                )
                expect(result.data[1]['Commission Status']).toBe('AE2')
                expect(result.data[1]['Reserve Date']).toBe('2/6/2021')
                expect(result.data[1]['Transacted Price']).toBe(3000)
                expect(result.data[1]['Paid Percentage']).toBe(30)
                expect(result.data[1]['SPA post date']).toBe('2/6/2021')
                expect(result.data[1]['Applied Project Agreement']).toBe(
                    'contract-id-1'
                )
            })

        done()
    })
})
