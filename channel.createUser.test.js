import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../index.mjs'
import { issue } from '../services/auth.mjs'
import { mockSendEmail } from '../__mocks__/nodemailer'

// Apply knex migration & seed data
beforeAll(async () => {
    // These database names can be any names as long as they are the same as the ones used in 'migrations' folder
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'
    process.env.EMAIL_CONFIRM_URL_FRONTEND = 'http://localhost'
    process.env.AIRTABLE_DB_FINANCEADMIN = 'Some table'
    process.env.DEFAULT_CHANNEL_ADMIN_ROLE = 1
    process.env.DEFAULT_CHANNEL_USER_ROLE = 2

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/channel/createUser post endpoint', () => {
    it('should require a header token', done => {
        request.post('/api/channel/createUser').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .post('/api/channel/createUser')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .post('/api/channel/createUser')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .post('/api/channel/createUser')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .post('/api/channel/createUser')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should require first name', done => {
        request
            .post('/api/channel/createUser')
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your first name')
            })
            .expect(400, done)
    })

    it('should require first name to be at least 2-character long', done => {
        request
            .post('/api/channel/createUser')
            .send({ first_name: 'j' })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({ first_name: 'john' })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your last name')
            })
            .expect(400, done)
    })

    it('should require last name to be at least 2-character long', done => {
        request
            .post('/api/channel/createUser')
            .send({ first_name: 'john', last_name: 'd' })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your email')
            })
            .expect(400, done)
    })

    it('should require password', done => {
        request
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide your password')
            })
            .expect(400, done)
    })

    it('should require password to be at least 6-character long', done => {
        request
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'test',
            })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'test$$$',
            })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'testtt',
            })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'TESTTT',
            })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'test@gmail.com',
                password: 'Testtt',
            })
            .set('authorization', `Bearer ${jwt}`)
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
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'testgmail.com',
                password: 'Testt1',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Please provide valid email address')
            })
            .expect(400, done)
    })

    it('should return error of email being already taken in database', done => {
        request
            .post('/api/channel/createUser')
            .send({
                first_name: 'john',
                last_name: 'doe',
                email: 'ming@nicecar.hk',
                password: 'Testt1',
            })
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Email is already taken')
            })
            .expect(400, done)
    })

    it('should send email properly and return user token', done => {
        request
            .post('/api/channel/createUser')
            .send({
                first_name: 'johnX',
                last_name: 'doeX',
                email: 'test@gmail.com',
                password: 'Testt1',
            })
            .set('authorization', `Bearer ${jwt}`)
            .set('Host', 'dev.nicecar.store')
            .expect(200)
            .end(async (err, res) => {
                // Check if the newly added user is stored in the 'auth_user' table
                const newlyAddedUser = await db
                    .table('auth_user')
                    .select([
                        'id',
                        'registration_key',
                        'first_name',
                        'last_name',
                        'email',
                        'channelId',
                        'language',
                    ])
                    .where('email', 'test@gmail.com')
                    .first()

                expect(newlyAddedUser).toBeTruthy()

                // 'registration_key' is not null, waiting for user to confirm his email
                expect(newlyAddedUser.registration_key).toBeTruthy()
                expect(newlyAddedUser.first_name).toBe('johnX')
                expect(newlyAddedUser.last_name).toBe('doeX')
                expect(newlyAddedUser.email).toBe('test@gmail.com')
                expect(newlyAddedUser.language).toBe('en')
                // newly created user's channelId should same as creator's channelId
                expect(newlyAddedUser.channelId).toBe(1)

                const roles = await db
                    .table('auth_membership')
                    .where('user_id', newlyAddedUser.id)
                    .select(['group_id'])
                const rolesArr = roles.map(r => r.group_id)
                // User should have 1 role: channelUser
                expect(roles.length).toBe(1)
                expect(rolesArr[0]).toBe(+process.env.DEFAULT_CHANNEL_USER_ROLE)

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
})
