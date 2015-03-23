'use strict'

const mongo = require('mongodb')
  , _ = require('lodash')
  , Topic = require('Topic')
  , api = require('./api')


module.exports = class Channel extends Node {
  constructor(id) {
    this.complete = false
    this.id = id
    this.nexus = !id
    this.resource = ''
    this.id = ''
    this.title = ''
    this.description = ''
    this.image = ''


    api.getChannelDetails(this.id).then(function(response) {
      response = response.items[0]
      this.id = response.id
    }).then(this.save)
  }
}
