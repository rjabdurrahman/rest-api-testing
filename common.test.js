import supertest from 'supertest'

import server from '../index.mjs'

const request = supertest(server)

describe('Common APIs should work properly', () => {
    it('/live should notify callers properly', done => {
        request
            .get('/live')
            .expect(function (res) {
                const response = JSON.parse(res.text)

                expect(response.ok).toBeTruthy()
            })
            .expect(200, done)
    })

    it('/ready should notify callers properly', done => {
        request
            .get('/ready')
            .expect(function (res) {
                const response = JSON.parse(res.text)

                expect(response.ok).toBeTruthy()
            })
            .expect(200, done)
    })
})
