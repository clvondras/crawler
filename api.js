'use strict'

const fs = require('fs'),
  EventEmitter = require('events').EventEmitter,
  clientKeys = JSON.parse(fs.readFileSync('./secrets.json', 'utf-8')),
  CLIENT_ID = clientKeys.web.client_id,
  CLIENT_SECRET = clientKeys.web.client_secret,
  REDIRECT_URI = clientKeys.web.redirect_uris[0],
  google = require('googleapis'),
  _ = require('lodash'),
  Channel = require('./channel'),
  Edge = require('./edge'),
  utils = require('./utils'),
  vidChunker = utils.accumulator(50),
  Queue = utils.Queue


var queue = new Queue(20)

var numRequests = (function (){
  var totalRequests = 0
  var activeRequests = 0
  return function(dir,where) {
    totalRequests += (dir+1)/2
    activeRequests = activeRequests + dir
    // console.log(`In ${where}, number of open requests: ${activeRequests} of ${totalRequests} total made`)
  }
})()

const scopes = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];
var authEvent = new EventEmitter();
var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

var url = exports.url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
});


function throwWithMessage(apiCall, message) {
  return function (err) {
    throw new Error('Error ' + err.code + ' in call made to ' + apiCall.name + ':\n\n' + message + '\n\n');
  };
}


var youtube = exports.youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client,
  gzip: true
});

var freebase = exports.freebase = google.freebase({
  version: 'v1',
  auth: oauth2Client,
  gzip: true
});


function cycleRequestErrorHandler(err, apiCall) {
  numRequests(-1,'error handler')
  console.log(err)
  var handler = console.log;
  switch (err.code) {
  case 403:
    if (apiCall == youtube.subscriptions.list) {
      console.log('Unable to get subscribers: Access Forbidden');
    } else {
      handler = throwWithMessage(apiCall, 'Access Forbidden.\n\nAre You Authenticated?');
    }
    break;
  case 500:
    console.error('Internal server error\n\nBummer\n\n');
    break;
  default:
    handler = throwWithMessage(apiCall, 'A generic error occurred.');
  }
  return handler;
}





exports.parseSubscriptions = function parseSubscriptions(response) {
  return response.map(function(sub) { 
    return  { target: sub.snippet.channelId
            , source: sub.snippet.resourceId.channelId
            , date: sub.snippet.publishedAt
            }
  })
}
function backOffSetup(base) {
  return function() {

    return base =+ Math.floor(5000*Math.random())
  }
}

var backOff = backOffSetup(5000)



var cycleRequestSetup = function () {
  var seenTokens = []
  // console.log('a cycler was set up')
  return function cycleRequest(apiCall, params, handler) {
    params = _.extend({part: 'id', maxResults: 50}, params)
    queue.add(apiCall, params, function(result){
     return result.tap(function(response) {
        numRequests(1,'request cycler')
        if (response.nextPageToken && !_.any(seenTokens, response.nextPageToken)) {
          params.pageToken = response.nextPageToken
          seenTokens.push(params.pageToken)
        try {
          cycleRequest(apiCall, params, handler)
        } catch (e) {
          numRequests(-1,'req timeout')
          console.error(e)
          setTimeout(cycleRequest,backOff(), apiCall, params, handler)   
        }
      }
    }).get('items').then(handler).done(function(){numRequests(-1,'a request completion event')})
  })
}
}

var cycleRequest = exports.cycleRequest = cycleRequestSetup()

exports.authorize = function (req, res) {
  oauth2Client.getToken(req.query.code, function (err, tokens) {
    if (err) throw err;
    oauth2Client.setCredentials(tokens);
    res.redirect('/authorized');
  });
}

exports.getMyId = function() {
  let params = {
    part: 'id',
    mine: true
  }
  numRequests(1,'initial id req')
  return youtube.channels.list(params).tap(function(){numRequests(-1,'id received')}).get('items').get(0).get('id').error(cycleRequestErrorHandler)
}


exports.getChannelDetails = function(id,callback) {
  let params = {
    part: 'id,brandingSettings,topicDetails,statistics',
    id: id
  }
  queue.add(youtube.channels.list, params, function(response){
    return response.tap(function(res){numRequests(-1,'channel details received')})
    .get('items').get(0).then(callback).error(cycleRequestErrorHandler)})
  numRequests(1,'getting channel details')
}


exports.subscribers = function(callback) {
  let params =  { part: 'snippet', mySubscribers: true }
  return cycleRequest(youtube.subscriptions.list, params, callback)
}


exports.subscriptions = function(id, callback) {
  let params =  { part: 'snippet', channelId: id }
  return cycleRequest(youtube.subscriptions.list, params, callback)
}
