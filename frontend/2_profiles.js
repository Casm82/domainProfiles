"use strict";

var checkAuth = require("./lib/checkAuth");
var models = require("./lib/models");
var config = require("./settings.json");
var ActiveDirectory = require("activedirectory");
var ad = new ActiveDirectory(config.ldapConfig);
var mongoose = require("mongoose");
var async = require("async");
var exec = require("child_process").exec;
var fs = require("fs");
var https = require("https");
var querystring = require("querystring");

//////////////////////////////////////////////////////////////////////////////////////////
module.exports = function(app, passport){

  app.get("/", checkAuth, function(req, res){
    var sAMAccountName;
    if (req.user && req.user._id) {
      sAMAccountName = req.user._id;
    } else {
      if (req.session && req.session.user) sAMAccountName = req.session.user;
    }

    if (sAMAccountName) {
      async.waterfall([
        // Ищем профиль в MongoDB
        function(callback) {
          models.profileModel.findById(sAMAccountName, (err, dbProfileObj) => {
            callback(err, dbProfileObj);
          });
        },
        // Ищем профиль в Active Directory
        function(dbProfileObj, callback) {
          if (dbProfileObj && dbProfileObj.displayName) {
            callback(null, dbProfileObj);
          } else {
            ad.findUser(sAMAccountName, function(err, adProfileObj) {
              if (err) {
                console.log("ERROR: " +JSON.stringify(err));
                return;
              }
              if (adProfileObj) {
                callback(null, adProfileObj);
              } else {
                callback(new Error(`Пользователь: ${sAMAccountName} не найден.`));
              }
            })
          } // if user in MongoDB
        }],
      function (err, profileObj) {
        if (profileObj) {

          // Предупреждение для пользователей IE
          let warn = false;
          if ( req.headers && req.headers["user-agent"] ) {
            let userAgent = req.headers["user-agent"];
            if (userAgent.match(/Trident/)) warn = true;
          };

          res.render("viewProfile", {
            "title":    profileObj.displayName,
            "user":     profileObj,
            "authType": req.session.authType,
            "warn":     warn
          });
        } else {
          console.log(`Пользователь: ${sAMAccountName} не найден.`);
        }
      });
    } else {
      res.status(500).end("There was an error in determining the user name");
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/edit", checkAuth, function(req, res) {
    var sAMAccountName;
    if (req.user && req.user._id) {
      sAMAccountName = req.user._id;
    } else {
      if (req.session && req.session.user) sAMAccountName = req.session.user;
    }

    if (sAMAccountName) {
      async.waterfall([
        // Ищем профиль в MongoDB
        function(callback) {
          models.profileModel.findById(sAMAccountName, (err, dbProfileObj) => {
            callback(err, dbProfileObj);
          });
        },
        // Ищем профиль в Active Directory
        function(dbProfileObj, callback) {
          if (dbProfileObj && dbProfileObj.displayName) {
            callback(null, dbProfileObj);
          } else {
            ad.findUser(sAMAccountName, function(err, adProfileObj) {
              if (err) {
                console.log("ERROR: " +JSON.stringify(err));
                return;
              }
              if (adProfileObj) {
                callback(null, adProfileObj);
              } else {
                callback(new Error(`Пользователь: ${sAMAccountName} не найден.`));
              }
            })
          } // if user in MongoDB
        }],
      function (err, profileObj) {
        if (profileObj) {
          var locationObj = [];

          if (profileObj.telephoneNumber) {
            profileObj.telephoneNumber = profileObj.telephoneNumber;
          }

          if (profileObj.physicalDeliveryOfficeName) {
            locationObj = profileObj.physicalDeliveryOfficeName.split(";");
          };

          if (locationObj.length != 4) {
            locationObj[0] = "Пл. 0";
            locationObj[1] = "Корп. 0";
            locationObj[2] = "Этаж 0";
            locationObj[3] = "Комн. 0";
          };

          // Предупреждение для пользователей IE
          let warn = false;
          if ( req.headers && req.headers["user-agent"] ) {
            let userAgent = req.headers["user-agent"];
            if (userAgent.match(/Trident/)) warn = true;
          };

          res.render("editProfile", {
            "title": profileObj.displayName,
            "user":  profileObj,
            "areas": config.areas,
            "warn":  warn,
            "location": {
              "area":     locationObj[0].replace(/Пл\.:?/,"").trim(),
              "building": locationObj[1].replace(/Корп\.:?/,"").trim(),
              "floor":    locationObj[2].replace(/Этаж:?/,"").trim(),
              "room":     locationObj[3].replace(/Комн\.:?/,"").trim()
            }
          });
        } else {
          console.log(`Пользователь: ${sAMAccountName} не найден.`);
        }
      });
    } else {
      res.status(500).end("There was an error in determining the user name");
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post("/save", checkAuth, function(req, res) {
    var sAMAccountName;
    if (req.user && req.user._id) {
      sAMAccountName = req.user._id;
    } else {
      if (req.session && req.session.user) sAMAccountName = req.session.user;
    };

    if (sAMAccountName) {
      var deliveryPOST = (req.body.delivery && req.body.delivery == "true")?true:false;
      var telPOST      = req.body.tel.toString().replace(/[;'"]/g,"").slice(0,32)||"";
      var areaPOST     = req.body.area.toString().replace(/[;'"]/g,"").slice(0,16)||"0";
      var buildingPOST = req.body.building.toString().replace(/[;'"]/g,"").slice(0,6)||"0";
      var floorPOST    = req.body.floor.toString().replace(/[;'"]/g,"").slice(0,6)||"0";
      var roomPOST     = req.body.room.toString().replace(/[;'"]/g,"").slice(0,55)||"0";
      var locationPOST = `Пл. ${areaPOST}; Корп. ${buildingPOST}; Этаж ${floorPOST}; Комн. ${roomPOST}`.slice(0,128);;
      var userProfile  = null;

      async.waterfall([
        // Ищем профиль в MongoDB
        function(callback) {
          models.profileModel.findById(sAMAccountName, (err, dbProfileObj) => {
            callback(err, dbProfileObj);
          });
        },
        // Ищем профиль в Active Directory
        function(dbProfileObj, callback) {
          if (dbProfileObj && dbProfileObj.displayName) {
            callback(null, dbProfileObj);
          } else {
            ad.findUser(sAMAccountName, function(err, adProfileObj) {
              if (err) {
                console.log("ERROR: " +JSON.stringify(err));
                return;
              }
              if (adProfileObj) {
                callback(null, adProfileObj);
              } else {
                callback(new Error(`Пользователь: ${sAMAccountName} не найден.`));
              }
            })
          } // if user in MongoDB
        }],
        function (err, userProfile){
          if (err) {
            res.status(500).send(err.toString());
          } else {
            if (userProfile.delivery) {
              userProfile.delivery.enabled = deliveryPOST;
            } else {
              userProfile.delivery = {
                available: false,
                enabled  : false
              };
            };
            userProfile.telephoneNumber = telPOST;
            userProfile.physicalDeliveryOfficeName = locationPOST;
            userProfile.principal = `${userProfile._id}@${config.domain.toUpperCase()}`;

            // Обновляем профиль в MongoDB
            models.profileModel.findByIdAndUpdate(sAMAccountName,
              userProfile ,
              {upsert: true},
            function(err, doc) {
              if (err) {
                throw err;
              } else {
                // Обновляем профиль в Active Directory
                let workerError = null;

                // Записываем в журнал запрос на изменение
                let logEntry = {
                  "username":   sAMAccountName,
                  "delivery":   userProfile.delivery,
                  "tel":        telPOST,
                  "office":     locationPOST,
                  "date":       new Date().toLocaleString(),
                  "userAgent":  req.headers['user-agent'],
                  "ip":         req.ip
                };
                fs.appendFile(config.dsmodLog, "\n" + JSON.stringify(logEntry)+ "\n");

                // Отправляем запрос агенту на изменение в AD
                let dsModQuery = querystring.stringify({
                  "dn"         : userProfile.distinguishedName,
                  "tel"        : telPOST,
                  "office"     : locationPOST,
                  "infoAvail" : userProfile.delivery.available,
                  "infoEnable" : userProfile.delivery.enabled
                });

                config.worker.headers['Content-Length'] =  dsModQuery.length;

                let workerReq = https.request(config.worker, (workerRes) => {
                  workerRes.setEncoding('utf8');

                  workerRes.on('data', (chunk) => {
                    fs.appendFile(config.dsmodLog, chunk + "\n");
                  });

                  workerRes.on('end', () => {
                    if (workerError) {
                      res.status(500).send("An error occured while changing user prifile in Active Directory");
                    } else {
                      res.redirect("/");
                    }
                  })
                });

                workerReq.on('error', (e) => {
                  console.log(`Возникла ошибка при изменении профиля пользователя в Active Directory: ${e.message}`);
                  workerError = e.message;
                  res.status(500).send("Возникла ошибка при изменении профиля пользователя в Active Directory. Обратитесь к администратору.");
                });

                workerReq.write(dsModQuery);
                workerReq.end();

              }
            }); // profileModel.findByIdAndUpdate
          }     // no err
        }       // result waterfall
      );
    } else {
      res.status(500).end("There was an error in determining the user name");
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
}
