"use strict";

/* global describe, it */

describe('Basics', function() {

    var riakClient = require('../index').create();

    it('#getServerInfo', function() {
        return riakClient.getServerInfo()
            .then(function(info) {
                info.should.have.property('node');
                info.should.have.property('server_version');
            });
    });

});
