'use strict'

const mongo = require('mongodb')
  , Promise = require('bluebird')
  , _ = require('lodash')
  // , Topic = require('Topic')
  , api = require('./api')
  , utils = require('./utils')
  , Edge = require('./edge')



module.exports = class Channel {
  constructor(db, id) {
    this.db = db
    this.id = id
    this.resource = ''
    this.title = ''
    this.description = ''
    this.image = ''

    Promise.resolve(api.getChannelDetails(id,(function(response){
      if(response) {
        if (response.brandingSettings) {
      this.title = response.brandingSettings.channel.title
      this.description = response.brandingSettings.channel.description
      // this.image = utils.highestRes(response.brandingSettings.image)

      if (response.brandingSettings.channel.keywords) {
        for (let keyword of response.brandingSettings.channel.keywords.split(' ')) {
          let params = {source: this.id, target: keyword, type: 'about'}
          // console.log(params)
          let edge = new Edge(this.db, params)
        }
      }

      if (response.brandingSettings.channel.featuredChannelsUrls) {
        for (let url of response.brandingSettings.channel.featuredChannelsUrls) {
          let params = {source: this.id, target: url, type: 'featured'}
          // console.log(params)
          let edge = new Edge(this.db, params)
        }
      }
    }

      if (response.topicDetails) {
        // console.log(response.topicDetails)
        for (let topic of response.topicDetails.topicIds) {
         let params = {source: this.id, target: topic, type: 'about'}
          // console.log(params)
          let edge = new Edge(this.db, params)
        }
      }
    } else {
      console.log('we\'re skipping')
    }
    return true
    }).bind(this))).bind(this)
  }

  save() {
    // console.log(this)
  }
}

exports.seen = []
