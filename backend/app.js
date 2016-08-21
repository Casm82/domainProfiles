var config = require(__dirname + '\\settings.json')
var fs = require('fs');
var https = require('https');
var querystring = require('querystring');
var exec = require('child_process').exec;
var async = require("async");
var ActiveDirectory = require("activedirectory");
var ad = new ActiveDirectory(config.ldapConfig);

// Параметры HTTPS сервера
var sslcert = {
  key:  fs.readFileSync('./cert/key.pem'),
  cert: fs.readFileSync('./cert/cert.pem')
};

function httpHandler(req, res){
  var authorization = req.headers.authorization;
  if (!authorization) { unauthorized(res); return; }

  var parts  = authorization.split(' ');
  var scheme = parts[0];
  var auth   = new Buffer(parts[1], 'base64').toString().split(':');

  var user = auth[0];
  var pass = auth[1];

  if (!(user == config.user) && (pass == config.password)) { unauthorized(res); return; }

  let userAgent = req.headers['user-agent'];
  if (userAgent&&userAgent.match(/nagios-plugins/)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end("Hellow, Icinga!");
    return;
  };

  if (req.method == "POST") {
    let body = "";

    req.on("data", (data) => {
      body += data;
    });

    req.on("end", () => {
      let dsmodObj = querystring.parse(body);
      if (dsmodObj&&!(dsmodObj.dn || dsmodObj.tel || dsmodObj.office)) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({"error": "incomplete data"}));
        return;
      } else {
        async.parallel([
          function(cbParallel) {
            let dsModQuery = `dsmod user "${dsmodObj.dn}" -tel "${dsmodObj.tel}" -office "${dsmodObj.office}"| iconv -f CP866 -t UTF-8`;

            exec(dsModQuery, function (err, stdout, stderr) {
              let error;
              let result;

              if (stderr) {
                error = stderr.toString().replace(/\"/g, "").split(/\r\n/)[0];
                console.log(dsmodObj);
              };

              if (stdout) {
                result = stdout.toString().replace(/\"/g, "").split(/\r\n/)[0];
              };

              cbParallel(error, result);
            });
          },
          function(cbParallel) {
            if (dsmodObj.infoAvail == 'true') {
              ad.isUserMemberOf({"baseDN": config.ldapConfig.baseDN}, dsmodObj.dn, "MS_Subscribe",
                function(errConn, isMSMember) {
                  if (isMSMember) {
                    if (dsmodObj.infoEnable == 'true') {
                      cbParallel(errConn, `MS_Subscribe not changed`);
                    } else {
                      let msRmCmd = `dsmod group "CN=MS_Subscribe,OU=Jabber,DC=company,DC=ru" -rmmbr "${dsmodObj.dn}"| iconv -f CP866 -t UTF-8`;

                      exec(msRmCmd, function (err, stdout, stderr) {
                        let error;
                        let result;

                        if (stderr) {
                          error = stderr.toString().replace(/\"/g, "").split(/\r\n/)[0];
                          console.log(msRmCmd);
                        };

                        if (stdout) {
                          result = stdout.toString().replace(/\"/g, "").split(/\r\n/)[0];
                        };

                        cbParallel(error, result);
                      });
                    };
                  } else {
                    if (dsmodObj.infoEnable == 'true') {
                      let msAddCmd = `dsmod group "CN=MS_Subscribe,OU=Jabber,DC=company,DC=ru" -addmbr "${dsmodObj.dn}"| iconv -f CP866 -t UTF-8`;

                      exec(msAddCmd, function (err, stdout, stderr) {
                        let error;
                        let result;

                        if (stderr) {
                          error = stderr.toString().replace(/\"/g, "").split(/\r\n/)[0];
                          console.log(msRmCmd);
                        };

                        if (stdout) {
                          result = stdout.toString().replace(/\"/g, "").split(/\r\n/)[0];
                        };

                        cbParallel(error, result);
                      });
                    } else {
                      cbParallel(errConn, `MS_Subscribe not changed`);
                    };
                  };
              });
            } else {
              cbParallel(null);
            };
          },
        ],
        function (err, result) {
          // console.log(result);
          if (err) {
            res.writeHead(500, {"Content-Type": "application/json"});
          } else {
            res.writeHead(200, {"Content-Type": "application/json"});
          };
          let logEntry = {
            "username": dsmodObj.dn,
            "tel"     : dsmodObj.tel,
            "office"  : dsmodObj.office,
            "date"    : new Date().toLocaleString(),
            "error"   : err,
            "result"  : result
          };
          fs.appendFile(config.dsmodLog, "\n" + JSON.stringify(logEntry) + "\n");
          res.end(JSON.stringify({"error": err, "result": result}));
        });

      };
    });
  };
}

function unauthorized(res){
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({"error": "unauthorized"}));
}

https.createServer(sslcert, httpHandler).listen(config.port, config.ipbind , () => {
  console.log(`Web сервер запущен и слушает по адресу https://${config.ipbind}:${config.port}`);
})
