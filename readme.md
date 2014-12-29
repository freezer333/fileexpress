# fileexpress
fileexpress is an express (4+) router that acts as a drop-in REST API
to allow file storage and listings backed by MongoDB's GridFS functionality.
It supports organizing files by an owner, and has customize-able authorization.


Files can be uploaded via put/post (you need to have a suitable body parser - ie.
[busboy](https://www.npmjs.org/package/busboy#readme), [body-parser](https://github.com/expressjs/body-parser),etc).  Files are retrieved by owner
or by file id, along with file meta data, and can be removed with delete calls.

## Installation

```sh
npm install fileexpress
```

## Usage

The module exports a factory method that is used to create an express 4 router.  Simply
plug this into your app and you are ready to go.  The factory method requires you to pass in
an instance of the mongo driver, along with the opened database.

```js
var fx = require('fileexpress');

... create mongo connection ...

var app = express();
... setup express ...

router = fx.make_router(mongo, db);
app.use('/', router);

app.listen(3000);

```

## Examples

```js
var app = express();
var bb = require('express-busboy');


bb.extend(app, {
  upload: true,
  path: 'test/files/uploads'
});

```
