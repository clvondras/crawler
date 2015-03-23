const express = require('express'),
  app = express(),
  api = require('./api'),
  SubCrawler = require('./crawler')


app.get('/', function (req, res) {
  res.redirect(api.url);
});


app.get('/authCallback', api.authorize);


app.get('/authorized', function (req, res) {
  res.send('<h1>Authorized!</h1><p>Now you can do searches!</p>');
});


app.get('/authorized/:limit', function (req, res) {
  var crawler = new SubCrawler(req.params.query)
  res.redirect('/collecting')
  // cycleRequest(youtube.search.list, parameters, getChannelInfo);
});


app.get('/collecting', function (req, res) {
  res.send('<h1>Collecting info yo!</h1><p>Ought to should wait!</p>');
});


app.listen(3030, function () {
  console.log('Listening on port 3030!');
});
