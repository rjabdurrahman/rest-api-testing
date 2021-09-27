import supertest from 'supertest'
import { db } from '@chassis-app/fulcrum-dbschema'

import server from '../../index.mjs'
import { issue } from '../../services/auth.mjs'

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

describe('/api/sites/cmp/region/:country GET endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/sites/cmp/region/UK').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user does not belong to an authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it("should return error if country's template is not found", done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/sites/cmp/region/fake-country')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe("Country's template not found")
            })
            .expect(404, done)
    })

    it('should return projects & template based on sites_cmp_project_region_${country} key', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/sites/cmp/region/UK')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const {
                    projects: [
                        {
                            id,
                            name,
                            isActive,
                            region,
                            code,
                            isCompleted,
                            commissionSchemeId,
                            airtableId,
                            marketing,
                        },
                    ],
                    heroProjects: [{ id: hId, name: hName }],
                    template,
                } = res.body

                expect(id).toBe(1)
                expect(name).toBe('Stock Exchange Tower Center')
                expect(isActive).toBeTruthy()
                expect(code).toBe('setc')
                expect(isCompleted).toBe(0)
                expect(commissionSchemeId).toBe(2)
                expect(airtableId).toBe('airtableId1')

                expect(region.id).toBe(1)
                expect(region.name).toBe('UK')

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

                expect(marketing.heroBannerId.id).toBe(1)
                expect(marketing.heroBannerId.projectId).toBe(1)
                expect(marketing.heroBannerId.type).toBe('PICTURE_PROJECT')
                expect(marketing.heroBannerId.url).toBe('URL1')

                expect(marketing.heroBannerId.fileId.id).toBe(1)
                expect(marketing.heroBannerId.fileId.filename).toBe(
                    '1581308611_CCG01.JPG'
                )
                expect(marketing.heroBannerId.fileId.type).toBe(
                    'PICTURE_PRODUCT'
                )
                expect(marketing.heroBannerId.fileId.bucket).toBe(
                    'ncproductpic'
                )
                expect(marketing.heroBannerId.fileId.tag).toBe(null)

                expect(hId).toBe(3)
                expect(hName).toBe('Belmont Place')
                expect(template).toBe('template1')
            })
            .expect(200, done)
    })
})
