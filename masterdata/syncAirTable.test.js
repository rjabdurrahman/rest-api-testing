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

// Overwrite the default airtable mock
jest.mock('airtable', () => {
    const localProjectsData = [
        {
            fields: {
                'Project Name': 'Project 1',
                Active: true,
                'Project Code': 'code1',
                Region: 'UK',
                Completed: true,
            },
            id: 'airtableId1',
        },
        {
            fields: {
                'Project Name': 'Project 2',
                Active: true,
                'Project Code': 'code2',
                Region: 'UK',
                Completed: undefined,
            },
            id: 'airtableId2',
        },
        {
            fields: {
                'Project Name': 'Project 4',
                Active: true,
                'Project Code': 'code4',
                Region: 'Bangkok',
                Completed: undefined,
            },
            id: 'airtableId4',
        },
    ]

    const airtableLocalProjects = {
        select: () => airtableLocalProjects,
        all: jest.fn().mockImplementation(() => localProjectsData),
    }

    const airtable = {
        configure: () => {},
        base: () => {
            return tableName => {
                switch (tableName) {
                    case '🌍 Local Projects':
                        return airtableLocalProjects
                }
            }
        },
    }

    return airtable
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/masterdata/project/syncAirtable post enpoint', () => {
    it('should require a header token', done => {
        request.post('/api/masterdata/project/syncAirtable').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/masterdata/project/syncAirtable')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return an error if required parameter not passed', done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Please provide required parameter for syncAirtable'
                )
            })
            .expect(400, done)
    })

    it('should return an error if syncOne parameter is not a number', done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send({ syncOne: 'fack' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('syncOne should be a number')
            })
            .expect(400, done)
    })
    // from here
    it('should return an error if syncOne parameter is not a valid project id', done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send({ syncOne: -1 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided syncOne / project id is not available'
                )
            })
            .expect(400, done)
    })

    it("should return an error if syncOne's airtableId not able to fetch from airTable", done => {
        request
            .post('/api/masterdata/project/syncAirtable')
            .send({ syncOne: 3 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                console.log(res.error);
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "Provided syncOne's airtable record not available"
                )
            })
            .expect(400, done)
    })

    it('should successfully update project record based on syncOne provided', async done => {
        const res = await request
            .post('/api/masterdata/project/syncAirtable')
            .send({ syncOne: 1 })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))

        const updatedProject = await db('project')
            .select()
            .where({ id: 1 })
            .first()
        expect(updatedProject.id).toBe(1)
        expect(updatedProject.name).toBe('Project 1')
        expect(updatedProject.isActive).toBe(1)
        expect(updatedProject.code).toBe('code1')
        expect(updatedProject.isCompleted).toBe(1)
        expect(updatedProject.region).toBe(1)
        expect(updatedProject.airtableId).toBe('airtableId1')
        done()
    })

    it('should add new record in project table if syncNew is true', async done => {
        const res = await request
            .post('/api/masterdata/project/syncAirtable')
            .send({ syncNew: true })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))

        const updatedProject = await db('project')
            .select()
            .where({ id: 4 })
            .first()
        expect(updatedProject.id).toBe(4)
        expect(updatedProject.name).toBe('Project 4')
        expect(updatedProject.isActive).toBe(1)
        expect(updatedProject.code).toBe('code4')
        expect(updatedProject.isCompleted).toBe(0)
        expect(updatedProject.region).toBe(2)
        expect(updatedProject.airtableId).toBe('airtableId4')
        done()
    })

    it('should update records in project table if syncExisting is true', async done => {
        const res = await request
            .post('/api/masterdata/project/syncAirtable')
            .send({ syncNew: false, syncExisting: true })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))

        const updatedProject = await db('project')
            .select()
            .where({ id: 2 })
            .first()
        expect(updatedProject.id).toBe(2)
        expect(updatedProject.name).toBe('Project 2')
        expect(updatedProject.isActive).toBe(1)
        expect(updatedProject.code).toBe('code2')
        expect(updatedProject.isCompleted).toBe(0)
        expect(updatedProject.region).toBe(1)
        expect(updatedProject.airtableId).toBe('airtableId2')
        done()
    })
})
