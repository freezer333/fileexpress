var assert = require('assert');
var express = require('express');
var request;



describe('fx()', function(){
  var server;
  before(function(){
    server = createServer();
    request = require('supertest')(server);
  })

  it('should return {} at root request', function(done){
    request.get('/')
           .expect(200, '{}', done)
  })
});

function createServer() {
  var app = express();
  var fx = require('..');
  app.use('/', fx.router);
  return app;
}
