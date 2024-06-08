'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SaltRounds = 12;

// connect to DB
mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

// board schema model
let boardSchema = new mongoose.Schema({
  text: String,
  created_on: Date,
  bumped_on: Date,
  reported: Boolean,
  deletePassword: String,
  replies: [{
    text: String, 
    created_on: Date,
    deletePassword: String,
    reported: Boolean
  }]
});

let Board = mongoose.model('Board', boardSchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .get((req, res) => {

    })

    .post((req, res) => {

    })

    .put((req, res) => {

    })

    .delete((req, res) => {

    });
    
  app.route('/api/replies/:board')
    .get((req, res) => {

    })

    .post((req, res) => {

    })

    .put((req, res) => {

    })

    .delete((req, res) => {

    });

};
