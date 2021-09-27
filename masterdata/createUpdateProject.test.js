import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import { issue } from '../../services/auth.mjs'
import server from '../../index.mjs'

// Apply knex migration & seed data
beforeAll(async () => {
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.DB_AUTH_PARTY = 'PartyMaster'
    process.env.DB_CONTACT = 'Contacts'
    process.env.AIRTABLE_DB_FINANCEADMIN = 'Some table'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/masterdata/project post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/masterdata/project').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/masterdata/project')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/masterdata/project')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/masterdata/project')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to "admin" group', done => {
        const jwt = issue({ id: 11 })

        request
            .post('/api/masterdata/project')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should require valid region', done => {
        request
            .post('/api/masterdata/project')
            .send({ region: 30 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Region does not exist')
            })
            .expect(400, done)
    })

    it('should require valid commissionSchemeId', done => {
        request
            .post('/api/masterdata/project')
            .send({ region: 1, commissionSchemeId: 100 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Commission scheme does not exist')
            })
            .expect(400, done)
    })

    it('should return error if updated project does not exist', done => {
        request
            .post('/api/masterdata/project')
            .send({ id: 100, region: 1, commissionSchemeId: 1 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Project does not exist')
            })
            .expect(400, done)
    })

    it('should update existing project successfully', done => {
        request
            .post('/api/masterdata/project')
            .send({
                id: 1,
                region: 1,
                commissionSchemeId: 1,
                name: 'Newly updated project name',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(async function () {
                const [project] = await db.table('project').where('id', 1)

                expect(project.name).toBe('Newly updated project name')
            })
            .expect(200, done)
    })

    it('should require name to create a project', done => {
        request
            .post('/api/masterdata/project')
            .send({
                region: 1,
                commissionSchemeId: 1,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Project name is required')
            })
            .expect(400, done)
    })

    it('should require code to create a project', done => {
        request
            .post('/api/masterdata/project')
            .send({
                name: 'Project X',
                region: 1,
                commissionSchemeId: 1,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Project code is required')
            })
            .expect(400, done)
    })

    it('should create a project properly with default isActive & isCompleted', done => {
        request
            .post('/api/masterdata/project')
            .send({
                name: 'Project X',
                code: 'projx',
                region: 2,
                commissionSchemeId: 3,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(async function () {
                const [project] = await db
                    .table('project')
                    .where('code', 'projx')

                expect(project.name).toBe('Project X')
                expect(project.region).toBe(2)
                expect(project.commissionSchemeId).toBe(3)
                expect(project.isActive).toBeTruthy() // Default "isActive" is "true"
                expect(project.isCompleted).toBeFalsy() // Default "isCompleted" is "false"
            })
            .expect(200, done)
    })

    it('should create a project properly with provided isActive & isCompleted values', done => {
        request
            .post('/api/masterdata/project')
            .send({
                name: 'Project Y',
                code: 'projy',
                region: 1,
                commissionSchemeId: 2,
                isActive: false,
                isCompleted: true,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(async function () {
                const [project] = await db
                    .table('project')
                    .where('code', 'projy')

                expect(project.name).toBe('Project Y')
                expect(project.region).toBe(1)
                expect(project.commissionSchemeId).toBe(2)
                expect(project.isActive).toBeFalsy()
                expect(project.isCompleted).toBeTruthy()
            })
            .expect(200, done)
    })
})
