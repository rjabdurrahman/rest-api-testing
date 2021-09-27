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

describe('/api/masterdata/projectInventory get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/masterdata/projectInventory').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/masterdata/projectInventory')
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/masterdata/projectInventory')
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/masterdata/projectInventory')
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/masterdata/projectInventory')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return an error if id or projectId param not provided', done => {
        request
            .get('/api/masterdata/projectInventory')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('please provide id or projectId')
            })
            .expect(400, done)
    })

    it('should return an error if fields param is not array of string', done => {
        request
            .get('/api/masterdata/projectInventory?id=1&fields="id"')
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
            .get('/api/masterdata/projectInventory?id=1&fields=["id", "abc"]')
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

    it('should return error if provided id is not available in table', done => {
        request
            .get('/api/masterdata/projectInventory?id=11')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Project inventory not found')
            })
            .expect(404, done)
    })

    it('should return projectInventory as an empty array if provided projectId is not available in table', done => {
        request
            .get('/api/masterdata/projectInventory?projectId=11')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventoryById = res.body
                expect(projectInventoryById.length).toBe(0)
            })
            .expect(200, done)
    })

    it('should return projectInventory record by projectId', done => {
        request
            .get('/api/masterdata/projectInventory?projectId=1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventoryByProjectId = res.body
                expect(projectInventoryByProjectId.length).toBe(2)
                const projectId2 = projectInventoryByProjectId[1]
                const { paymentScheduleId } = projectId2

                expect(projectId2.id).toBe(2)
                expect(projectId2.unit_no).toBe('12D12X')
                expect(projectId2.version).toBe(2)

                expect(projectId2.projectId).toBe(1)
                expect(projectId2.floor).toBe('Five')
                expect(projectId2.unit_type).toBe('2 Bed Fullplex')
                expect(projectId2.beds).toBe('3 bedroom')
                expect(projectId2.carpark).toBe('2 car parking')

                expect(projectId2.title_deed_area_sqm).toBe(32.27)
                expect(projectId2.interior_work_area_sqm).toBe(18.08)
                expect(projectId2.overseas_price).toBe(486089)
                expect(projectId2.local_price).toBe(386089)
                expect(projectId2.unit_status).toBe('Unavailable')

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

    it('should return projectInventory record by id', done => {
        request
            .get('/api/masterdata/projectInventory?id=1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventoryById = res.body

                expect(projectInventoryById.id).toBe(1)
                expect(projectInventoryById.unit_no).toBe('11D11X')
                expect(projectInventoryById.version).toBe(1)

                expect(projectInventoryById.projectId).toBe(1)
                expect(projectInventoryById.floor).toBe('First')
                expect(projectInventoryById.unit_type).toBe('1 Bed Fullplex')
                expect(projectInventoryById.beds).toBe('2 bedroom')
                expect(projectInventoryById.carpark).toBe('1 car parking')

                expect(projectInventoryById.title_deed_area_sqm).toBe(31.27)
                expect(projectInventoryById.interior_work_area_sqm).toBe(15.08)
                expect(projectInventoryById.overseas_price).toBe(386089)
                expect(projectInventoryById.local_price).toBe(286089)
                expect(projectInventoryById.unit_status).toBe('Sold')
                expect(projectInventoryById.paymentScheduleId.id).toBe(1)
            })
            .expect(200, done)
    })

    it('should return projectInventory record by id & with some fields', done => {
        request
            .get(
                '/api/masterdata/projectInventory?id=1&fields=["id","unit_no","unit_type","unit_status","total_area_sqm","marketing_cmp_unitpage"]'
            )
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventoryById = res.body

                expect(projectInventoryById.id).toBe(1)
                expect(projectInventoryById.unit_no).toBe('11D11X')
                expect(projectInventoryById.version).toBeUndefined()

                expect(projectInventoryById.projectId).toBeUndefined()
                expect(projectInventoryById.floor).toBeUndefined()
                expect(projectInventoryById.unit_type).toBe('1 Bed Fullplex')
                expect(projectInventoryById.local_price).toBeUndefined()
                expect(projectInventoryById.unit_status).toBe('Sold')
                expect(projectInventoryById.paymentScheduleId).toBeUndefined()
                expect(projectInventoryById.total_area_sqm).toBe(46.35)
                expect(projectInventoryById.title_deed_area_sqm).toBeUndefined()
                expect(
                    projectInventoryById.interior_work_area_sqm
                ).toBeUndefined()

                const gallery =
                    projectInventoryById.marketing_cmp_unitpage.gallery

                expect(gallery.length).toBe(2)
                expect(gallery[0].fileId.id).toBe(1)
                expect(gallery[0].projectId).toBe(1)
                expect(gallery[1].fileId.type).toBe('PICTURE_PRODUCT')
                expect(gallery[1].url).toBe('URL2')
            })
            .expect(200, done)
    })

    it('should return projectInventory record by id, projectId & with some fields', done => {
        request
            .get(
                '/api/masterdata/projectInventory?id=1&projectId=1&fields=["id","unit_no","unit_type","unit_status","title_deed_area_sqm"]'
            )
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventoryById = res.body

                expect(projectInventoryById.id).toBe(1)
                expect(projectInventoryById.unit_no).toBe('11D11X')
                expect(projectInventoryById.version).toBeUndefined()

                expect(projectInventoryById.projectId).toBeUndefined()
                expect(projectInventoryById.floor).toBeUndefined()
                expect(projectInventoryById.unit_type).toBe('1 Bed Fullplex')
                expect(projectInventoryById.local_price).toBeUndefined()
                expect(projectInventoryById.unit_status).toBe('Sold')
                expect(projectInventoryById.total_area_sqm).toBeUndefined()
                expect(projectInventoryById.title_deed_area_sqm).toBe(31.27)
                expect(
                    projectInventoryById.interior_work_area_sqm
                ).toBeUndefined()
                expect(projectInventoryById.paymentScheduleId).toBeUndefined()
            })
            .expect(200, done)
    })

    it('should return projectInventory record by id, projectId & with paymentScheduleId field', done => {
        request
            .get(
                '/api/masterdata/projectInventory?id=1&projectId=1&fields=["id","paymentScheduleId"]'
            )
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventoryById = res.body

                expect(projectInventoryById.id).toBe(1)
                expect(projectInventoryById.paymentScheduleId.id).toBe(1)
            })
            .expect(200, done)
    })
})
