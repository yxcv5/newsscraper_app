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

    $('#overflow').children('article.item').each(function(i, element) {

      var title = $(element).children(".item-info").children(".title").find("a").text();
      var link = $(element).children(".item-info").children(".title").find("a").attr("href");
      var body = $(element).children(".item-info").children("p.teaser").find("a").text();
     
      console.log(body);

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

  db.Article
    .find({})
    .then(function(dbArticles) {
      console.log(dbArticles);
      // showSaved= true;
      // results = dbArticles;
      // res.redirect("/");
      res.render("saved", {articles: dbArticles});
    })
    .catch(function(err) {
      res.json(err);
    });
});

// Route for saving an Article
app.post("/article", function(req, res) {
  //first check to see if the article has already been saved in the db
  db.Article
    .find({
      link : req.body.link
    })
    .then(function(dbArticles) {
      if(dbArticles.length > 0) {
        console.log("article exists");
        // console.log("line 99: " + dbArticles.link);
        res.send("This article has already been saved!");
      }
      else {
        console.log("about to save");
        db.Article
        .create(req.body)
        .then(function(dbArticle) {
          res.json(dbArticle);
        })
        .catch(function(err) {
          res.json(err);
        });
      }
    }); 
    // , function(err, dbArticles) {
    //   if(dbArticles.) {
    //     console.log("article exists");
    //     // console.log("line 99: " + dbArticles.link);
    //     res.send("This article has already been saved!");
    //   }
    //   else {
    //     console.log("about to save");
    //     db.Article
    //     .create(req.body)
    //     .then(function(dbArticle) {
    //       res.json(dbArticle);
    //     })
    //     .catch(function(err) {
    //       res.json(err);
    //     });
    //   }
    // });
    
});

// Delete an article from the DB
app.delete("/delete/:id", function(req, res) {

  db.Article.findByIdAndRemove(req.params.id, function(error, removed) {
    if (error) {
      res.json(error);
    }
    else {
      //remove associated notes too
      removed.notes.forEach(function(el) {
        db.Note.findByIdAndRemove(el, function(err, rmdNote) {
          console.log(rmdNote);
        });
      });
      res.json(removed);
    }
  });
});

// Route for saving an Article's associated Note
app.post("/articles/:id", function(req, res) {
  db.Note
    .create(req.body)
    .then(function(dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { notes: dbNote._id } }, { new: true });
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
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

//Route for deleting a specific note on a specific article
app.get("/articles/:id/:noteid", function(req, res) {

  //Remove a specific note from Article notes array
  db.Article.update({ _id: req.params.id },
   { $pull: { notes: req.params.noteid }},
   function(err, response) {
    if(err) 
      res.send(err);
    else
      res.send(response);
   }
  );
  //Then remove that specific note from Note
  db.Note.findByIdAndRemove(req.params.noteid, function(error, rmdNote) {
    console.log(rmdNote);
  });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});