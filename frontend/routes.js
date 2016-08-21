"use strict";
module.exports = function(app, passport) {
  ////////////////////////////////////////////////////////////////////////////////////////
  // Устанавливаем заголовок HTTP Strict Transport Security
  app.use(function(req, res, next) {
    if (req.headers && req.headers["Strict-Transport-Security"]) {
      next();
    } else {
      if (res.headersSent) {
        next();
      } else {
        res.append("Strict-Transport-Security", "max-age=2592000; includeSubdomains; preload");
        next();
      };
    };
  });
  // Маршруты //////////////////////////////////////////////////////////////////////////////
  require("./1_sessions.js")(app, passport);
  require("./2_profiles.js")(app, passport);
  ////////////////////////////////////////////////////////////////////////////////////////
  app.use(function (req, res, next) {    // 404s
    if (req.accepts("html")) {
      return res.status(404).send("<h2>Извините, но я не могу найти эту страницу.</h2>");
    }
    if (req.accepts("json")) {
      return res.json({ error: "Not found" });
    }
    // default response type
    res.type("txt");
    res.status(404).send("Не могу найти страницу.");
  })

  app.use(function (err, req, res, next) {    // 500
    console.log("error at %s\n", req.url, err.stack);
    res.status(500).send("<h2>Обнаружена ошибка в работе сервера. Обратитесь к Администратору.</h2>");
  })

}; // <--- app()
