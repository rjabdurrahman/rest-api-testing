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
    const channelRepresentativeData = [
        {
            fields: {
                Channels: ['Overseas Property Alliance'],
            },
        },
    ]

    const channelListData = {
        fields: {
            'Trading Name 常用稱呼': 'Overseas Property Alliance',
        },
    }

    const channelAgreementData = [
        {
            id: 'ca1',
            fields: {
                'Contract ID': 'contract-id-1',
                Project: ['pro-1', 'pro-2'],
                'Commencement Date': '1/12/2020',
                'Expiration Date': '',
                Commission: '3.00%',
                'Contract Signing Status': 'Fully executed',
            },
        },
        {
            id: 'ca2',
            fields: {
                'Contract ID': 'contract-id-2',
                Project: ['pro-2'],
                'Commencement Date': '1/2/2020',
                'Expiration Date': '',
                Commission: '6.00%',
            },
        },
    ]

    const projectsSyncedViewData1 = {
        fields: {
            'Project Name': 'Noble BE33',
            'Project Code': 'BE33',
            Region: 'Bangkok',
        },
    }
    const projectsSyncedViewData2 = {
        fields: {
            'Project Name': 'Leedon Green',
            'Project Code': 'LDG',
            Region: 'Singapore',
        },
    }

    const airtableChannelRepresentative = {
        select: () => airtableChannelRepresentative,
        firstPage: jest
            .fn()
            .mockImplementationOnce(() => 'not-an-array')
            .mockImplementationOnce(() => [])
            .mockImplementation(() => channelRepresentativeData),
    }

    const airtableChannelList = {
        find: jest
            .fn()
            .mockImplementationOnce(() => {
                throw new Error('Error getting data from "Channel List"')
            })
            .mockImplementation(() => channelListData),
    }

    const airtableChannelAgreement = {
        select: () => airtableChannelAgreement,
        all: jest
            .fn()
            .mockImplementationOnce(() => {
                throw new Error(
                    'Error getting data from "Channel Agreement - Projects"'
                )
            })
            .mockImplementation(() => channelAgreementData),
    }

    const airtableProjectsSyncedView = {
        find: jest
            .fn()
            .mockImplementationOnce(() => {
                throw new Error(
                    'Error getting data from "Projects Synced View"'
                )
            })
            .mockImplementationOnce(() => projectsSyncedViewData1)
            .mockImplementation(() => projectsSyncedViewData2),
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

                    case 'Projects Synced View':
                        return airtableProjectsSyncedView
                }
            }
        },
    }

    return airtable
})

const request = supertest(server)

describe('/api/channel/listAgreements post endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/channel/listAgreements').expect(401, done)
    })

    it('should require valid token: BearerS', done => {
        request
            .get('/api/channel/listAgreements')
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
            .get('/api/channel/listAgreements')
            .set('authorization', 'Bearer ')
            .send()
            .expect(401, done)
    })

    it('should require valid token: Bearer 123', done => {
        request
            .get('/api/channel/listAgreements')
            .set('authorization', 'Bearer 123')
            .send()
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/channel/listAgreements')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('Should return an error if "Channel Representative" does not return an array', async done => {
        await request
            .get('/api/channel/listAgreements')
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
            .get('/api/channel/listAgreements')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(400)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Profile not found')
            })

        done()
    })

    it('Should return an error getting data from "Channel List" table', async done => {
        await request
            .get('/api/channel/listAgreements')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Error getting data from "Channel List"'
                )
            })

        done()
    })

    it('Should return an error getting data from "Channel Agreement - Projects" table', async done => {
        await request
            .get('/api/channel/listAgreements')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Error getting data from "Channel Agreement - Projects"'
                )
            })

        done()
    })

    it('Should return an error getting data from "Projects Synced View" table', async done => {
        await request
            .get('/api/channel/listAgreements')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(500)

                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Error getting data from "Projects Synced View"'
                )
            })

        done()
    })

    it('Should return the correct sale data', async done => {
        await request
            .get('/api/channel/listAgreements')
            .set('authorization', `Bearer ${issue({ id: 1 })}`)
            .send()
            .expect(function (res) {
                expect(res.status).toBe(200)

                const result = JSON.parse(res.text)

                expect(result.data.length).toBe(2)

                expect(result.data[0]['Project'].length).toBe(2)
                expect(result.data[0]['Project'][0]).toBe('Noble BE33')
                expect(result.data[0]['Project'][1]).toBe('Leedon Green')
                expect(result.data[0]['Contract Signing Status']).toBe(
                    'Fully executed'
                )

                expect(result.data[1]['Contract ID']).toBe('contract-id-2')
                expect(result.data[1]['Commencement Date']).toBe('1/2/2020')
                expect(result.data[1]['Expiration Date']).toBe('')
                expect(result.data[1]['Commission']).toBe('6.00%')
                expect(result.data[1]['Project'].length).toBe(1)
                expect(result.data[1]['Project'][0]).toBe('Leedon Green')
            })

        done()
    })
})
