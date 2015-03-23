'use strict'

const mongo = require('mongodb'),
  _ = require('lodash'),
  api = require('./api'),
  Channel = require('./channel'),
  Edge = require('./edge')


/**
 *  [SubCrawler description]
 *  Like the replicators from Stargate SG-1
 *  @param    {Integer}  levels   The number of hops to crawl.
 *  @param    {String}   id       The id to crawl. Blank means that the crawler is spawned from an owned channel.
 *  @return   {Object}            A robot.
 */

function* getStartId(response) {
  yield response[0].target
}




class SubCrawler {
  constructor(levels,id) {
    this.level = levels
    this.id = id
    this.init()
  }


  authStart() {
    var self = this
   
    api.subscribers(function(res) {
      let subs = api.parseSubscriptions(res)
      , id = getStartId(subs)
      , channel = id ? new Channel(id) : null

      subs.forEach(function(sub) {
        let edge = new Edge(sub)
        , channel = new Channel(sub.source)
        , crawler = new SubCrawler(self.level - 1, sub.source)
      })

    })
  }




  idStart() {
    var self = this

    api.subscriptions(function(res) {
      let subs = api.parseSubscriptions(res)
      subs.forEach(function(sub) {
        let edge = new Edge(sub)
        , channel = new Channel(sub.target)
        , crawler = new SubCrawler(this.level - 1, sub.target)
      })
    })
  }

  init() {
    if (this.level) {
      let method = this.id ? this.idStart : this.authStart
      method()
    }
  }
}
