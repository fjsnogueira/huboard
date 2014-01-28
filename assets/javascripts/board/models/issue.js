
var correlationId = require("../utilities/correlationId")
var Serializable = require("../mixins/serializable");

var Issue = Ember.Object.extend(Serializable,{
  correlationId: correlationId,
  customState: function (key, value) {
    if(value !== undefined) {
        var user = this.get("repo.owner.login"),
            repo = this.get("repo.name"),
            full_name = user + "/" + repo,
            previousState = this.get("_data.custom_state"),
            options = {dataType: "json"};

        this.set("_data.custom_state", value);
        this.set("processing", true);

        switch(value){
          case "ready": 
            Ember.$.extend(options, {
              url: "/api/" + full_name + "/issues/" + this.get("number") + "/ready",
              type: "PUT"
            })
            break;
          case "blocked":
            Ember.$.extend(options, {
              url: "/api/" + full_name + "/issues/" + this.get("number") + "/blocked",
              type: "PUT"
            })
            break;
          case "":
            Ember.$.extend(options, {
              url: "/api/" + full_name + "/issues/" + this.get("number") + "/" + previousState,
              type: "DELETE"
            })
            break;


        }

        Ember.$.ajax(options)
        .then(function(){
          this.set("processing", false);

        }.bind(this));
        return value;
    }
    return this.get("_data.custom_state");
  }.property("_data.custom_state"),
  saveNew: function () {
    return Ember.$.ajax( {
      url: "/api/v2/" + this.get("repo.full_name") + "/issues/create", 
      data: JSON.stringify(this.serialize()),
      dataType: 'json',
      type: "POST",
      contentType: "application/json"}).then(function(response){
      return Issue.create(response);
    })
  },
  submitComment : function (markdown) {
     this.set("processing", true);
      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;

    return Ember.$.ajax( {
      url: "/api/" + full_name + "/issues/" + this.get("number") + "/comment", 
      data: JSON.stringify({ markdown: markdown, correlationId: this.get("correlationId")}),
      dataType: 'json',
      type: "POST",
      contentType: "application/json"})
      .then(function(response){
        this.set("processing", false);
        return response;
      }.bind(this))
  },
  updateLabels : function () {
     this.set("processing", true);
      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;

    return Ember.$.ajax( {
      url: "/api/" + full_name + "/issues/" + this.get("number") + "/update", 
      data: JSON.stringify({labels: this.serialize().other_labels, correlationId: this.get("correlationId")}),
      dataType: 'json',
      type: "POST",
      contentType: "application/json"})
      .then(function(response){
        this.set("processing", false);
      }.bind(this))
  },
  loadDetails: function () {
     this.set("processing", true);
      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;
     
     return Ember.$.getJSON("/api/" + full_name + "/issues/" + this.get("number") + "/details").then(function(details){
       this.set("activities", details.activities);
       this.set("processing", false);
     }.bind(this))
  },
  processing: false,
  loaded: false,
  archive: function() {
     this.set("processing", true);
      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;

      return Ember.$.post("/api/" + full_name + "/archiveissue", {
        number : this.get("number"),
        correlationId: this.get("correlationId")
      }).then(function () {
        this.set("processing", false);
        this.set("isDestroying", true);
      }.bind(this))
  },
  drag: function (column) {
      this.set("current_state", column)
      // this is weird
      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;

      return Ember.$.post("/api/" + full_name + "/movecard", {
        index : column.index.toString(),
        number : this.get("number"),
        correlationId: this.get("correlationId")
      })
  },
  close: function () {
     this.set("processing", true);

      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;

      Ember.$.post("/api/" + full_name + "/close", {
        number : this.get("number"),
        correlationId: this.get("correlationId")
      }).then(function() {
        this.set("state","closed")
        this.set("processing", false);
      }.bind(this))
  },
  reorder: function (index, column) {
      var changedColumns = this.get("current_state") !== column;
      changedColumns && this.set("_data.custom_state", "");
        
      this.set("current_state", column)
      this.set("_data.order", index);

      var user = this.get("repo.owner.login"),
          repo = this.get("repo.name"),
          full_name = user + "/" + repo;

      return Ember.$.post("/api/" + full_name + "/dragcard", {
        number : this.get("number"),
        order: index.toString(),
        column: column.index.toString(),
        moved_columns: changedColumns,
        correlationId: this.get("correlationId")
      }).then(function( response ){
         this.set("_data.order", response._data.order);
         return this;
      }.bind(this))
  
  }

});

Issue.reopenClass({
  createNew: function(){
     return Issue.create({
       id: null,
       title: "",
       body: "",
       assignee: null,
       milestone: null,
       repo: App.get("repo"),
       labels: []
     })
  }
});

module.exports = Issue;

