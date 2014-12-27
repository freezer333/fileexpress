var express = require('express');
var fx = express.Router();

fx.get('/', function(req, res, next) {
  res.json({ });
});

exports.router = fx;
