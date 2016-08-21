"use strict";
var config = require("./settings.json");
var routes = require("./routes");
var express = require("express");
var middlewares = require("express-middlewares");
var session = require("express-session");
var mongoose = require("mongoose");
var MongoDBStore = require("connect-mongodb-session")(session);
var http = require("http");
var https = require("https");
var path = require("path");
var fs = require("fs");
var app = express();
var passport = require("passport");
var passportSetup = require("./lib/passportSetup");

// Параметры HTTPS сервера
var sslcert = {
  key:  fs.readFileSync('./cert/key.pem'),
  cert: fs.readFileSync('./cert/cert.pem')
};

var redirApp = (req, res) => {
  //"Strict-Transport-Security":  "max-age=2592000; includeSubdomains; preload"
  res.writeHead(302, {
    "Location": "https://profile.company.ru"
  });
  res.end();
};

var httpServer = require("http").createServer(redirApp);
var httpsServer = require("https").createServer(sslcert, app);

// Параметры Express
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.set("x-powered-by", false);
app.use(middlewares.favicon(__dirname + "/static/images/profile.png"));
app.use(middlewares.bodyParser());
app.use(express.static(path.join(__dirname, "static")));

// var crypto = require("crypto");
// var cookieSecret = crypto.randomBytes(32).toString("base64");

var cookieSecret = "63ziAxBGEKGxne0u4qsaOV4/5sAExVOZyAeOdHMYHIE=";

app.use(middlewares.cookieParser(cookieSecret));

var store = new MongoDBStore({
  uri: config.mongoConnection,
  collection: "sessions"
});

app.use(session({
  "secret": cookieSecret,
  "name":   "profile.sid",
  "resave":  false,
  "saveUninitialized": false,
  "cookie": { maxAge: 24*60*60*1000, secure: true },
  "store":  store
}));

app.use(passport.initialize());
app.use(passport.session());

httpServer.listen(config.httpPort, config.bindIP, function(){
  console.log(`Веб-сервер запущен http://${config.bindIP}:${config.httpPort}`);
});

// Подключаемся к MongoDB
mongoose.connect(config.mongoConnection, function (err) {
  if (err) throw err;
  console.log("Подключились к MongoDB");

  passportSetup(passport);
  routes(app, passport);

  httpsServer.listen(config.httpsPort, config.bindIP, function(){
    console.log(`Веб-сервер запущен https://${config.bindIP}:${config.httpsPort}`);
  });
});
