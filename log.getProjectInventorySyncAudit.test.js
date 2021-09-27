import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../index.mjs'
import { issue } from '../services/auth.mjs'

// Apply knex migration & seed data
beforeAll(async () => {
    // These database names can be any names as long as they are the same as the ones used in 'migrations' folder
    process.env.DB_AUTH_USER = 'auth_user'
    process.env.DB_AUTH_MEMBERSHIP = 'auth_membership'
    process.env.DB_AUTH_GROUP = 'auth_group'

    await db.migrate.latest()
    await db.seed.run()
})

const request = supertest(server)
const jwt = issue({ id: 1 })

describe('/api/log/projectInventorySyncAudit get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/log/projectInventorySyncAudit').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/log/projectInventorySyncAudit')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/log/projectInventorySyncAudit')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/log/projectInventorySyncAudit')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/log/projectInventorySyncAudit')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return log projectInventorySyncAudit', async done => {
        const project_inventory_sync_audit = await db(
            'project_inventory_sync_audit'
        ).select()

        request
            .get('/api/log/projectInventorySyncAudit?onlyLastPerProject=false')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventorySyncAudit = res.body
                expect(projectInventorySyncAudit.length).toBe(
                    project_inventory_sync_audit.length
                )
                expect(projectInventorySyncAudit[0].id).toBe(1)
                expect(projectInventorySyncAudit[0].time).toBe(
                    '2021-02-17 06:03:30'
                )
                expect(projectInventorySyncAudit[0].userId).toEqual({
                    id: 1,
                    first_name: 'Ming',
                    last_name: 'Sun',
                    email: 'ming@nicecar.hk',
                })
                expect(projectInventorySyncAudit[0].projectId).toBe(1)
            })
            .expect(200, done)
    })

    it('should return log projectInventorySyncAudit based on projectId provided', done => {
        request
            .get(
                '/api/log/projectInventorySyncAudit?projectId=3&onlyLastPerProject=false'
            )
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventorySyncAudit3 = res.body
                expect(projectInventorySyncAudit3.length).toBe(2)
                expect(projectInventorySyncAudit3[0].id).toBe(4)
                expect(projectInventorySyncAudit3[0].time).toBe(
                    '2021-07-17 06:03:33'
                )
                expect(projectInventorySyncAudit3[0].userId).toEqual({
                    id: 3,
                    first_name: 'Nick',
                    last_name: 'Owen',
                    email: 'nick@gmail.com',
                })
                expect(projectInventorySyncAudit3[0].projectId).toBe(3)
            })
            .expect(200, done)
    })

    it('should return log projectInventorySyncAudit based on projectId & fields provided', done => {
        request
            .get(
                '/api/log/projectInventorySyncAudit?projectId=2&fields=["id","userId"]&onlyLastPerProject=false'
            )
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventorySyncAudit2 = res.body
                expect(projectInventorySyncAudit2.length).toBe(2)
                expect(projectInventorySyncAudit2[0].id).toBe(2)
                expect(projectInventorySyncAudit2[0].time).toBeUndefined()
                expect(projectInventorySyncAudit2[0].userId).toEqual({
                    id: 2,
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@gmail.com',
                })
                expect(projectInventorySyncAudit2[0].projectId).toBeUndefined()
            })
            .expect(200, done)
    })

    it('should return log projectInventorySyncAudit based on onlyLastPerProject true provided', done => {
        request
            .get('/api/log/projectInventorySyncAudit?onlyLastPerProject=true')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const projectInventorySyncAudit = res.body
                expect(projectInventorySyncAudit.length).toBe(3)

                // It should have the latest record of projectId #3
                expect(projectInventorySyncAudit[0].id).toBe(5)
                expect(projectInventorySyncAudit[0].projectId).toBe(3)
                expect(projectInventorySyncAudit[0].time).toBe(
                    '2021-07-23 06:03:34'
                )
                expect(projectInventorySyncAudit[0].userId).toEqual({
                    id: 3,
                    first_name: 'Nick',
                    last_name: 'Owen',
                    email: 'nick@gmail.com',
                })

                // It should have the latest record of projectId #2
                expect(projectInventorySyncAudit[1].id).toBe(3)
                expect(projectInventorySyncAudit[1].projectId).toBe(2)
                expect(projectInventorySyncAudit[1].time).toBe(
                    '2021-02-25 06:03:32'
                )
            })
            .expect(200, done)
    })
})
