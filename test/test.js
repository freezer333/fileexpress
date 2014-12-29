var assert = require('assert');
var should = require('should');
var express = require('express');
var fs = require('fs');
var fx = require('..');

var request;



describe('fx()', function(){
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

  it('should return [] when no files exist for owner', function(done){
    request.get('/foobar/')
           .expect(200, '[]', done)
  });

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



  describe('existing file tests', function(){
    var _id;
    var contentType = 'text/plain';
    var owner = 'bar';
    var posted_content = fs.readFileSync('test/files/test.txt','utf8')

    before( function(done) {
      request.post('/bar/')
             .field('metadata', '{"filename":"test.txt", "other":"abc"}')
             .attach('file', 'test/files/test.txt')
             .end(function(err, res) {
               _id = res.body._id;
               done();
             });
    });

    it('should allow meta data to be retrieved', function(done) {
      request.get('/bar/'+_id+"/meta/")
             .expect(function(res) {
                  if ( res.status != 200 ) {
                    return "Response was expected to be 200";
                  }
                  if (!('_id' in res.body)) return "Response was missing _id key";
                  if (!('filename' in res.body)) return "Response was missing filename key";
                  if (!('metadata' in res.body)) return "Response was missing metadata key";
                  if (!('other') in res.body.metadata) return "Metadata was missing other key";
                  if (!('owner') in res.body.metadata) return "Metadata was missing other key";
              })
              .end(done)
    });

    it('should return 404 for meta request if owner does not match', function(done) {
      request.get('/foobar/'+_id+"/meta/")
             .expect(404, done);
    });

    it('should return expected content type', function(done) {
      request.get('/bar/'+_id+"/meta/")
             .expect(function(res) {
                  if ( res.status != 200 ) {
                    return "Response was expected to be 200";
                  }
                  if (!('contentType' in res.body)) return "Response was missing contentType key";
                  if (res.body.contentType != contentType ) return "Response was not as exected - was " + res.body.contentType;
              })
              .end(done)
    });

    it('should return expected owner', function(done) {
      request.get('/bar/'+_id+"/meta/")
             .expect(function(res) {
                  if ( res.status != 200 ) {
                    return "Response was expected to be 200";
                  }
                  if (!('owner' in res.body.metadata)) return "Response was missing owner key";
                  if (res.body.metadata.owner != owner ) return "Response was not as exected - was " + res.body.metadata.owner;
              })
              .end(done)
    });

    it('should return expected other from metadata', function(done) {
      request.get('/bar/'+_id+"/meta/")
             .expect(function(res) {
                  if ( res.status != 200 ) {
                    return "Response was expected to be 200";
                  }
                  if (!('other' in res.body.metadata)) return "Response was missing other key";
                  if (res.body.metadata.other != 'abc' ) return "Response was not as exected - was " + res.body.metadata.other;
              })
              .end(done)
    });

    it('should return expected filename in root and metadata', function(done) {
      request.get('/bar/'+_id+"/meta/")
             .expect(function(res) {
                  if ( res.status != 200 ) {
                    return "Response was expected to be 200";
                  }
                  if (!('filename' in res.body.metadata)) return "Response was missing filename key (metadata)";
                  if (res.body.metadata.filename != "test.txt" ) return "Response (metadata) was not as exected - was " + res.body.metatdata.filename;

                  if (!('filename' in res.body)) return "Response was missing filename key";
                  if (res.body.filename != "test.txt" ) return "Response was not as exected - was " + res.body.filename;
              })
              .end(done)
    });

    it('should return expected file content type in header', function(done) {
      request.get('/bar/'+_id)
             .expect(function(res) {
               if ( res.status != 200 ) {
                 return "Response was expected to be 200";
               }
               if (res.get('Content-Type').indexOf('text/plain') < 0 ) {
                 return "Unexpected content type = " + res.get('Content-Type');
               }
             })
             .expect(200, done);
    });

    it('should return expected file contents', function(done) {
      request.get('/bar/'+_id)
             .expect(function(res) {
               if ( res.status != 200 ) {
                 return "Response was expected to be 200";
               }
               if ( res.text != posted_content) {
                 return "Response content was not as expected ["+res.text+"]"
               }
             })
             .expect(200, done);
    });
  });




  describe('file deletion', function(){
    var _id;
    before( function(done) {
      request.post('/ghost/')
             .field('metadata', '{"filename":"test.txt", "other":"abc"}')
             .attach('file', 'test/files/test.txt')
             .end(function(err, res) {
               _id = res.body._id;
               done();
             });
    });

    it('should return OK for existing file', function(done) {
      request.delete('/ghost/'+_id)
             .expect(200, done);
    });

    it('should return 404 for missing file', function(done) {
      request.delete('/foobar/'+_id)
             .expect(404, done);
    });

    describe('after file deletion', function(){
      before( function(done) {
        request.delete('/ghost/'+_id).end(done)
      });
      it('should return 404 for meta request after deletion', function(done) {
        request.get('/ghost/'+_id+"/meta/")
               .expect(404, done);
      });
      it('should return 404 for content request after deletion', function(done) {
        request.get('/ghost/'+_id)
               .expect(404, done);
      });
    });
  });




  describe('owner listings', function(){
    before( function(done) {
      request.post('/rockefeller/')
             .field('metadata', '{"filename":"test1.txt"}')
             .attach('file', 'test/files/test.txt')
             .end(function(res){
               request.post('/rockefeller/')
                      .field('metadata', '{"filename":"test2.txt"}')
                      .attach('file', 'test/files/test.txt')
                      .end(done);
             });
    });


    it('should return expected number of metadata files for owner', function(done) {
      request.get('/rockefeller/')
             .expect(200)
             .expect(function(res) {
               var listings = JSON.parse(res.text);
               if ( !listings || !(listings instanceof Array) || listings.length < 1 ) {
                 return "Listings do not contain expected number of files for this owner"
               }
               if ( listings.length != 2 ) {
                 return "Listings do not contain expected number of files for this owner"
               }
               for ( i in listings ) {
                 var file = listings[i];
                 if ( file.metadata.owner != 'rockefeller') {
                   return "Owner - " + file.metadata.owner + " does not match expected owner";
                 }
               }
             }).
             end(done);
    });
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
