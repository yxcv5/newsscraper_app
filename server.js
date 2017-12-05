var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var request = require("request");

var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware
// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));


var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/nprtechnews", {
  useMongoClient: true
});

var results = [];

// Routes
app.get("/", function(req, res) {
  console.log(results);
  res.render("index", 
    { 
      articles: results 
    });
});

app.get("/scrape", function(req, res) {

  results = [];

  request("https://www.npr.org/sections/alltechconsidered/", function(error, response, html) {
    // Load the html body from request into cheerio
    var $ = cheerio.load(html);

    $('#overflow').find('article').each(function(i, element) {

      var title = $(element).children(".item-info").children(".title").find("a").text();
      var link = $(element).children(".item-info").children(".title").find("a").attr("href");
      var body = $(element).children("item-info").children(".teaser").find("a").text();

      results.push({ 
        title: title,
        link: link,
        body: body 
      });

    });
    
    res.json(results);
    // res.redirect("/");
  });
});

// Route for getting all Articles from the db
app.get("/saved", function(req, res) {
  // Grab every document in the Articles collection
  db.Article
    .find({})
    .then(function(dbArticles) {
      // showSaved= true;
      // results = dbArticles;
      // res.redirect("/");
      // res.json(dbArticles);
      res.render("saved", {articles: dbArticles});
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

      // if(title && link && body) {
      //   db.Article
      //   .create({
      //     title: title,
      //     link: link,
      //     body: body
      //   })
      //   .then(function(dbArticle) {
      //     res.json(length + " articles scraped");
      //   })
      //   .catch(function(err) {
      //     res.json(err);
      //   });
      // }

// Route for saving an Article
app.post("/article", function(req, res) {
  db.Article
    .create(req.body)
    .then(function(dbArticle) {
      console.log(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Delete One from the DB
// app.get("/delete/:id", function(req, res) {
app.delete("/delete/:id", function(req, res) {
  // Remove a note using the objectID
  db.Article.findByIdAndRemove(req.params.id, function(err, removed) {
    // Log any errors
    if (err) {
      res.json(error);
    }
    else {
      res.redirect("/saved");
    }
  });
});

// Route for saving an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note
    .create(req.body)
    .then(function(dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { notes: dbNote._id } }, { new: true });
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's notes
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("notes")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/articles/:id/:noteid", function(req, res) {

  db.Article.update({ _id: req.params.id },
   { $pull: { notes: req.params.noteid }},
   function(err, response) {
    if(err) 
      res.send(err);
    else
      res.send(response);
   }
  );
});


// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});