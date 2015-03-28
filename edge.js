'use strict'

module.exports = class Edge {

  /**
   * [constructor description]
   * @param  {[type]} source [description]
   * @param  {[type]} target [description]
   * @param  {[type]} props  [description]
   * @return {[type]}        [description]
   */
  
  constructor(db, obj) {
      this.db = db
       this.source = obj.source
       this.target = obj.target
       this.date = obj.date
       this.type = obj.type

       if (!this.source) {
        throw obj
       }

       this.save()

  }
  save() {
    // this.db.collection('edges').save([{source: this.source, target: this.target}],function(err, res){})
  }
}
