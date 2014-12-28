var assert = require('assert');
var should = require('should');
var express = require('express');
var fx = require('..');
var request;



describe('fx() fresh', function(){
  var app;
  var db;

  before(function(done){
    app = createServer();
    request = require('supertest')(app);

    var mongo = require('mongodb');
    db = new mongo.Db('fx_test', new mongo.Server("127.0.0.1", 27017), {safe:false});

    db.open(function (err) {
      assert.equal(null, err);
      var router = fx.make_router(mongo, db);
      app.use('/', router);
      done();
    })
  });

  after(function(){
    db.dropDatabase();
  })

  it('should return {} at root request', function(done){
    request.get('/')
           .expect(200, '{}', done)
  })

  it('should return {} when no files exist for owner', function(done){
    request.get('/foobar/')
           .expect(200, '{}', done)
  })

  it('should allow a file to be put', function(done) {
    request.put('/foo/')
           .field('metadata', '{"filename":"test.txt"}')
           .attach('file', 'test/files/test.txt')
           .expect(has_id)
           .end(done)
  });

  it('should allow a file to be posted', function(done) {
    request.post('/foo/')
           .field('metadata', '{"filename":"test.txt"}')
           .attach('file', 'test/files/test.txt')
           .expect(has_id)
           .end(done)
  });
});

function has_id(res) {
  if ( res.status != 200 ) {
    return "Response was expected to be 200";
  }
  if (!('_id' in res.body)) return "Response was missing _id key";
}

function createServer() {
  var app = express();
  var bb = require('express-busboy');


  bb.extend(app, {
    upload: true,
    path: 'test/files/uploads'
  });

  return app;
}
