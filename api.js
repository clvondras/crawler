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
  vidChunker = utils.accumulator(50)

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


const defaults = {
  part: 'id',
  maxResults: 50
}


function parseSubscriptions(response) {
  return response.items.map(function(sub) { 
    return  { target: sub.snippet.channelId
            , source: sub.snippet.resourceId.channelId
            , date: sub.snippet.publishedAt
            }
  })
}

function cycleRequest(apiCall, params, handler) {
  return apiCall(_.extend(defaults, params)).tap(function(response) {
    if (response.nextPageToken) {
      params.pageToken = response.nextPageToken
      cycleRequest(apiCall, params, handler)
    }
  }).then(handler,cycleRequestErrorHandler)
}


exports.authorize = function (req, res) {
  oauth2Client.getToken(req.query.code, function (err, tokens) {
    if (err) throw err;
    oauth2Client.setCredentials(tokens);
    res.redirect('/authorized');
  });
}

exports.getMyDetails = function() {
  let params = {
    part: 'id,snippet,contentDetails,topicDetails,statistics',
    mine: true
  }
  return youtube.channels.list(params)
}


exports.getChannelDetails = function(id) {
  return youtube.channels.list({
    part: 'id,snippet,contentDetails,topicDetails,statistics',
    id: id,
    maxResults: 1,
  })
}


exports.subscribers = function(callback) {
  let params =  { part: 'snippet', mySubscribers: true }
  return cycleRequest(youtube.subscribers.list,params, parseSubscriptions)
}


exports.subscriptions = function(id, callback) {
  let params =  { part: 'snippet', id: id }
  return cycleRequest(youtube.subscribers.list,params, parseSubscriptions)
}


class ChannelDetails extends EventEmitter {
  constructor(id) {

  }
}
