'use strict'

const EventEmitter = require('events').EventEmitter
  , Promise = require('bluebird')
  , async = require('async')
  , _ = require('lodash')
  , process = require('process')
  // , assert = require('assert')

var log = function(text) {
  process.stdout.clearLine();  // clear current text
  process.stdout.cursorTo(0)
  process.stdout.write(text)
}



const lowercase = 'abcefghijklmnopqrstuvwxyz'
  , uppercase = lowercase.toUpperCase()
  , numbers = '0123456789'
  , aSpace = ' '
  , charlist = (lowercase+uppercase+numbers+aSpace).split('')

function genIdentifier() {
  let key = []
  _.times(_.random(5,20),function(){
    key.push(_.sample(charlist))
  })
  return _.trim(key.join(''))
}


var debounce = exports.debounce = function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}


var isPromise = exports.isPromise = function isPromise(obj) {
  return obj instanceof Promise
}


var isPromiseOrFunction = function isPromiseOrFunction(obj) {
  return (_.isFunction(obj) || isPromise(obj))
}


exports.accumulator = function (limit) {
  var collection = []

  return function (entity) {
    collection.push(entity)
    if (collection.length < limit) {
      return false
    } else {
      let collected = collection
      collection = []
      return collected
    }
  }
}


var Queue = exports.Queue = class Queue extends EventEmitter {
  constructor(limit) {

    this.setMaxListeners(1)
    this.limit = limit
    this.load = 0
    this.completed = 0
    this.queue = []

    process.stdout.cursorTo(0,0)
    process.stdout.clearScreenDown()
    process.stdout.cursorTo(24,3)
    process.stdout.write(`\Queue Status`)
    process.stdout.cursorTo(10,4)
    process.stdout.write(`Growing:`)
    process.stdout.cursorTo(31,4)
    process.stdout.write(`Finishing:`)
    process.stdout.cursorTo(10,6)
    process.stdout.write(`Available:`)
    process.stdout.cursorTo(10,7)
    process.stdout.write(`Capacity:`)
    process.stdout.cursorTo(10,8)
    process.stdout.write(`Queued:`)
    process.stdout.cursorTo(10,9)
    process.stdout.write(`Completed:`)
    process.stdout.cursorTo(10,10)

    this.timeIt(250)
  }

  timeIt(rate) {
    var queue = 0
      , completed = 0
      , completedList = []
      , queuedList = []
      , self = this

      function mean(arr) {
        return Math.round(arr.reduce(function(a,b){return(a+b)})/arr.length)
      }


    setInterval(function() {
      let diffQ = self.queue.length - queue
        , diffC = self.completed - completed

        queue += diffQ
        completed += diffC

        completedList.unshift(diffC)
        completedList = completedList.slice(0,20)
        diffC = mean(completedList)
        
        queuedList.unshift(diffQ)
        queuedList = queuedList.slice(0,20)
        diffQ = mean(queuedList)


        diffQ = 1000*diffQ/rate + '/sec'
        diffC = 1000*diffC/rate + '/sec'
        process.stdout.cursorTo(20,4)
        process.stdout.write('         ')
        process.stdout.cursorTo(29-diffQ.length,4)
        process.stdout.write(diffQ)
        process.stdout.cursorTo(43,4)
        process.stdout.write('         ')
        process.stdout.cursorTo(50-diffC.length,4)
        process.stdout.write(diffC)
        process.stdout.cursorTo(10,10)

    },rate)

  }

  up() {
    this.load++
  }


  down() {
    this.load--
    this.completed++
  }

  status() {
    const log = process.stdout
    let available = this.limit-this.load+''
      , capacity = Math.round(100 * this.load/this.limit) + '%'
      , queued = this.queue.length+''
      , completed = this.completed+''
      , x = 30
      , y = 6
    for (let value of [available, capacity, queued, completed])  {
      log.cursorTo(x,y)
      log.clearLine(1)
      log.moveCursor(20-value.length)
      log.write(value)
      y++
    }
    log.cursorTo(0,y)
    log.clearScreenDown()
    log.cursorTo(10,y)
  }


  add(f,args,callback, thisArg) {
    try {
      var callObj = {
          func: f
        , identifier: genIdentifier()
        , args: args
      }

      this.once(callObj.identifier,
                callback)
      this.queue.push(callObj)
      this.chunk()
    } catch(e) {
      throw e
      this.add(callObj,callback, thisArg)
    }
  }

  chunk() {
    if (this.queue.length > 0 ) {
      let available = this.limit - this.load
      if (available) {
        this.status()
        let upNext = this.queue.splice(0,available)
        this.process(upNext)
        this.load += upNext.length
      } else {
        process.stdout.write(`.`)
      }
      debounce(this.chunk, 500)
    } else {
      log('Queue is empty')
    }
  }


  report(results) {
    const self = this
    for (let result of results) {
      self.emit(result.identifier, result.data.tap(function(){self.down()}))
    }
  }


  process(chunk) {
    let results = chunk.map(function(callObj) {
      let data = callObj.func(callObj.args)
      return {identifier: callObj.identifier, data: data}
    })

    this.report(results)
  }
}


