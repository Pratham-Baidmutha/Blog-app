const mongoose = require('mongoose')

var postSchema = mongoose.Schema({
  userid:{
    type : mongoose.Schema.Types.ObjectId , ref : "user"
  },
  time:{
    type:Date,
    default: Date.now()
  },
  post:{
    type:String
  },
  postimage:{
    type:String
  },
  likes:[
    {
      type : mongoose.Schema.Types.ObjectId , ref : "user"
    }
  ]
})

module.exports = mongoose.model('post' ,postSchema)