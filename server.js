const express = require('express');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ip = require('ip');

const port = process.env.PORT || 8080;

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb://test:test@ds060009.mlab.com:60009/eslab1_chat_room';

const clients = [];
let curMsgIdx = 0;

http.listen(port, () => {
  console.log(`listening on localhost:8080 and ${ip.address()}:8080`);
});

app.use(express.static(`${__dirname}/public`));

// Get all registered users when server starts
const allUsers = [];
let usersCount = 0;
MongoClient.connect(url, (err, db) => {
  const userProfile = db.collection('userProfile');
  const cursor = userProfile.find({});
  cursor.forEach((myDoc) => {
    allUsers[usersCount] = myDoc.username;
    usersCount += 1;
  });
  db.close();
});

function getUsersList() {
  const usersList = [];
  console.log('\n========== Current Users List ==========');
  for (let i = 0; i < clients.length; i += 1) {
    usersList[i] = clients[i].n;
    console.log(clients[i].n);
  }
  console.log('====== End of Current Users List =======\n');
  return usersList;
}

function insertDocuments(db, wtinsert, callback) {
  // Get the documents collection
  const userProfile = db.collection('userProfile');
  // Insert some documents
  userProfile.insert([wtinsert], (err, result) => {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
    assert.equal(1, result.ops.length);
    callback(result);
  });
}

function addMesage(db, wtinsert, callback) {
  // Get the documents collection
  const messages = db.collection('messages');
  // Insert some documents
  messages.insert([wtinsert], (err, result) => {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
    assert.equal(1, result.ops.length);
    callback(result);
  });
}

function findDocuments(db, wtfind, callback) {
  // Get the documents collection
  const userProfile = db.collection('userProfile');
  // Find some documents
  userProfile.find(wtfind).toArray((err, docs) => {
    assert.equal(err, null);
    callback(docs);
  });
}

io.on('connection', (socket) => {
  let addedUser = false;

  socket.emit('update registered list', allUsers); // when client connects, update its 'allUsers[]'

  socket.on('download message', (room) => {
    console.log('message downloaded');
    socket.room = room;
    MongoClient.connect(url, (err, db) => {
      const messages = db.collection('messages');
      let cursor;
      if (room) {
        cursor = messages.find({
          $or: [{
            username: socket.username,
            room,
          }, {
            username: room,
            room: socket.username,
          }],
        });
      } else cursor = messages.find({ room: '' });
      cursor.forEach((myDoc) => {
        const tmp = {
          username: myDoc.username,
          message: myDoc.message,
          time: myDoc.time,
          room: myDoc.room,
        };
        socket.emit('chat message', (tmp));
      });
      socket.emit('welcome', room);
      db.close();
    });
  });

  socket.on('send chat message', (data) => {
    if (data.room) {
      io.sockets.to(data.room).emit('chat message', data);
      io.sockets.to(data.room).emit('update userlist', {
        list: getUsersList(),
        username: data.username,
      });
    } else {
      socket.broadcast.emit('chat message', data);
    }
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err);
      addMesage(db, {
        dataIdx: curMsgIdx,
        username: data.username,
        message: data.message,
        time: data.time,
        room: data.room,
      }, () => {});
      curMsgIdx += 1;
      console.log('Message added to server');
      db.close();
    });
  });

  socket.on('login', (user) => {
    if (addedUser) return;
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err);
      console.log(`User ${user.username} connected correctly to server`);
      findDocuments(db, {
        username: user.username,
      }, (doc) => {
        if (!doc[0] || doc[0].password !== user.password) {
          socket.emit('login entry', {
            result: false,
          });
        } else if (clients.find(el => el.n === user.username)) {
          socket.emit('login entry', {
            result: false,
            type: 'repeat',
          });
        } else {
          socket.join(user.username);

          socket.emit('login entry', {
            result: true,
          });
          addedUser = true;
          socket.username = user.username;
          clients.push(socket);
          clients[clients.indexOf(socket)].n = socket.username;
          io.emit('update userlist', {
            list: getUsersList(),
          });
          socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: clients.length,
            room: user.room,
          });
        }
        db.close();
      });
    });
  });

  socket.on('register', (user) => {
    if (addedUser) return;

    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err);
      console.log('Connected corroomtly to server');
      findDocuments(db, {
        username: user.username,
      }, (doc) => {
        if (!doc[0]) {
          insertDocuments(db, {
            username: user.username,
            password: user.password,
          }, () => {});

          socket.join(user.username);

          socket.emit('register entry', true);
          addedUser = true;
          socket.username = user.username;
          clients.push(socket);
          clients[clients.indexOf(socket)].n = socket.username;
          io.emit('update userlist', {
            list: getUsersList(),
          });
          socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: clients.length,
            room: user.room,
          });

          allUsers[usersCount] = user.username;
          usersCount += 1; // new users is registered, update 'allUsers[]'
          socket.broadcast.emit('update registered list', allUsers);
          socket.emit('update registered list', allUsers);
        } else {
          socket.emit('register entry', false);
        }
        db.close();
      });
    });
  });

  socket.on('update userlist', () => {
    socket.emit('update userlist', {
      list: getUsersList(),
    });
  });

  socket.on('typing', (room) => {
    socket.broadcast.emit('typing', {
      username: socket.username,
      room,
    });
  });

  socket.on('not typing', (room) => {
    socket.broadcast.emit('stop typing', {
      username: socket.username,
      room,
    });
  });

  socket.on('disconnect', () => {
    if (addedUser) {
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: clients.length,
        room: socket.room,
      });
      console.log(`User ${clients[clients.indexOf(socket)].n} disconnected.`);
      clients.splice(clients.indexOf(socket), 1);
      socket.broadcast.emit('update userlist', {
        list: getUsersList(),
      });
    }
  });
});
