'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SaltRounds = 12;

// connect to DB
mongoose.connect(process.env.DB);

// reply schema model
let replySchema = new mongoose.Schema({
  text: {type: String, require: true},
  created_on: Date,
  delete_password: {type: String, require: true},
  reported: Boolean
});

const Reply = mongoose.model('Reply', replySchema);

// thread schema model
let threadSchema = new mongoose.Schema({
  text: {type: String, require: true},
  created_on: Date,
  bumped_on: Date,
  reported: Boolean,
  delete_password: {type: String, require: true},
  replies: [replySchema]
});

const Thread = mongoose.model('Thread', threadSchema);

// board schema model
let boardSchema = new mongoose.Schema({
  name: {type: String, require: true},
  threads: [threadSchema]
});

const Board = mongoose.model('Board', boardSchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      // get data
      let board = req.params.board;
      let {text, delete_password} = req.body;
      const date = new Date();

      // hash password
      delete_password = await bcrypt.hash(delete_password, SaltRounds);
      
      // find/create board
      let current_board = await Board.findOne({name: board});
      if (!current_board) {
        current_board = new Board({
          name: board,
          threads: []
        });
      }

      // create new thread
      const new_thread = new Thread({
        text,
        created_on: date,
        bumped_on: date,
        reported: false,
        delete_password,
        replies: []
      });

      // push to board and save
      current_board.threads.push(new_thread);
      await current_board.save();

      // output
      res.json(new_thread);
    })

    .get(async (req, res) => {
      // get data
      let board = req.params.board;

      // find threads
      const current_board = await Board.findOne({name: board});
      let thread_list = current_board.threads;

      // sort by bumped on date
      thread_list.sort((a, b) => b.bumped_on - a.bumped_on);
      
      // take first 10 threads
      let recent_threads = thread_list.slice(0, 9);

      // go through each
      let response_threads = []
      for (let thread of recent_threads) {
        // sort replies and take first 3
        let replies = thread.replies;
        replies.sort((a, b) => b.created_on - a.created_on);
        const recent_replies = replies.slice(0, 2);

        // get only relevant thread info
        const current_thread = {
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: recent_replies
        }

        // push to response list
        response_threads.push(current_thread);
      }

      // send response
      res.send(response_threads);
    })

    .delete(async (req, res) => {
      // get data
      let board = req.params.board;
      let {thread_id, delete_password} = req.body;

      // find thread
      const current_board = await Board.findOne({name: board});
      const current_thread = current_board.threads.find((thread) => thread._id == thread_id);

      // check password
      const password_check = await bcrypt.compare(delete_password, current_thread.delete_password);
      if (!password_check) {
        return res.send("incorrect password");
      }

      // delete thread
      const index_to_delete = current_board.threads.findIndex((thread) => thread._id == thread_id);
      current_board.threads.splice(index_to_delete, 1);
      await current_board.save();
      return res.send("success");
    })

    .put(async (req, res) => {
      // get data
      let board = req.params.board;
      let thread_id = req.body.thread_id;

      // find thread
      const current_board = await Board.findOne({name: board});
      const current_thread_index = current_board.threads.findIndex((thread) => thread._id == thread_id);

      // report thread
      current_board.threads[current_thread_index].reported = true;
      await current_board.save();
      res.send("reported");
    });

  app.route('/api/replies/:board');
  
};
