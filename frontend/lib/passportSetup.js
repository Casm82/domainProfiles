var NegotiateStrategy   = require('passport-negotiate').Strategy;
var models = require("./models");

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    models.profileModel.findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use('login',
    new NegotiateStrategy({enableConstrainedDelegation:false}, function(principal, done) {
      models.profileModel.findOne({'principal' : principal, 'locked': false},
        function(err, user){
          return done(err, user);
        }
      );
    })
  );
};
