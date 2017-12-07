
$("#scrapeBtn").on("click", function() {
  // window.location.href="/";
  $(".results").empty();
  $.getJSON("/scrape", function(data) {
    
    $("#scrape-info").text("Added " + data.length + " new articles!");
    $("#scrapeModal").modal("show");  
    
    for (var i = 0; i < data.length; i++) { 
      $(".results").append(createNewPane(data[i]));
    }
    //or call a $.post("/") route with returned data  to rerender home page?
  });
});

function createNewPane(article) {
  var btns;

  if(article._id) {
    btns = "<button class='getnotes btn btn-warning pull-right' data-id='" +
           article._id + "'>ARTICLE NOTES</button>" + 
            "<button class='unsave btn btn-danger pull-right' data-id='" +
           article._id + "'>REMOVE FROM SAVED</button>";
  }
  else {
    btns = "<button class='save btn btn-success pull-right'>SAVE ARTICLE</button>";
  }

  var $newPane = $(
    [
      "<div class='panel panel-primary'>",
      "<div class='panel-heading clearfix'>",
      article.title,
      btns,
      "</div>",
      "<div class='panel-body'>",
      article.body,
      "<a target='_blank' href='",
      article.link,
      "'> Read more ... </a>",
      "</div>",
      "</div>"
    ].join("")
  );

  if(!article._id)
    $newPane.find("button.save").data("article", article);

  return $newPane;
}

$(document).on("click", ".save", function() {

  console.log($(this).data("article"));

  $.ajax({
    method: "POST",
    url: "/article",
    data: $(this).data("article")
  })
  .done(function(data) {
    if(typeof data === "string" && data.startsWith("This")) {
      console.log(data);
      alert(data);
    }
    else 
      console.log(data);
  });
});

$(document).on("click", ".unsave", function() {

  var thisId = $(this).attr("data-id");

  $.ajax({
    method: "DELETE",
    url: "/delete/" + thisId
  })
  .done(function(data) {
    console.log(data);
    location.reload();  //the server-side res.redirect() method seems not work properly however I tried
  });
});

function populateNotes(id) {
  $("#thenotes").empty();
  
  $.ajax({
    method: "GET",
    url: "/articles/" + id
  })
  .done(function(data) {
    $("#notes-header").text("Notes for Article: " + data._id);
    if(data.notes.length>0) {
      for(var i=0; i<data.notes.length; i++) {
        $("#thenotes").append("<p class='clearfix' data-id='" + data.notes[i]._id + "'>" + 
                      data.notes[i].body + "<span class='deletenote pull-right'>X</span></p>");    
      }
    }
    else {
      $("#thenotes").append("<p>No notes for this article</p>"); 
    }
    $("#savenote").data("id", id);
  });
}

$(document).on("click", ".getnotes", function() {
  $("#notesModal").modal("show");
  var thisId = $(this).attr("data-id");
  populateNotes(thisId);
});

$(document).on("click", "#savenote", function() {
  $.ajax({
    method: "POST",
    url: "/articles/" + $(this).data("id"),
    data: {body: $("#newnote").val()}
  })
  .done(function(data) {
    populateNotes(data._id);
    $("#newnote").val("");
  });
});

$(document).on("click", ".deletenote", function() {
  var artId = $("#savenote").data("id");
  var noteId = $(this).parent().attr("data-id");
  $.ajax({
    method: "GET",
    url: "/articles/" + artId + "/" + noteId,
    success: function() {
      populateNotes(artId);
    }
  });
});






