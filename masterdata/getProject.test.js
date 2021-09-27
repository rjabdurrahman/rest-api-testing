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

describe('/api/masterdata/project get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/masterdata/project').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/masterdata/project')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/masterdata/project')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/masterdata/project')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/masterdata/project')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return error if fields param is not array of string', done => {
        request
            .get('/api/masterdata/project?fields="id"')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Fields param should be array of string'
                )
            })
            .expect(400, done)
    })

    it('should return error if fields param is not valid', done => {
        request
            .get('/api/masterdata/project?fields=["id", "abc"]')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe(
                    'Fields param array of strings are not valid'
                )
            })
            .expect(400, done)
    })

    it("should return project's list with commission & country without fields", done => {
        request
            .get('/api/masterdata/project')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectCommissionCountry = res.body
                expect(projectCommissionCountry.length).toBe(3)
                expect(projectCommissionCountry[0].id).toBe(1)
                expect(projectCommissionCountry[0].name).toBe(
                    'Stock Exchange Tower Center'
                )
                expect(projectCommissionCountry[0].isActive).toBe(1)
                expect(projectCommissionCountry[0].region).toEqual({
                    id: 1,
                    name: 'UK',
                    currency: 'GBP',
                })
                expect(projectCommissionCountry[0].code).toBe('setc')
                expect(projectCommissionCountry[0].isCompleted).toBe(0)
                expect(projectCommissionCountry[0].commissionSchemeId).toEqual({
                    id: 2,
                    name: '95% Commission Scheme',
                })
            })
            .expect(200, done)
    })

    it('should return error if id is provided but no project is found', done => {
        request
            .get('/api/masterdata/project?id=100')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Project not found')
            })
            .expect(404, done)
    })

    it('should return one project with commission & country without fields', done => {
        request
            .get('/api/masterdata/project?id=1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectCommissionCountry = res.body

                expect(projectCommissionCountry.id).toBe(1)
                expect(projectCommissionCountry.name).toBe(
                    'Stock Exchange Tower Center'
                )
                expect(projectCommissionCountry.isActive).toBe(1)
                expect(projectCommissionCountry.region).toEqual({
                    id: 1,
                    name: 'UK',
                    currency: 'GBP',
                })
                expect(projectCommissionCountry.code).toBe('setc')
                expect(projectCommissionCountry.isCompleted).toBe(0)
                expect(projectCommissionCountry.commissionSchemeId).toEqual({
                    id: 2,
                    name: '95% Commission Scheme',
                })
            })
            .expect(200, done)
    })

    it("should return project's list with commission & country with fields", done => {
        request
            .get('/api/masterdata/project?fields=["id", "name"]')
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectCommissionCountry = res.body
                expect(projectCommissionCountry.length).toBe(3)
                expect(projectCommissionCountry[0].id).toBe(1)
                expect(projectCommissionCountry[0].name).toBe(
                    'Stock Exchange Tower Center'
                )
                expect(projectCommissionCountry[0].isActive).toBeUndefined()
                expect(projectCommissionCountry[0].region).toBeUndefined()
            })
            .expect(200, done)
    })

    it("should return project's list with commission & country with more fields param", done => {
        request
            .get(
                '/api/masterdata/project?fields=["id", "name", "code", "region", "commissionSchemeId"]'
            )
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectCommissionCountry = res.body
                expect(projectCommissionCountry.length).toBe(3)
                expect(projectCommissionCountry[0].id).toBe(1)
                expect(projectCommissionCountry[0].name).toBe(
                    'Stock Exchange Tower Center'
                )
                expect(projectCommissionCountry[0].isActive).toBeUndefined()
                expect(projectCommissionCountry[0].region).toEqual({
                    id: 1,
                    name: 'UK',
                    currency: 'GBP',
                })
                expect(projectCommissionCountry[0].code).toBe('setc')
                expect(projectCommissionCountry[0].isCompleted).toBeUndefined()
                expect(projectCommissionCountry[0].commissionSchemeId).toEqual({
                    id: 2,
                    name: '95% Commission Scheme',
                })
            })
            .expect(200, done)
    })

    it('should return one project with commission & country with more fields param', done => {
        request
            .get(
                '/api/masterdata/project?id=1&fields=["id","name","code","region","commissionSchemeId"]'
            )
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectCommissionCountry = res.body

                expect(projectCommissionCountry.id).toBe(1)
                expect(projectCommissionCountry.name).toBe(
                    'Stock Exchange Tower Center'
                )
                expect(projectCommissionCountry.isActive).toBeUndefined()
                expect(projectCommissionCountry.region).toEqual({
                    id: 1,
                    name: 'UK',
                    currency: 'GBP',
                })
                expect(projectCommissionCountry.code).toBe('setc')
                expect(projectCommissionCountry.isCompleted).toBeUndefined()
                expect(projectCommissionCountry.commissionSchemeId).toEqual({
                    id: 2,
                    name: '95% Commission Scheme',
                })
                expect(
                    projectCommissionCountry.paymentScheduleId
                ).toBeUndefined()
            })
            .expect(200, done)
    })

    it('should return one project with marketing & country param', done => {
        request
            .get(
                '/api/masterdata/project?id=1&fields=["id","region","marketing", "paymentScheduleId" ]'
            )
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectMarketingCountry = res.body
                const { marketing, paymentScheduleId } = projectMarketingCountry
                const { heroBannerId } = marketing

                expect(projectMarketingCountry.id).toBe(1)
                expect(projectMarketingCountry.name).toBeUndefined()
                expect(projectMarketingCountry.isActive).toBeUndefined()
                expect(projectMarketingCountry.code).toBeUndefined()
                expect(projectMarketingCountry.region).toEqual({
                    id: 1,
                    name: 'UK',
                    currency: 'GBP',
                })

                expect(marketing.id).toBe(1)
                expect(marketing.projectId).toBe(1)
                expect(marketing.locationTagColor).toBe('#FF0000')
                expect(marketing.sloganTextColor).toBe('#000')
                expect(marketing.projectStatus).toBe('Promtion')
                expect(marketing.isActive).toBeTruthy()
                expect(marketing.lat).toBe(25.778978)
                expect(marketing.lon).toBe(-80.18234)

                expect(marketing.sloganTransId.id).toBe(1)
                expect(marketing.sloganTransId.en).toBe(
                    'Move to What Moves You'
                )
                expect(marketing.sloganTransId['zh-CN']).toBe(
                    '移动到让你感动的地方'
                )
                expect(marketing.sloganTransId['zh-HK']).toBe(
                    '移動到讓你感動的地方'
                )

                expect(heroBannerId.id).toBe(1)
                expect(heroBannerId.projectId).toBe(1)
                expect(heroBannerId.type).toBe('PICTURE_PROJECT')
                expect(heroBannerId.url).toBe('URL1')

                expect(heroBannerId.fileId.id).toBe(1)
                expect(heroBannerId.fileId.filename).toBe(
                    '1581308611_CCG01.JPG'
                )
                expect(heroBannerId.fileId.type).toBe('PICTURE_PRODUCT')
                expect(heroBannerId.fileId.bucket).toBe('ncproductpic')
                expect(heroBannerId.fileId.tag).toBe(null)

                expect(paymentScheduleId.id).toBe(1)
                expect(paymentScheduleId.projectId).toBe(1)
                expect(paymentScheduleId.isActive).toBe(1)
                expect(paymentScheduleId.isDefault).toBe(1)
                expect(paymentScheduleId.bookingFee).toBe(25000)
                expect(paymentScheduleId.firstDepositPercent).toBe(0.3)
                expect(paymentScheduleId.firstDepositDueDays).toBe(14)
                expect(paymentScheduleId.firstDepositDueMonths).toBe(null)
                expect(paymentScheduleId.firstDepositEvent).toBe('reservation')
                expect(paymentScheduleId.secondDepositPercent).toBe(0.15)
                expect(paymentScheduleId.secondDepositDueDays).toBe(28)
                expect(paymentScheduleId.secondDepositDueMonths).toBe(null)
                expect(paymentScheduleId.secondDepositEvent).toBe(
                    'contractSigning'
                )
                expect(paymentScheduleId.finalDepositPercent).toBe(0.55)
                expect(paymentScheduleId.finalDepositDueMonths).toBe(44)
                expect(paymentScheduleId.finalDepositDueYears).toBe(null)
                expect(paymentScheduleId.finalDepositEvent).toBe('transfer')
                expect(paymentScheduleId.finalDepositDate).toBe(null)
                expect(paymentScheduleId.finalDepositDateTerms).toBe(null)
            })
            .expect(200, done)
    })
})
