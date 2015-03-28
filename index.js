'use strict'

const express = require('express')
  , app = express()
  , api = require('./api')
  , SubCrawler = require('./crawler')
  , MongoClient = require('mongodb').MongoClient
  , assert = require('assert')

require('http').globalAgent.maxSockets = 20;

app.get('/', function (req, res) {
  res.redirect(api.url);
});


app.get('/authCallback', api.authorize);


app.get('/authorized', function (req, res) {
  res.send('<h1>Authorized!</h1><p>Now you can do searches!</p>');
});


app.get('/authorized/:limit', function (req, res) {
  var url = 'mongodb://localhost:27017/myproject';

  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err)
    console.log('Connected correctly to server')
    var crawler = new SubCrawler(db, req.params.limit)
    res.redirect('/collecting')
  })
});


app.get('/collecting', function (req, res) {
  res.send('<h1>Collecting info yo!</h1><p>Ought to should wait!</p>');
});


app.listen(3030, function () {
  console.log('Listening on port 3030!');
});
