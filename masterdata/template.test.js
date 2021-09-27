import axios from 'axios'
import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import { issue } from '../../services/auth.mjs'
import server from '../../index.mjs'

jest.mock('axios')

// Apply knex migration & seed data
beforeAll(async () => {
    await db.migrate.latest()
    await db.seed.run()
})

afterEach(() => {
    axios.mockReset()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/masterdata/getTemplate get endpoint', () => {
    it('should require valid token: BearerS', done => {
        request
            .get('/api/masterdata/getTemplate')
            .set('authorization', 'BearerS')
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Invalid token')
            })
            .expect(401, done)
    })

    // it('should return all templates data', async done => {
    //     const templateData = await db('template').select()

    //     request
    //         .get('/api/masterdata/getTemplate')
    //         .send()
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(res => {
    //             const data = res.body
    //             expect(data.length).toBe(templateData.length)
    //             expect(data[0].id).toBe(1)
    //             expect(data[0].k).toBe('user_registration_email_subject')
    //             expect(data[0].v).toBe('Hello {{first_name}} {{last_name}}')
    //             expect(data[0].tenant).toBe('dev.nicecar.store')
    //             expect(data[0].lang).toBe('en')
    //         })
    //         .expect(200, done)
    // })
})

describe('/api/masterdata/getTemplate/:code get endpoint', () => {
    it('should return an error if code is not available in template', done => {
        request
            .get('/api/masterdata/getTemplate/fackKey')
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('No such code/key available')
            })
            .expect(400, done)
    })

    it('should return code base template data', async done => {
        request
            .get('/api/masterdata/getTemplate/user_registration_email_subject')
            .set('Host', 'dev.nicecar.store')
            .expect(res => {
                const data = res.body
                expect(data[0].id).toBe(1)
                expect(data[0].k).toBe('user_registration_email_subject')
                expect(data[0].v).toBe('Hello {{first_name}} {{last_name}}')
                expect(data[0].tenant).toBe('dev.nicecar.store')
                expect(data[0].lang).toBe('en')
            })
            .expect(200, done)
    })

    // it("should return code base template data with user's language ", async done => {
    //     const jwt = issue({ id: 10 })

    //     request
    //         .get('/api/masterdata/getTemplate/contact_us_email_subject')
    //         .set({ Host: 'teavill.com', authorization: `Bearer ${jwt}` })
    //         .expect(res => {
    //             const data = res.body
    //             expect(data[0].id).toBe(9)
    //             expect(data[0].k).toBe('contact_us_email_subject')
    //             expect(data[0].v).toBe('Enquiries from contact us')
    //             expect(data[0].tenant).toBe('teavill.com')
    //             expect(data[0].lang).toBe('zh-CN')
    //         })
    //         .expect(200, done)
    // })
})

describe('/api/masterdata/addTemplate post endpoint', () => {
    it('should require valid token: BearerS', done => {
        request
            .post('/api/masterdata/addTemplate')
            .send()
            .set('authorization', 'BearerS')
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.status).toBe(401)
                expect(error.message).toBe('Invalid token')
            })
            .expect(401, done)
    })

    it('should require valid token: Bearer ', done => {
        request
            .post('/api/masterdata/addTemplate')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: Bearer 123', done => {
        request
            .post('/api/masterdata/addTemplate')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    // it('should return an error if data not provided', async done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({})
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.status).toBe(400)
    //             expect(error.message).toBe('Please provide template details')
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if k not passed', done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({ abc: 123 })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe("must have required property 'k'")
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if v not passed', done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({ k: 'key' })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe("must have required property 'v'")
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if tenant not passed', done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({ k: 'key', v: 'value' })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe(
    //                 "must have required property 'tenant'"
    //             )
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if lang not passed', done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({ k: 'key', v: 'value', tenant: 'abc.com' })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe("must have required property 'lang'")
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if v is not string', done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({ k: 'key', v: 123, tenant: 'abc.com', lang: 'en' })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe('must be string')
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if provided data already exist in template table', done => {
    //     request
    //         .post('/api/masterdata/addTemplate')
    //         .send({
    //             k: 'user_registration_email_subject',
    //             v: 'Hello {{first_name}} {{last_name}}',
    //             tenant: 'dev.nicecar.store',
    //             lang: 'en',
    //         })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe(
    //                 'Provided template details are already available'
    //             )
    //         })
    //         .expect(400, done)
    // })

    // it('should create a new template and return its id', async done => {
    //     const res = await request
    //         .post('/api/masterdata/addTemplate')
    //         .send({
    //             k: 'test',
    //             v: 'test',
    //             tenant: 'nicecar.store',
    //             lang: 'en',
    //         })
    //         .set('authorization', `Bearer ${jwt}`)

    //     expect(res.status).toBe(200)
    //     expect(res.text).toBe(JSON.stringify({ ok: true, id: 14 }))

    //     const template = await db('template').where('id', 14).select().first()

    //     expect(template.k).toBe('test')
    //     expect(template.v).toBe('test')
    //     expect(template.tenant).toBe('nicecar.store')
    //     expect(template.lang).toBe('en')

    //     done()
    // })
})

describe('/api/masterdata/editTemplate post endpoint', () => {
    it('should require valid token: BearerS', done => {
        request
            .post('/api/masterdata/editTemplate')
            .send()
            .set('authorization', 'BearerS')
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.status).toBe(401)
                expect(error.message).toBe('Invalid token')
            })
            .expect(401, done)
    })

    // it('should return an error if data not provided', async done => {
    //     request
    //         .post('/api/masterdata/editTemplate')
    //         .send({})
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.status).toBe(400)
    //             expect(error.message).toBe('Please provide template details')
    //         })
    //         .expect(400, done)
    // })

    // it('should return an error if id not provided', async done => {
    //     request
    //         .post('/api/masterdata/editTemplate')
    //         .send({ abc: '123' })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.status).toBe(400)
    //             expect(error.message).toBe(
    //                 'Please provide id to update template details'
    //             )
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if k not passed', done => {
    //     request
    //         .post('/api/masterdata/editTemplate')
    //         .send({ id: 'fack', abc: 123 })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe("must have required property 'k'")
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if provided id not exist in template table', done => {
    //     request
    //         .post('/api/masterdata/editTemplate')
    //         .send({
    //             id: 1234,
    //             k: 'user_registered_email_en',
    //             v: 'Email template en',
    //             tenant: 'nicecar.store',
    //             lang: 'en',
    //         })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe(
    //                 'Provided template id is not available for update'
    //             )
    //         })
    //         .expect(400, done)
    // })

    // it('should update template with provided id', async done => {
    //     const res = await request
    //         .post('/api/masterdata/editTemplate')
    //         .send({
    //             id: 1,
    //             k: 'user_registered_email_enss',
    //             v: 'Email template enss',
    //             tenant: 'nicecar.store',
    //             lang: 'en',
    //         })
    //         .set('authorization', `Bearer ${jwt}`)

    //     expect(res.status).toBe(200)
    //     expect(res.text).toBe(JSON.stringify({ ok: true }))
    //     const template = await db('template').where('id', 1).select().first()

    //     expect(template.k).toBe('user_registered_email_enss')
    //     expect(template.v).toBe('Email template enss')
    //     expect(template.tenant).toBe('nicecar.store')
    //     expect(template.lang).toBe('en')

    //     done()
    // })
})

describe('/api/masterdata/deleteTemplate post endpoint', () => {
    it('should require valid token: BearerS', done => {
        request
            .post('/api/masterdata/deleteTemplate')
            .send()
            .set('authorization', 'BearerS')
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.status).toBe(401)
                expect(error.message).toBe('Invalid token')
            })
            .expect(401, done)
    })

    // it('should return an error if data not provided', async done => {
    //     request
    //         .post('/api/masterdata/deleteTemplate')
    //         .send({})
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.status).toBe(400)
    //             expect(error.message).toBe('Please provide template details')
    //         })
    //         .expect(400, done)
    // })

    // it('should return an error if id not provided', async done => {
    //     request
    //         .post('/api/masterdata/deleteTemplate')
    //         .send({ abc: '123' })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.status).toBe(400)
    //             expect(error.message).toBe(
    //                 'Please provide id to delete from template'
    //             )
    //         })
    //         .expect(400, done)
    // })

    // it('should return error if provided id not exist in template table', done => {
    //     request
    //         .post('/api/masterdata/deleteTemplate')
    //         .send({ id: 1234 })
    //         .set('authorization', `Bearer ${jwt}`)
    //         .expect(function (res) {
    //             const error = JSON.parse(res.error.text)
    //             expect(error.message).toBe(
    //                 'Provided template id is not available for delete'
    //             )
    //         })
    //         .expect(400, done)
    // })

    // it('should delete template of provided id', async done => {
    //     const oldTemplate = await db('template').select()

    //     const res = await request
    //         .post('/api/masterdata/deleteTemplate')
    //         .send({ id: 1 })
    //         .set('authorization', `Bearer ${jwt}`)

    //     expect(res.status).toBe(200)
    //     expect(res.text).toBe(JSON.stringify({ ok: true }))
    //     const newTemplate = await db('template').select()
    //     expect(oldTemplate.length).toBe(newTemplate.length + 1)

    //     done()
    // })
})
