"use strict";
var checkAuth = require("./lib/checkAuth");
var config = require("./settings.json");
var ActiveDirectory = require("activedirectory");
var ad = new ActiveDirectory(config.ldapConfig);
var fs = require("fs");

//////////////////////////////////////////////////////////////////////////////////////////
module.exports = function(app, passport){

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/authenticate-negotiate", passport.authenticate('login', {
    successRedirect: "/",
    noUserRedirect:  "/nouser"
  }));

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/nouser", function(req, res) {
    res.status(500).end("There was an error in find the user name");
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post("/session", function(req, res) {
    let username = req.body.username.toString();
    let password = req.body.password.toString();

    ad.authenticate(`${username}@${config.domain}`, password, function(err, auth) {
      let loginTime = new Date();
      let authResult = {
        "time":        loginTime.toLocaleString(),
        "error":       err,
        "username":    username,
        "authed":      auth,
        "ip":          req.ip
      };

      fs.appendFile(config.authLog, JSON.stringify(authResult) + "\n");

      if (auth) { // авторизован
        req.session.user = username;
        res.redirect("/");
      } else {
        // ошибка авторизации
        req.session.user = null;
        res.render("authError", { username: username, code: 402})
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/logout", checkAuth, function(req, res){
    if (req.session.user) {
      req.session.destroy();
      res.redirect("/");
    }
  });
}
