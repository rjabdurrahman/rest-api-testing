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

describe('/api/sites/cmp/project/:id GET endpoint', () => {
    it('should require a header token', done => {
        request.get('/api/sites/cmp/project/1').expect(401, done)
    })

    it('should require valid token: "BearerS"', done => {
        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', 'BearerS')
            .expect(401, done)
    })

    it('should require valid token: "Bearer "', done => {
        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', 'Bearer ')
            .expect(401, done)
    })

    it('should require valid token: "Bearer 123"', done => {
        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', 'Bearer 123')
            .expect(401, done)
    })

    it('should return error if user does not belong to an authenticated group', done => {
        const jwt = issue({ id: 2 })

        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                const error = JSON.parse(res.error.text)
                expect(error.message).toBe('Unauthorized')
            })
            .expect(401, done)
    })

    it('should return empty object if we have no template for this record', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/sites/cmp/project/100')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(function (res) {
                expect(res.text).toBe('{}')
            })
            .expect(200, done)
    })

    it('should return templates, pamphlet, floorplan, unitplan & gallery based on sites_cmp_project__${id} key', done => {
        const jwt = issue({ id: 1 })

        request
            .get('/api/sites/cmp/project/1')
            .send()
            .set('authorization', `Bearer ${jwt}`)
            .expect(res => {
                const {
                    template,
                    pamphlet,
                    gallery,
                    floorplan,
                    unitplan,
                    map,
                } = res.body
                expect(template).toBe('template1')

                expect(pamphlet.length).toBe(3)
                expect(pamphlet[0].id).toBe(1)
                expect(pamphlet[0].projectId).toBe(1)
                expect(pamphlet[0].type).toBe('PICTURE_PROJECT')
                expect(pamphlet[0].url).toBe('URL1')

                expect(pamphlet[0].fileId.id).toBe(1)
                expect(pamphlet[0].fileId.filename).toBe('1581308611_CCG01.JPG')
                expect(pamphlet[0].fileId.type).toBe('PICTURE_PRODUCT')
                expect(pamphlet[0].fileId.bucket).toBe('ncproductpic')
                expect(pamphlet[0].fileId.tag).toBe(null)

                expect(gallery.exterior.length).toBe(2)
                expect(gallery.facilities.length).toBe(0)
                expect(gallery.showroom.length).toBe(1)

                expect(floorplan.aino.length).toBe(1)
                expect(floorplan.gemi.length).toBe(1)

                expect(unitplan.aino.length).toBe(1)
                expect(unitplan.gemi.length).toBe(1)

                expect(unitplan.gemi[0].id).toBe(2)
                expect(unitplan.gemi[0].projectId).toBe(2)
                expect(unitplan.gemi[0].type).toBe('PICTURE_PROJECT')
                expect(unitplan.gemi[0].url).toBe('URL2')

                expect(unitplan.gemi[0].fileId.id).toBe(2)
                expect(unitplan.gemi[0].fileId.filename).toBe(
                    '1609815549_2021.jpg'
                )
                expect(unitplan.gemi[0].fileId.type).toBe('PICTURE_PRODUCT')
                expect(unitplan.gemi[0].fileId.bucket).toBe(
                    'fulcrum-productmedia'
                )
                expect(unitplan.gemi[0].fileId.tag).toBe(null)

                expect(map.surrounding.length).toBe(1)
                expect(map.surrounding[0].id).toBe(1)
                expect(map.surrounding[0].projectId).toBe(1)
                expect(map.surrounding[0].type).toBe('PICTURE_PROJECT')
                expect(map.surrounding[0].url).toBe('URL1')

                expect(map.surrounding[0].fileId.id).toBe(1)
                expect(map.surrounding[0].fileId.filename).toBe(
                    '1581308611_CCG01.JPG'
                )
                expect(map.surrounding[0].fileId.type).toBe('PICTURE_PRODUCT')
                expect(map.surrounding[0].fileId.bucket).toBe('ncproductpic')
                expect(map.surrounding[0].fileId.tag).toBe(null)
            })
            .expect(200, done)
    })
})
