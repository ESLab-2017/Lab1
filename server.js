const express = require('express');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ip = require('ip');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb://test:test@ds060009.mlab.com:60009/eslab1_chat_room';

const clients = [];
let incr = 1;

http.listen(8080, () => {
  console.log(`listening on localhost:8080 and ${ip.address()}:8080`);
});

// app.get('/', (req, res) => {
//   res.sendFile(`${__dirname}/index.html`);
// });
app.use(express.static(`${__dirname}/public`));

function getUsersList() {
  const usersList = [];
  for (let i = 0; i < clients.length; i += 1) {
    usersList[i] = clients[i].n;
  }
  return usersList;
}

function setUserTyping(index) {
  const usersList = [];
  for (let i = 0; i < clients.length; i += 1) {
    usersList[i] = clients[i].n;
  }
  usersList[index] = `💬 ${clients[index].n}`;
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
    console.log('Inserted document into the collection');
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
  clients.push(socket);

  socket.on('start', () => {
    socket.emit('nick', `guest${incr}`);
    clients[clients.indexOf(socket)].n = `guest${incr}`;
    incr += 1;
    io.emit('users list', getUsersList());
  });

<<<<<<< HEAD
  socket.on('send chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('login', (user) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err);
      console.log('Connected correctly to server');
      findDocuments(db, { username: user.username }, (doc) => {
        if (!doc[0]) {
          insertDocuments(db, { username: user.username, password: user.password }, () => {});
          socket.emit('login entry', true);
          io.emit('info', `New user: ${user.username}`);
          clients[clients.indexOf(socket)].n = user.username;
          io.emit('users list', getUsersList());
        } else if (doc[0].password !== user.password) {
          socket.emit('login entry', false);
        } else {
          socket.emit('login entry', true);
          io.emit('info', `New user: ${user.username}`);
          clients[clients.indexOf(socket)].n = user.username;
          io.emit('users list', getUsersList());
        }
        db.close();
      });
=======
    socket.on('send chat message', (msg) => {
      io.emit('chat message', msg);
    });
    
    socket.on('register nick', (nick) => {
        MongoClient.connect(url, function (err, db) {
          const userProfile = db.collection('userProfile');
          assert.equal(null, err);
          console.log("Connected correctly to server");
          userProfile.insert([{ username: nick.username, password: nick.password }]);
        });
        io.emit('info', `New user: ${nick.username}`); // console.log(nick);
        clients[clients.indexOf(socket)].n = nick.username; // console.log(clients[clients.indexOf(socket)].n);
        io.emit('users list', getUsersList()); // console.log(getUsersList());
    });

    socket.on('login nick', (nick) => {
        MongoClient.connect(url, function (err, db) {
          const userProfile = db.collection('userProfile');
          assert.equal(null, err);
          console.log("Connected correctly to server");
          userProfile.insert([{ username: nick.username, password: nick.password }]);
        });
        io.emit('info', `New user: ${nick.username}`); // console.log(nick);
        clients[clients.indexOf(socket)].n = nick.username; // console.log(clients[clients.indexOf(socket)].n);
        io.emit('users list', getUsersList()); // console.log(getUsersList());
>>>>>>> 86d78be8b784b0e5cd506e213b418cdc0d403206
    });
  });

  socket.on('register', (user) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err);
      console.log('Connected correctly to server');
      findDocuments(db, { username: user.username }, (doc) => {
        if (!doc[0]) {
          insertDocuments(db, { username: user.username, password: user.password }, () => {});
          socket.emit('login entry', true);
          io.emit('info', `New user: ${user.username}`);
          clients[clients.indexOf(socket)].n = user.username;
          io.emit('users list', getUsersList());
        } else if (doc[0].password !== user.password) {
          socket.emit('login entry', false);
        } else {
          socket.emit('login entry', true);
          io.emit('info', `New user: ${user.username}`);
          clients[clients.indexOf(socket)].n = user.username;
          io.emit('users list', getUsersList());
        }
        db.close();
      });
    });
  });


  socket.on('typing', () => {
    io.emit('typing signal', setUserTyping(clients.indexOf(socket))); // console.log(setUserTyping(clients.indexOf(socket)));
  });

  socket.on('not typing', () => {
    io.emit('typing signal', getUsersList());
  });

  socket.on('disconnect', () => {
    if (clients[clients.indexOf(socket)].n == null) {
      // console.log('Guest disconnect!');
    } else {
      // console.log(clients[clients.indexOf(socket)].n +' disconnect!');
      io.emit('info', `User ${clients[clients.indexOf(socket)].n} disconnected.`);
    }
    clients.splice(clients.indexOf(socket), 1); // clientIndex, 1);
    io.emit('users list', getUsersList());
  });
});
