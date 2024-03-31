var express = require('express');
const userModel = require('./users');
const postModel = require('./posts');
const passport = require('passport');
var router = express.Router();
const multer = require('multer');
var path = require('path');
const fs = require('fs');
const nodemailer = require('./nodemailer');
const crypto = require('crypto')

// passport setup
const localStrategy = require('passport-local')
passport.use(new localStrategy(userModel.authenticate()))


// multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null,uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post('/upload', isLoggedIn, upload.single("image"), function(req,res){
  userModel.findOne({username : req.session.passport.user})
  .then(function(foundUser){
    if(foundUser.image !== "def.png"){
      fs.unlinkSync(`./public/images/uploads/${foundUser.image}`)
    }
    foundUser.image = req.file.filename;
    foundUser.save()
    .then(function(){
      res.redirect("back");
    })
  })

})

router.get('/profile', isLoggedIn ,function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .populate("posts")
  .then((foundUser)=>{
    res.render('profile',{foundUser})
  });
});

router.get('/register' ,function(req, res, next) {
  res.render('register');
});

router.post('/register', function(req, res, next) {
  userModel.findOne({ username : req.body.username })
  .then( (foundUser)=>{
    if(foundUser){
      res.send("user already exist");
    }
    else{
      var newUser = new userModel({
        username:req.body.username,
        image:req.body.image,
        age:req.body.age,
        email:req.body.email
      })
      userModel.register(newUser , req.body.password)
      .then(function ( u ){
        passport.authenticate('local')(req,res, function(){
          res.redirect('/profile')
        })
      })
      .catch(function(e){
        res.send(e)
      })
    }
  })
});

router.post('/login', passport.authenticate('local',{
  successRedirect : '/profile',   
  failureRedirect:'/login'
}),function(req,res,next){ });

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  else{
    res.redirect('/login')
  }
}


router.post('/post',isLoggedIn,upload.single("postimage") ,function(req, res, next){
  userModel.findOne({username: req.session.passport.user})
  .then((foundUser)=>{
    postModel.create({
      userid:foundUser._id,
      post:req.body.post,    
      postimage:req.file.filename
    })
    .then( (createdPost)=>{
      foundUser.posts.push(createdPost._id),
      foundUser.save()
      .then(function(){
        res.redirect("back")
      })
    });
  })
})

router.get('/like/:postid', isLoggedIn ,function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .then((foundUser)=>{
    postModel.findOne({_id : req.params.postid})
    .then((post)=>{
      if(post.likes.indexOf(foundUser._id) === -1){
        post.likes.push(foundUser._id)
      }
      else{
        post.likes.splice(post.likes.indexOf(foundUser._id) , 1)
      }
      post.save()
      .then(()=>{
        res.redirect("back")
      })
    })
  })
});

router.get('/delete/:postid', isLoggedIn ,function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .then((foundUser)=>{
    postModel.findOne({_id : req.params.postid})
    .then((post)=>{
      fs.unlinkSync(`./public/images/uploads/${post.postimage}`)
    })
    postModel.deleteOne({_id : req.params.postid})
    .then(function(){
      foundUser.posts.splice(foundUser.posts.indexOf(req.params.postid),1)
      foundUser.save()
      res.redirect("back")
    })

  })
});

router.get('/feed', isLoggedIn ,function(req, res, next) {
  userModel.findOne({username : req.session.passport.user})
  .then(function(user){
    postModel.find()
    .populate("userid")
    .then(function(allPosts){
      res.render("feed" , { allPosts , user})
    })
  })
});

router.get('/editAccount', isLoggedIn ,function(req, res, next) {
  userModel.findOne({username:req.session.passport.user})
  .then(function(user){
    res.render("edit" , {user})
  })
});

router.get('/check/:username' ,function(req, res, next) {
  userModel.findOne({username: req.params.username})
  .then(function(user){
    if(user){
      res.json(true)
    }
    else{
      res.json(false)
    }
  })
});

router.post('/updateAccount', isLoggedIn ,function(req, res, next) {
  userModel.findOneAndUpdate({username:req.session.passport.user} , { username : req.body.username} , {new:true})
  .then(function(updateduser){
    req.login(updateduser, function(err) {
      if (err) { return next(err); }
      return res.redirect('/profile');
    });
  })

});

router.get('/forgot' ,function(req, res, next) {
  res.render('forgot')
});

router.post('/forgot', async function (req, res, next) {
  var user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    res.send("we've sent a mail, if email exists.");
  }
  else {
    // user ke liye ek key banao
    crypto.randomBytes(80, async function (err, buff) {
      console.log(buff);
      let key = buff.toString("hex");
      user.key = key;
      await user.save();
      await nodemailer(req.body.email, user._id, key)
    })
  }
});

router.get('/forgot/:userid/:key', async function (req, res, next) {
  let user = await userModel.findOne({_id: req.params.userid});
  if(user.key === req.params.key){
    // show a page to a user which asks for new passwords 
    res.render("reset", {user})
  }
  else{
    res.send("tez hmmmmmmmm.");
  }
});

router.post('/resetpass/:userid', async function (req, res, next) {
  let user = await userModel.findOne({_id: req.params.userid});
  user.setPassword(req.body.password, async function(){
    user.key = "";
    await user.save();
    req.logIn(user, function(){
      res.redirect("/profile");
    })
  })
});

module.exports = router;