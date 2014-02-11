"use strict";

/* global describe, it, before */

describe('Basics', function() {

    var riakClient = require('../index')();

    it('#getServerInfo', function() {
        return riakClient.getServerInfo()
            .then(function(info) {
                info.should.have.property('node')
                info.should.have.property('server_version')
            })
    })

})
