const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const assertionAnalyser = require('../assertion-analyser');

const board = 'functional-tests';
const test_thread_id = '666701d0ed98d605b4dbe1b0';
const test_reply_id = '6667026eed98d605b4dbe219';
let thread_id_to_delete = '';
let reply_id_to_delete = '';
const thread_text = "Newest Thread";
const reply_text = "Newest Reply";
const delete_password = 'password';
const wrong_password = 'wrong';
const date = new Date();

chai.use(chaiHttp);

suite('Functional Tests', function() {
    // POST Tests
    test('New thread POST test', function(done) {
        chai.request(server)
          .post(`/api/threads/${board}`)
          .send({
            text: thread_text,
            delete_password
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'application/json');
            assert.exists(res.body._id);
            assert.equal(res.body.text, thread_text);
            assert.equal(new Date(res.body.created_on).toDateString(), date.toDateString());
            assert.equal(new Date(res.body.bumped_on).toDateString(), date.toDateString());
            assert.equal(res.body.reported, false);
            assert.exists(res.body.delete_password);
            assert.deepEqual(res.body.replies, []);
            thread_id_to_delete = res.body._id;
            done();
          });
    });

    test('New reply POST test', function(done) {
        chai.request(server)
          .post(`/api/replies/${board}`)
          .send({
            text: reply_text,
            delete_password,
            thread_id: thread_id_to_delete
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'application/json');
            assert.exists(res.body.replies[0]._id);
            assert.equal(res.body.replies[0].text, reply_text);
            assert.equal(new Date(res.body.replies[0].created_on).toDateString(), date.toDateString());
            assert.exists(res.body.replies[0].delete_password);
            assert.equal(res.body.replies[0].reported, false);
            reply_id_to_delete = res.body.replies[0]._id;
            done();
          });
    });

    // GET Tests
    test('New thread GET test', function(done) {
        chai.request(server)
          .get(`/api/threads/${board}`)
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'application/json');
            assert.isArray(res.body);
            assert.isAtMost(res.body.length, 10);
            assert.notProperty(res.body[0], 'reported');
            assert.notProperty(res.body[0], 'delete_password');
            assert.equal(res.body[0]._id, thread_id_to_delete);
            assert.equal(res.body[0].text, thread_text);
            assert.equal(new Date(res.body[0].created_on).toDateString(), date.toDateString());
            assert.equal(new Date(res.body[0].bumped_on).toDateString(), date.toDateString());
            assert.isAtMost(res.body[1].replies.length, 3);
            assert.notProperty(res.body[0].replies[0], 'delete_password');
            assert.notProperty(res.body[0].replies[0], 'reported');
            assert.equal(res.body[0].replies[0]._id, reply_id_to_delete);
            assert.equal(res.body[0].replies[0].text, reply_text);
            assert.equal(new Date(res.body[0].replies[0].created_on).toDateString(), date.toDateString());
            done();
          });
    });

    test('New reply GET test', function(done) {
        chai.request(server)
          .get(`/api/replies/${board}?thread_id=${test_thread_id}`)
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'application/json');
            assert.isObject(res.body);
            assert.notProperty(res.body, 'reported');
            assert.notProperty(res.body, 'delete_password');
            assert.equal(res.body._id, test_thread_id);
            assert.equal(res.body.text, '15');
            assert.equal(new Date(res.body.created_on).toDateString(), date.toDateString());
            assert.equal(new Date(res.body.bumped_on).toDateString(), date.toDateString());
            assert.equal(res.body.replies.length, 5);
            assert.notProperty(res.body.replies[0], 'delete_password');
            assert.notProperty(res.body.replies[0], 'reported');
            assert.equal(res.body.replies[0]._id, test_reply_id);
            assert.equal(res.body.replies[0].text, '5');
            assert.equal(new Date(res.body.replies[0].created_on).toDateString(), date.toDateString());
            done();
          });
    });

    // PUT Tests
    test('Test PUT thread', function(done){
        chai.request(server)
          .put(`/api/threads/${board}`)
          .send({
            thread_id: thread_id_to_delete
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'text/html');
            assert.equal(res.text, "reported");
            done();
          });
    });

    test('Test PUT reply', function(done){
        chai.request(server)
          .put(`/api/replies/${board}`)
          .send({
            thread_id: thread_id_to_delete,
            reply_id: reply_id_to_delete
          })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'text/html');
            assert.equal(res.text, "reported");
            done();
          });
    });

    // DELETE Tests
    test('Test DELETE reply with invalid password', function(done){
        chai.request(server)
          .delete(`/api/replies/${board}`)
          .send({
            thread_id: thread_id_to_delete,
            reply_id: reply_id_to_delete,
            delete_password: wrong_password
          })
          .end(async function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'text/html');
            assert.equal(res.text, "incorrect password");
            done();
          });
    });

    test('Test DELETE reply with valid password', function(done){
        chai.request(server)
          .delete(`/api/replies/${board}`)
          .send({
            thread_id: thread_id_to_delete,
            reply_id: reply_id_to_delete,
            delete_password
          })
          .end(async function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'text/html');
            assert.equal(res.text, "success");
            done();
          });
    });

    test('Test DELETE thread with invalid password', function(done){
        chai.request(server)
          .delete(`/api/threads/${board}`)
          .send({
            thread_id: thread_id_to_delete,
            delete_password: wrong_password
          })
          .end(async function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'text/html');
            assert.equal(res.text, "incorrect password");
            done();
          });
    });

    test('Test DELETE thread with valid password', function(done){
        chai.request(server)
          .delete(`/api/threads/${board}`)
          .send({
            thread_id: thread_id_to_delete,
            delete_password
          })
          .end(async function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.type, 'text/html');
            assert.equal(res.text, "success");
            done();
          });
    });

});
