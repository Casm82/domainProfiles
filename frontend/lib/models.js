var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var profileSchema = new Schema( {
    "_id" :                       String,
    "principal" :                 String,
    "distinguishedName":          String,
    "employeeID":                 String,
    "locked":                     { type: Boolean, default: false },
    "delivery":                   { "enabled"   : {type: Boolean, default: false},
                                    "available" : {type: Boolean, default: false}
                                  },
    "displayName":                String,
    "givenName":                  String,
    "sn":                         String,
    "cn":                         String,
    "company":                    String,
    "department":                 String,
    "title":                      String,
    "mail":                       String,
    "telephoneNumber":            String,
    "physicalDeliveryOfficeName": String
  },
  { collection: "profiles" }
);

exports.profileModel = mongoose.model("profileModel", profileSchema);
