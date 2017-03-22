const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ip = require('ip');
const MongoClient = require('mongodb').MongoClient
const assert = require('assert');

const url = 'mongodb://test:test@ds060009.mlab.com:60009/eslab1_chat_room';

const clients = [];
let incr = 1;

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

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

io.on('connection', (socket) => {
    clients.push(socket);

    socket.on('start', () => {
      socket.emit('nick', `guest${incr}`);
      clients[clients.indexOf(socket)].n = `guest${incr}`;
      incr += 1;
      io.emit('users list', getUsersList());
    });

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
    });

    socket.on('typing', () => {
      io.emit('typing signal', setUserTyping(clients.indexOf(socket))); // console.log(setUserTyping(clients.indexOf(socket)));
    });

    socket.on('not typing', () => {
      io.emit('typing signal', getUsersList()); // console.log(getUsersList());
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

http.listen(8080, () => {
  console.log(`listening on localhost:8080 and ${ip.address()}:8080`);
});

// add sudo comment
