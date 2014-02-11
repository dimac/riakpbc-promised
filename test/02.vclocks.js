"use strict";

/* jshint camelcase: false */
/* global describe, it, before */

describe('Vclocks', function() {

    var riakClient = require('../index').create();
    var bucket = 'test-riak-' + Date.now();

    before(function() {
        return riakClient.setBucket({
            bucket: bucket,
            props: {
                allow_mult: true,
                last_write_wins: false,
            }
        })
    })

    it('delete without vclock should not create sibling (allow_mult=true)', function() {
        var vclock;
        return riakClient.put({
            bucket: bucket,
            key: 'testKey',
            content: {
                value: '1234'
            },
            return_head: true
        })
        .then(function(reply) {
            vclock = reply.vclock
            return riakClient.del({
                bucket: bucket,
                key: 'testKey'
            })
        })
        .then(function() {
            return riakClient.get({
                bucket: bucket,
                key: 'testKey',
                deletedvclock: true
            })
        })
        .then(function(reply) {
            reply.should.not.have.property('content')
            reply.vclock.should.not.be.eql(vclock)
        })
    })

    it('delete with stale vclock should create sibling (allow_mult=true)', function() {
        var vclock;
        return riakClient.put({
            bucket: bucket,
            key: 'testKey2',
            content: {
                value: '1234'
            },
            return_head: true
        })
        .then(function(reply) {
            vclock = reply.vclock

            return riakClient.put({
                bucket: bucket,
                key: 'testKey2',
                vclock: vclock,
                content: {
                    value: '123456'
                }
            })
        })
        .then(function() {
            return riakClient.del({
                bucket: bucket,
                key: 'testKey2',
                vclock: vclock
            })
        })
        .then(function() {
            return riakClient.get({
                bucket: bucket,
                key: 'testKey2',
                deletedvclock: true
            })
        })
        .then(function(reply) {
            reply.should.have.property('content').that.is.an('array').and.have.length(2)
        })
    })

})
