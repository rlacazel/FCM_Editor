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
    store.set(name_fcm, json_fcm);
    res.render('index', {title: 'FCM Editor'});
});

// Receive command to execute in VE
router.post('/del_fcm', function (req, res) {
    var name_fcm = req.body.name_fcm;
    store.del(name_fcm);
    res.render('index', { title: 'FCM Editor' });
});

router.post('/rename_fcm', function (req, res) {
    var old_name_fcm = req.body.old_name_fcm;
    var new_name_fcm = req.body.new_name_fcm;
    if(store.has(new_name_fcm))
    {
        res.status(500).send('The name \"' + new_name_fcm + '\" already exist!');
    }
    else {
        var json_fcm = store.get(old_name_fcm);
        store.del(old_name_fcm);
        store.set(new_name_fcm, json_fcm);
        res.render('index', {title: 'FCM Editor'});
    }
});

module.exports = router;