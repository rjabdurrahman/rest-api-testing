import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../index.mjs'
import { mockSendEmail } from '../__mocks__/nodemailer'

// Overwrite the default airtable mock
jest.mock('airtable', () => {
    const firstPageMock = jest
        .fn()
        .mockImplementationOnce(() => {
            throw new Error('Airtable error')
        })
        .mockImplementationOnce(() => {
            return new Promise(resolve => {
                resolve(false)
            })
        })
        .mockImplementationOnce(() => {
            return new Promise(resolve => {
                resolve('fake-false-result')
            })
        })
        .mockImplementationOnce(() => {
            return new Promise(resolve => {
                resolve([
                    {
                        fields: {
                            Email: 'test@gmail.com',
                            Channels: [],
                        },
                    },
                ])
            })
        })
        .mockImplementationOnce(() => {
            return new Promise(resolve => {
                resolve([
                    {
                        fields: {
                            Email: 'test1@gmail.com',
                            Channels: [],
                        },
                    },
                ])
            })
        })
        .mockImplementationOnce(() => {
            return new Promise(resolve => {
                resolve([
                    {
                        fields: {
                            Email: 'test3@gmail.com',
                            Channels: ['airTableId1'],
                        },
                    },
                ])
            })
        })

    const airtableObj = {
        select: () => airtableObj,
        firstPage: firstPageMock,
    }

    const airtable = {
        configure: () => {},
        base: () => {
            return () => airtableObj
        },
    }

    return airtable
})

// Apply knex migration & seed data
beforeAll(async () => {
    // These database names can be any names as long as they are the same as the ones used in 'migrations' folder
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.JWT_SECRET = 'secret'
    process.env.EMAIL_CONFIRM_URL_FRONTEND = 'http://localhost'
    process.env.AIRTABLE_DB_FINANCEADMIN = 'Some table'
    process.env.DEFAULT_CHANNEL_ADMIN_ROLE = 1
    process.env.DEFAULT_CHANNEL_USER_ROLE = 2

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)

describe('/api/channel/register post endpoint', () => {
    it('should require captcha token', done => {
        request
            .post('/api/channel/register')
            .send()
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'bad request - no token provided in body'
                )
            })
            .expect(500, done)
    })

    it('should require proper captcha token', done => {
        request
            .post('/api/channel/register')
            .send({ token: '123' })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toContain(
                    'bad request - invalid-input-response'
                )
            })
            .expect(500, done)
    })

    it('should require first name', done => {
        request
            .post('/api/channel/register')
            .send({ passCaptcha: true })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your first name')
            })
            .expect(400, done)
    })

    it('should require first name to be at least 2-character long', done => {
        request
            .post('/api/channel/register')
            .send({ passCaptcha: true, first_name: 'j' })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'First name must be at least 2-character long'
                )
            })
            .expect(400, done)
    })

    it('should require last name', done => {
        request
            .post('/api/channel/register')
            .send({ passCaptcha: true, first_name: 'john' })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your last name')
            })
            .expect(400, done)
    })

    it('should require last name to be at least 2-character long', done => {
        request
            .post('/api/channel/register')
            .send({ passCaptcha: true, first_name: 'john', last_name: 'd' })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Last name must be at least 2-character long'
                )
            })
            .expect(400, done)
    })

    it('should require email', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your email')
            })
            .expect(400, done)
    })

    it('should require password', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your password')
            })
            .expect(400, done)
    })

    it('should require password to be at least 6-character long', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'test',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Password should be at least 6-character long'
                )
            })
            .expect(400, done)
    })

    it('should require password not to have more than two times the symbol "$"', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'test$$$',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Your password cannot contain more than three times the symbol `$`'
                )
            })
            .expect(400, done)
    })

    it('should require password to have upper characters', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'testtt',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Password should have numbers, upper characters and lower characters'
                )
            })
            .expect(400, done)
    })

    it('should require password to have lower characters', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'TESTTT',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Password should have numbers, upper characters and lower characters'
                )
            })
            .expect(400, done)
    })

    it('should require password to have numbers', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'Testtt',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Password should have numbers, upper characters and lower characters'
                )
            })
            .expect(400, done)
    })

    it('should require email to be valid', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'testgmail.com',
                password: 'Testt1',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide valid email address')
            })
            .expect(400, done)
    })

    it('should return error airtable throws an error', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'Testt1',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Airtable query error')
            })
            .expect(500, done)
    })

    it('should return error airtable does not return anything', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'Testt1',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'User is not a valid channel representative'
                )
            })
            .expect(403, done)
    })

    it('should return error airtable does not return an array', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'Testt1',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Airtable error, expecting Array but return something else'
                )
            })
            .expect(500, done)
    })

    it('should return error of email being already taken in database', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'john',
                last_name: 'doe',
                email: 'ming@nicecar.hk',
                password: 'Testt1',
            })
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Email is already taken')
            })
            .expect(400, done)
    })

    it('should send email properly and return user token', done => {
        request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'johnX',
                last_name: 'doeX',
                email: 'test@gmail.com',
                password: 'Testt1',
            })
            .set('Host', 'dev.nicecar.store')
            .expect(200)
            .end(async (err, res) => {
                // Check if the newly added user is stored in the 'auth_user' table
                const newlyAddedUser = await db
                    .table('auth_user')
                    .select(['id', 'registration_key'])
                    .where('email', 'test@gmail.com')

                expect(newlyAddedUser).toBeTruthy()
                expect(newlyAddedUser.length).toBe(1)

                // 'registration_key' is not null, waiting for user to confirm his email
                expect(newlyAddedUser[0].registration_key).toBeTruthy()

                const roles = await db
                    .table('auth_membership')
                    .where('user_id', newlyAddedUser[0].id)
                    .select(['group_id'])
                const rolesArr = roles.map(r => r.group_id)
                // The new user should have 2 roles: channelAdmin & channelUser
                expect(roles.length).toBe(2)
                expect(rolesArr[0]).toBe(
                    +process.env.DEFAULT_CHANNEL_ADMIN_ROLE
                ) // channelAdmin
                expect(rolesArr[1]).toBe(+process.env.DEFAULT_CHANNEL_USER_ROLE) // channelUser

                // Email should be sent
                expect(mockSendEmail).toHaveBeenCalledTimes(1)
                // 'to' email
                expect(mockSendEmail.mock.calls[0][0].to).toBe('test@gmail.com')
                // Email subject
                expect(mockSendEmail.mock.calls[0][0].subject).toBe(
                    'Hello johnX doeX'
                )

                // Server returns token
                expect(res.text).toContain('jwt')

                if (err) return done(err)
                else return done()
            })
    })

    it('should create new channel for newly created user & change channelId if channel return from airtable', async done => {
        const oldChannels = await db('Channel').select()

        const res = await request
            .post('/api/channel/register')
            .send({
                passCaptcha: true,
                first_name: 'test3',
                last_name: 'test3',
                email: 'test3@gmail.com',
                password: 'testT@2',
            })
            .set('Host', 'dev.nicecar.store')

        expect(res.status).toBe(200)
        expect(oldChannels.length).toBe(3)

        const newChannel = await db('Channel').select().where({ id: 4 }).first()
        expect(newChannel.id).toBe(4)
        expect(newChannel.airTableId).toBe('airTableId1')
        expect(newChannel.userId).toBe(14)

        const newUser = await db('auth_user').select().where({ id: 14 }).first()
        expect(newUser.id).toBe(14)
        expect(newUser.channelId).toBe(4)

        done()
    })
})
