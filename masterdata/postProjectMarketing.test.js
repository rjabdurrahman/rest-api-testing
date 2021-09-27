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

describe('/api/masterdata/projectMarketing post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/masterdata/projectMarketing').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/masterdata/projectMarketing')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return an error if projectId parameter not passed', done => {
        request
            .post('/api/masterdata/projectMarketing')
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

    it('should return an error if projectId parameter not passed', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({ abc: 'fack' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'projectId'"
                )
            })
            .expect(400, done)
    })

    it('should return an error if locationTagColor parameter not passed', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({ projectId: 1 })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'locationTagColor'"
                )
            })
            .expect(400, done)
    })

    it('should return an error if sloganTextColor parameter not passed', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1 },
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'sloganTextColor'"
                )
            })
            .expect(400, done)
    })

    it('should return an error if heroBannerId parameter not passed', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1 },
                sloganTextColor: '#000',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'heroBannerId'"
                )
            })
            .expect(400, done)
    })

    it('should return an error if projectStatus parameter not passed', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1 },
                sloganTextColor: '#000',
                heroBannerId: 1,
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    "must have required property 'projectStatus'"
                )
            })
            .expect(400, done)
    })

    it('should return an error if passed projectStatus parameter not valid', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1 },
                sloganTextColor: '#000',
                heroBannerId: 1,
                projectStatus: 'test',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'must be equal to one of the allowed values'
                )
            })
            .expect(400, done)
    })

    it('should return an error if en slogan value not available in sloganTransId', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1 },
                sloganTextColor: '#000',
                heroBannerId: 1,
                projectStatus: 'test',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'must be equal to one of the allowed values'
                )
            })
            .expect(400, done)
    })

    it('should return an error if zh-CN slogan value not available in sloganTransId', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1, en: 'testing' },
                sloganTextColor: '#000',
                heroBannerId: 1,
                projectStatus: 'test',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'must be equal to one of the allowed values'
                )
            })
            .expect(400, done)
    })

    it('should return an error if zh-HK slogan value not available in sloganTransId', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: { id: 1, en: 'testing', 'zh-CN': 'testing' },
                sloganTextColor: '#000',
                heroBannerId: 1,
                projectStatus: 'test',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'must be equal to one of the allowed values'
                )
            })
            .expect(400, done)
    })

    it('should return an error if passed projectId is not valid', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1000,
                locationTagColor: '#fff',
                sloganTransId: {
                    id: 1,
                    en: 'testing',
                    'zh-CN': 'testing',
                    'zh-HK': 'testing',
                },
                sloganTextColor: '#000',
                heroBannerId: 1,
                projectStatus: 'New Project',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Provided projectId does not exist')
            })
            .expect(400, done)
    })

    it('should return an error if passed heroBannerId is not valid', done => {
        request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: {
                    id: 1,
                    en: 'testing',
                    'zh-CN': 'testing',
                    'zh-HK': 'testing',
                },
                sloganTextColor: '#000',
                heroBannerId: 1000,
                projectStatus: 'New Project',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Provided heroBannerId does not exist'
                )
            })
            .expect(400, done)
    })

    it('should insert a record in project_marketing properly', async done => {
        const oldProjectMarketing = await db('project_marketing').select()
        const oldTranslations = await db('translation').select()
        const res = await request
            .post('/api/masterdata/projectMarketing')
            .send({
                projectId: 1,
                locationTagColor: '#fff',
                sloganTransId: {
                    en: 'testing4',
                    'zh-CN': 'testing4',
                    'zh-HK': 'testing4',
                },
                sloganTextColor: '#000',
                heroBannerId: 1,
                projectStatus: 'New Project',
                lat: 123.456,
                lon: -123.456,
            })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))

        const newProjectMarketing = await db('project_marketing').select()
        expect(newProjectMarketing.length).toBe(oldProjectMarketing.length + 1)

        const newTranslation = await db('translation')
            .select()
            .where('id', oldTranslations.length + 1)
            .first()
        expect(newTranslation.id).toBe(oldTranslations.length + 1)
        expect(newTranslation.parentTable).toBe('project_marketing.slogan')
        expect(newTranslation.parentId).toBe(4)
        expect(newTranslation.en).toBe('testing4')
        expect(newTranslation['zh-CN']).toBe('testing4')
        expect(newTranslation['zh-HK']).toBe('testing4')
        done()
    })

    it('should update a record in project_marketing properly', async done => {
        const res = await request
            .post('/api/masterdata/projectMarketing')
            .send({
                id: 1,
                projectId: 1,
                locationTagColor: '#040404',
                sloganTransId: {
                    id: 1,
                    en: 'testing1',
                    'zh-CN': 'testing1',
                    'zh-HK': 'testing1',
                },
                sloganTextColor: '#frfrfr',
                heroBannerId: 1,
                projectStatus: 'Ready to Move in',
                lat: 123.456,
                lon: -123.456,
            })
            .set('authorization', `Bearer ${jwt}`)

        expect(res.status).toBe(200)
        expect(res.text).toBe(JSON.stringify({ ok: true }))

        const updatedCommissionScheme = await db('project_marketing')
            .select()
            .where('id', 1)
            .first()
        expect(updatedCommissionScheme.id).toBe(1)
        expect(updatedCommissionScheme.projectId).toBe(1)
        expect(updatedCommissionScheme.sloganTransId).toBe(1)
        expect(updatedCommissionScheme.heroBannerId).toBe(1)
        expect(updatedCommissionScheme.locationTagColor).toBe('#040404')
        expect(updatedCommissionScheme.sloganTextColor).toBe('#frfrfr')
        expect(updatedCommissionScheme.projectStatus).toBe('Ready to Move in')
        expect(updatedCommissionScheme.lat).toBe(123.456)
        expect(updatedCommissionScheme.lon).toBe(-123.456)

        const updatedTranslation = await db('translation')
            .select()
            .where('id', 1)
            .first()
        expect(updatedTranslation.id).toBe(1)
        expect(updatedTranslation.parentTable).toBe('project_marketing.slogan')
        expect(updatedTranslation.parentId).toBe(1)
        expect(updatedTranslation.en).toBe('testing1')
        expect(updatedTranslation['zh-CN']).toBe('testing1')
        expect(updatedTranslation['zh-HK']).toBe('testing1')

        done()
    })
})
