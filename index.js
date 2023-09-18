require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const urlLib = require('url');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');

//Open database connection
mongoose
  .connect(
    process.env['MONGO_URI'],
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log('Database connection successful');
  })
  .catch((err) => {
    console.error('Database connection error');
  });

// Basic Configuration
const port = process.env.PORT || 3000;

//Url Schema and model
const myUrlsSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});


const myUrls = mongoose.model('MyUrls', myUrlsSchema);

//Middlewares
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(`${process.cwd()}/public`));


//Routing
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:url', (req, res) => {
  myUrls.findOne({ short_url: Number(req.params.url)}, (err, data) => {
    if (err) {
      return res.status(500).send('Internal server error');
    }

    if (!data) {
      return res.status(404).send('Not Found');
    }
    
    res.redirect(data.original_url);
  });
})

//API endpoint
app.post('/api/shorturl', function(req, res) {
  const inputUrl = req.body.url;

  if (!inputUrl) {
    return res.status(400).send('Not Found');
  }
  //Using Url core module to extract hostname
  let parsedUrl = urlLib.parse(inputUrl);
  if (!(parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
    return res.json({error : 'invalid url'});
  }
  
  dns.lookup(parsedUrl.hostname, (err, address) => {
    if (err) {
      return res.status(400).json({error: "Invalid Hostname"});
    }
    
    let new_short_url;
    myUrls.find().sort({short_url: -1}).limit(1).exec((err, data) => {
      if (err) return res.status(500).send('Internal Error');
      if(!data || data.length === 0) {
        new_short_url = 1;
      } else {
        new_short_url = data[0].short_url + 1;
      }
      const url = new myUrls({
        original_url: inputUrl,
        short_url: Number(new_short_url)
      });
  
      url.save((err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({error: 'Erreur d\'enregistrement'});
        } else {
          res.json({original_url: data.original_url, short_url: data.short_url});
        }
      });
    });
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
