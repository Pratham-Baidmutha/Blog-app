const mongoose = require('mongoose')
var passportLocalMongoose =require('passport-local-mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/passUser')

var userSchema = mongoose.Schema({
  username:String,
  email:String,
  password:String,
  image:{
    type:String,
    default:"def.png"
  },
  age:Number,
  posts:[
    {
      type : mongoose.Schema.Types.ObjectId , ref : "post"
    }
  ],
  key: String
})

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('user' ,userSchema)