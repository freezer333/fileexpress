var express = require('express');
var Grid = require('gridfs-stream');
var fs = require('fs');
var ObjectID = require('mongodb').ObjectID;
var mime = require('mime');

var fx = function (mongo, db, user_authorization) {

  var router = express.Router();
  var db = db;
  var gfs = Grid(db, mongo);

  router.auth = user_authorization

  var check_auth = function(req) {
    if ( !router.auth ) return true;
    return router.auth(req, req.params.owner, req.method, req.params.id);
  }

  var add = function(req, res, next) {
    if ( !check_auth(req)) {
      res.status(401).end();
      return;
    }
    if ( !req.body.metadata ) {
      res.status(406).send('metadata must be sent along with the new file');
      return;
    }

    var metadata = JSON.parse(req.body.metadata)
    if (!metadata.filename) {
      res.status(406).send('filename is required property of metadata field');
      return;
    }
    var file_data = {
      filename : metadata.filename,
      metadata : metadata,
      content_type : mime.lookup(metadata.filename),
      mode : "w"
    }
    var meta = metadata;
    file_data.metadata.owner = req.params.owner;

    var writestream = gfs.createWriteStream(file_data);
    fs.createReadStream(req.files.file.file).pipe(writestream);
    writestream.on('close', function (file) {
      res.json(file);
    });
  }




  var list = function(req, res, next) {
    if ( !check_auth(req)) {
      res.status(401).end();
      return;
    }
    var collection = db.collection('fs.files');
    collection.find({"metadata.owner":req.params.owner}).toArray(function(err, docs) {
      res.json(docs);
    });
  };




  var delete_file = function (req, res, next) {
    if ( !check_auth(req)) {
      res.status(401).end();
      return;
    }
    gfs.files.find(makeq(req)).toArray(function (err, files) {
      if ( err ) {
        res.status(400).send('file could not be found because of an invalid query');
      }
      else if ( files.length < 1 ) {
        res.status(404).send('file could not be found');
      }
      else if ( files[0].metadata.owner != req.params.owner) {
        res.status(404).send('file could not be found');
      }
      else {
        gfs.remove(makeq(req), function (err) {
          if (err) {
            res.status(400).send('file could not be found because of an invalid query');
          }
          else {
            res.status(200).end();
          }
        });
      }
    })
  }



  function makeq(req) {
    var id = req.params.id;
    var owner = req.params.owner;
    var q = {_id : new ObjectID(id)};
    return q;
  }




  var getmeta = function(req, res, next) {
    if ( !check_auth(req)) {
      res.status(401).end();
      return;
    }
    gfs.files.find(makeq(req)).toArray(function (err, files) {
      if ( err ) {
        res.status(400).send('file could not be found because of an invalid query');
      }
      else if ( files.length < 1 ) {
        res.status(404).send('file could not be found');
      }
      else if ( files[0].metadata.owner != req.params.owner) {
        res.status(404).send('file could not be found');
      }
      else {
        res.json(files[0]);
      }
    })
  }



  var getcontent = function(req, res, next) {
    if ( !check_auth(req)) {
      res.status(401).end();
      return;
    }
    var q= makeq(req);
    gfs.files.find(q).toArray(function (err, files) {
      if ( err ) {
        res.status(400).send('file could not be found because of an invalid query');
        return;
      }
      if ( files.length < 1 ) {
        res.status(404).send('file could not be found');
        return;
      }
      if ( files[0].metadata.owner != req.params.owner) {
        res.status(404).send('file could not be found');
        return;
      }
      var content_type = files[0].contentType;
      res.set('Content-Type', content_type);
      res.set('Content-Disposition', 'inline; filename="'+files[0].metadata.filename+'"');
      var readstream = gfs.createReadStream(q);
      readstream.pipe(res);
    });
  }



  router.get('/', function(req, res, next) {
    res.json({ });
  });



  router.get('/:owner/', list);
  router.get('/:owner/:id/meta', getmeta);
  router.get('/:owner/:id', getcontent);
  router.put('/:owner/', add);
  router.post('/:owner/', add);
  router.delete('/:owner/:id', delete_file);

  return router;
}



exports.make_router = fx;
