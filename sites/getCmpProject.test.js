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

describe('/api/sites/cmp/projects get endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/sites/cmp/projects').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/sites/cmp/projects')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/sites/cmp/projects')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/sites/cmp/projects')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user not belong to authenticated group ', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/sites/cmp/projects')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return projects, countries & template based on sites_cmp_projects key sequence', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/sites/cmp/projects')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const cmpProjectsCountriesData = res.body
                const project = cmpProjectsCountriesData.projects[0]
                const marketing = project.marketing
                const country = cmpProjectsCountriesData.countries[0]

                expect(project.id).toBe(3)
                expect(project.name).toBe('Belmont Place')
                expect(project.isActive).toBeTruthy()
                expect(project.code).toBe('bepl')
                expect(project.isCompleted).toBeTruthy()
                expect(project.commissionSchemeId).toBe(2)
                expect(project.airtableId).toBe('airtableId3')

                expect(project.region.id).toBe(2)
                expect(project.region.name).toBe('Bangkok')

                expect(marketing.id).toBe(3)
                expect(marketing.projectId).toBe(3)
                expect(marketing.locationTagColor).toBe('#FF0000')
                expect(marketing.sloganTextColor).toBe('#111')
                expect(marketing.projectStatus).toBe('Ready to Move in')
                expect(marketing.isActive).toBeTruthy()
                expect(marketing.lat).toBe(28.778978)
                expect(marketing.lon).toBe(-85.18234)

                expect(marketing.sloganTransId.id).toBe(3)
                expect(marketing.sloganTransId.en).toBe('Expect Better')
                expect(marketing.sloganTransId['zh-CN']).toBe('期待更好')
                expect(marketing.sloganTransId['zh-HK']).toBe('期待更好')

                expect(marketing.heroBannerId.id).toBe(3)
                expect(marketing.heroBannerId.projectId).toBe(2)
                expect(marketing.heroBannerId.type).toBe('PICTURE_PROJECT')
                expect(marketing.heroBannerId.url).toBe('URL3')

                expect(marketing.heroBannerId.fileId.id).toBe(3)
                expect(marketing.heroBannerId.fileId.filename).toBe(
                    '1609815752_2021.jpg'
                )
                expect(marketing.heroBannerId.fileId.type).toBe(
                    'PICTURE_PRODUCT'
                )
                expect(marketing.heroBannerId.fileId.bucket).toBe(
                    'fulcrum-productmedia'
                )
                expect(marketing.heroBannerId.fileId.tag).toBe(null)

                expect(country.id).toBe(1)
                expect(country.name).toBe('UK')
                expect(country.currency).toBe('GBP')
                expect(cmpProjectsCountriesData.template).toBe('template1')
            })
            .expect(200, done)
    })
})
