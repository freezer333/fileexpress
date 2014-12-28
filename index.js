var express = require('express');
var Grid = require('gridfs-stream');
var fs = require('fs');


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

    var writestream = gfs.createWriteStream({filename : metadata.filename});
    fs.createReadStream(req.files.file.file).pipe(writestream);
    writestream.on('close', function (file) {
      res.json({ _id:file._id});
    });
  }

  var list = function(req, res, next) {
    res.json({ });
  };

  router.get('/', function(req, res, next) {
    res.json({ });
  });

  router.get('/:owner/', list);
  router.put('/:owner/', add);
  router.post('/:owner/', add);

  return router;
}



exports.make_router = fx;
