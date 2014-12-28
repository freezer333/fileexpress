var express = require('express');
var Grid = require('gridfs-stream');
var fs = require('fs');
var ObjectID = require('mongodb').ObjectID;
var mime = require('mime');

var fx = function (mongo, db) {

  var router = express.Router();
  var gfs = Grid(db, mongo);

  var add = function(req, res, next) {
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
    res.json({ });
  };

  var getmeta = function(req, res, next) {
    var id = req.params.id;
    gfs.files.find({ _id: new ObjectID(id) }).toArray(function (err, files) {
      if ( err ) {
        res.status(400).send('file could not be found because of an invalid query');
      }
      if ( files.length < 1 ) {
        res.status(404).send('file could not be found');
      }
      res.json(files[0]);
    })
  }
  var getcontent = function(req, res, next) {
    var id = req.params.id;
    var q = { _id: new ObjectID(id) };
    gfs.files.find(q).toArray(function (err, files) {
      if ( err ) {
        res.status(400).send('file could not be found because of an invalid query');
      }
      if ( files.length < 1 ) {
        res.status(404).send('file could not be found');
      }
      var content_type = files[0].contentType;
      res.set('Content-Type', content_type);
      var readstream = gfs.createReadStream(q);
      readstream.pipe(res);
    });
  }

  router.get('/', function(req, res, next) {
    res.json({ });
  });

  router.get('/:owner/', list);
  router.put('/:owner/', add);
  router.post('/:owner/', add);
  router.get('/:owner/:id/meta', getmeta);

  router.get('/:owner/:id', getcontent);

  return router;
}



exports.make_router = fx;
