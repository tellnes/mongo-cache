
var AsyncCache = require('async-cache')
  , debug = require('debug')('mongo-cache')
  , inherits = require('util').inherits

module.exports = MongoCache

function MongoCache(options) {
  options = options || {}
  options.load = this._load

  AsyncCache.call(this, options)

  this.ObjectID = (options.mongodb || require('mongodb')).ObjectID

  this.collection = options.collecton

  this.fields = options.fields

  this._ids = []
  this._cbs = {}
}
inherits(MongoCache, AsyncCache)

MongoCache.prototype._load = function (id, cb) {
  debug({ id: id }, 'load from mongodb')

  this._ids.push(id)
  this._cbs[id] = cb

  if (this._ids.length > 1) return

  var self = this
  process.nextTick(function () {
    var cbs = self._cbs
      , sel = { '_id': { $in: self._ids } }

    self._ids.length
    self._cbs = {}

    self.collection.find(sel, { fields: self.fields }).each(function (err, doc) {
      if (err || !doc) {
        Object.keys(cbs).forEach(function (id) {
          cbs[id](err)
        })
        cbs = null
        return
      }

      var id = doc._id.toString()
        , cb = cbs[id]

      delete cbs[id]

      cb(null, doc)
    })
  })
}

;
[ 'get'
, 'set'
, 'has'
, 'del'
, 'peek'
].forEach(function (name) {
  MongoCache.prototype[name] = function (id) {
    if (!(id instanceof this.ObjectID)) {
      arguments[0] = this.ObjectID.createFromHexString(id)
    }

    return AsyncCache.prototype[name].apply(this, arguments)
  }
})
