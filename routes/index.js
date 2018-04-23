var express = require('express');
var router = express.Router();
var app = express();
app.use(express.static('public'));

// Bodyparser
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // this is used for parsing the JSON object from POST


var store = require('data-store')('fcms', {
    cwd: 'fcms.dat'
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'FCM Editor' });
});

router.post('/get_fcms', function(req,res) {
    var fcms = store.get();
    console.log(fcms);
    var JSONdata = JSON.stringify(fcms);
    res.send(JSONdata);
});

// Receive command to execute in VE
router.post('/save_fcm', function (req, res) {
    var name_fcm = req.body.name_fcm;
    var json_fcm = req.body.json_fcm;
    store.set(name_fcm,json_fcm);
    res.render('index', { title: 'FCM Editor' });
});

module.exports = router;