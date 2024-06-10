'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { text } = require('body-parser');
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
      const board = req.params.board;
      const {text, delete_password} = req.body;
      const date = new Date();

      // hash password
      const hashed_password = await bcrypt.hash(delete_password, SaltRounds);
      
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
        delete_password: hashed_password,
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
      const board = req.params.board;

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

        // go through each
        let response_replies = [];
        for (let reply of recent_replies) {
          // get only relevant reply info
          const current_reply = {
            _id: reply.id,
            text: reply.text,
            created_on: reply.created_on
          }

          // push to replies list
          response_replies.push(current_reply);
        }

        // get only relevant thread info
        const current_thread = {
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: response_replies
        }

        // push to response list
        response_threads.push(current_thread);
      }

      // send response
      res.send(response_threads);
    })

    .delete(async (req, res) => {
      // get data
      const board = req.params.board;
      const {thread_id, delete_password} = req.body;

      // find thread
      const current_board = await Board.findOne({name: board});
      const current_thread_index = current_board.threads.findIndex((thread) => thread._id == thread_id);

      // check password
      const password_check = await bcrypt.compare(delete_password, current_board.threads[current_thread_index].delete_password);
      if (!password_check) {
        return res.send("incorrect password");
      }

      // delete thread
      current_board.threads.splice(current_thread_index, 1);
      await current_board.save();

      // send response
      return res.send("success");
    })

    .put(async (req, res) => {
      // get data
      const board = req.params.board;
      const thread_id = req.body.thread_id;

      // find thread
      const current_board = await Board.findOne({name: board});
      const current_thread_index = current_board.threads.findIndex((thread) => thread._id == thread_id);

      // report thread
      current_board.threads[current_thread_index].reported = true;
      await current_board.save();

      // send response
      res.send("reported");
    });

  app.route('/api/replies/:board')
    .post(async (req, res) => {
      // get data
      const board = req.params.board;
      const {text, delete_password, thread_id} = req.body;
      const date = new Date();

      // hash password
      const hashed_password = await bcrypt.hash(delete_password, SaltRounds);
      
      // find thread
      const current_board = await Board.findOne({name: board});
      const current_thread_index = current_board.threads.findIndex((thread) => thread._id == thread_id);

      // update bumped_on date
      current_board.threads[current_thread_index].bumped_on = date;

      // create new reply
      const new_reply = new Reply({
        text,
        created_on: date,
        delete_password: hashed_password,
        reported: false
      });

      // push to replies and save
      current_board.threads[current_thread_index].replies.push(new_reply);
      await current_board.save();

      // output
      res.json(current_board.threads[current_thread_index]);
    })

    .get(async (req, res) => {
      // get data
      const board = req.params.board;
      const thread_id = req.query.thread_id;

      // find thread and replies
      const current_board = await Board.findOne({name: board});
      const current_thread = current_board.threads.find((thread) => thread._id == thread_id);
      const replies = current_thread.replies;

      // sort replies
      replies.sort((a, b) => b.created_on - a.created_on);

      // remove irrelevant info from every reply
      let response_replies = []
      for (let reply of replies) {
        const current_reply = {
          _id: reply.id,
          text: reply.text,
          created_on: reply.created_on
        }

        response_replies.push(current_reply);
      }

      // get only relevant thread info
      const response_thread = {
        _id: current_thread._id,
        text: current_thread.text,
        created_on: current_thread.created_on,
        bumped_on: current_thread.bumped_on,
        replies: response_replies
      }

      // send response
      res.send(response_thread);
    })

    .delete(async (req, res) => {
      // get data
      const board = req.params.board;
      const {thread_id, reply_id, delete_password} = req.body;

      // find reply
      const current_board = await Board.findOne({name: board});
      const current_thread_index = current_board.threads.findIndex((thread) => thread._id == thread_id);
      const current_reply_index = current_board.threads[current_thread_index].replies.findIndex((reply) => reply._id == reply_id);

      // check password
      const password_check = await bcrypt.compare(delete_password, current_board.threads[current_thread_index].replies[current_reply_index].delete_password);
      if (!password_check) {
        return res.send("incorrect password");
      }

      // delete reply text
      current_board.threads[current_thread_index].replies[current_reply_index].text = '[deleted]';
      await current_board.save();

      // send response
      return res.send('success');
    })

    .put(async (req, res) => {
      // get data
      const board = req.params.board;
      const {thread_id, reply_id} = req.body;

      // find reply
      const current_board = await Board.findOne({name: board});
      const current_thread_index = current_board.threads.findIndex((thread) => thread._id == thread_id);
      const current_reply_index = current_board.threads[current_thread_index].replies.findIndex((reply) => reply._id == reply_id);

      // report reply
      current_board.threads[current_thread_index].replies[current_reply_index].reported = true;
      await current_board.save();

      // send response
      res.send("reported");
    });
};
