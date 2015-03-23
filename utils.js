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
