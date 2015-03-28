'use strict'

const mongo = require('mongodb').MongoClient,
  Promise = require('bluebird'),
  EventEmitter = require('events').EventEmitter,
  // async = require('async'),
  _ = require('lodash'),
  api = require('./api'),
  async = require('async'),
  Channel = require('./channel'),
  Edge = require('./edge'),
  assert = require('assert')
  , process = require('process')





/**
 *  [SubCrawler description]
 *  Like the replicators from Stargate SG-1
 *  @param    {Integer}  levels   The number of hops to crawl.
 *  @param    {String}   id       The id to crawl. Blank means that the crawler is spawned from an owned channel.
 *  @return   {Object}            A robot.
 */


var ids = []

var chitlins = 0

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

var deepestLevel = 0

var seen = []

class SubCrawler extends EventEmitter{
  constructor(db, levels, id, parent) {
    
    this.nexus = !id
    this.db = db
    this.level = levels

    if (10 - this.level > deepestLevel) {
      deepestLevel = 10 - this.level
      process.stdout.cursorTo(2,2)
      process.stdout.clearLine()
      process.stdout.write('Level: '+deepestLevel)
    }

    this.id = Promise.resolve(id || api.getMyId()).bind(this)
    this.parent = parent
    this.channel = undefined
    this.children = []
    this.edges = []

    this.method = this.nexus ? this.authStart : this.idStart

    this.id.then(function(id) {
      this.id = id
      return this.method()
    }).done()
  }


  authStart() {
    this.channel = new Channel(this.db, this.id)
    let callback = function(res) {
      api.parseSubscriptions(res).map(function(sub) {
        // console.log(`NEXUS: from ${sub.source} to ${sub.target}, number ${chitlins++}`)
        if (!_.includes(seen,sub.target)) {

          this.children.push(new SubCrawler(this.db,this.level - 1, sub.target, this))

          seen.push(sub.target)
        }
        this.edges.push(new Edge(this.db, sub))
        return sub.target
      }.bind(this))

    }
    if (this.level > 0) {
      return api.subscribers(callback.bind(this))
    }
  }


  idStart() {
  this.channel = new Channel(this.db, this.id)
    let callback = function(res) {
      api.parseSubscriptions(res).map(function(sub) {
        // console.log(`CHILD: from ${sub.source} to ${sub.target}, number ${chitlins++}`)
        if (!_.includes(Channel.seen,sub.target)) {

          this.children.push(new SubCrawler(this.db,this.level - 1, sub.target, this))
        }
        this.edges.push(new Edge(this.db, sub))
        return sub.target
      }.bind(this))
    }
    if (this.level > 0) {
      return api.subscriptions(this.id, callback.bind(this))
    }
  }
}

// SubCrawler.prototype.on('initialized',function(response) {
//   this.auth
// })


module.exports = SubCrawler
