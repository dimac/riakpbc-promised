"use strict";

/* jshint camelcase: false */

var riakpbc     = require('riakpbc');
var Promise     = require('bluebird');
var genericPool = require('generic-pool');

var RiakClient = function(config) {

    config = config || {};

    this.pool = genericPool.Pool({
        create: function(callback) {
            var client = riakpbc.createClient(config);
            client.connect(function(err) {
                callback(err, client);
            });
        },
        destroy: function(riak) {
            riak.disconnect();
        },
        max: config.maxPool || 10,
        min: config.minPool || 5,
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis: config.idleTimeoutMillis || 5 * 60 * 1000,
        reapIntervalMillis: config.reapIntervalMillis || 10 * 1000,
        refreshIdle: config.reapIntervalMillis || false,
        // if true, logs via console.log - can also be a function
        log: false
    });

};

exports.create = function(_config) {
    return new RiakClient(_config);
};

[
    'getBuckets',
    'getBucket',
    'setBucket',
    'resetBucket',
    'getKeys',
    'put',
    'get',
    'del',
    'mapred',
    'getCounter',
    'updateCounter',
    'getIndex',
    'search',
    'getClientId',
    'setClientId',
    'getServerInfo',
    'ping',
    'setBucketType',
    'getBucketType',
    'updateDtype',
    'fetchDtype',
    'ykGetIndex',
    'ykPutIndex',
    'ykDeleteIndex',
    'ykPutSchema',
    'ykGetSchema'
].forEach(function (m) {

        RiakClient.prototype[m] = function () {
            var self = this;
            var args = Array.prototype.slice.call(arguments);

            return new Promise(function(resolve, reject) {
                self.pool.acquire(function(err, db) {
                    if(err){
                        return reject(err);
                    }

                    if(m === 'getIndex' || m === 'mapred'){
                        resolve(db[m].apply(db, args));
                    } else {
                        db[m].apply(db, args.concat([function(err, data) {
                            if(err){
                                return reject(err);
                            }
                            if(m === 'search' && data.num_found){
                                data.docs = data.docs.map(function(doc) {
                                    var d = {};
                                    doc.fields.forEach(function(field) {
                                        d[field.key] = field.value;
                                    });
                                    return d;
                                });
                            }
                            resolve(data);
                        }]));
                    }
                    self.pool.release(db);
                });
            });
        };

    });

RiakClient.prototype.getIndexAll = function(params) {
    var self = this;
    return self.getIndex(params)
        .then(function(stream) {
            return new Promise(function(resolve, reject) {
                var result = null;
                stream.on('error', function(err) {
                    reject(err);
                });
                stream.on('data', function(data) {
                    if(data){
                        if(!result){
                            result = data;
                        } else {
                            if(data.keys){
                                result.keys = result.keys.concat(data.keys);
                            } else if(data.results){
                                result.results = result.results.concat(data.results);
                            }
                            if(data.continuation){
                                result.continuation = data.continuation;
                            }
                        }
                    }
                });
                stream.on('end', function() {
                    resolve(result);
                });
            });
        });
};

RiakClient.prototype.mapredAll = function(params) {
    var self = this;
    return self.mapred(params)
        .then(function(stream) {
            return new Promise(function(resolve, reject) {
                var result = null;
                stream.on('error', function(err) {
                    reject(err);
                });
                stream.on('data', function(data) {
                    if(data){
                        if(!result){
                            result = [data];
                        } else {
                            result.push(data);
                        }
                    }
                });
                stream.on('end', function() {
                    resolve(result);
                });
            });
        });
};

