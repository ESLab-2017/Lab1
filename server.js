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

http.listen(port, () => {
    console.log(`listening on localhost:8080 and ${ip.address()}:8080`);
});

app.use(express.static(`${__dirname}/public`));

function getUsersList() {
    const usersList = [];
    for (let i = 0; i < clients.length; i += 1) {
        usersList[i] = clients[i].n;
        //console.log("list: " + clients[i].n);
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
    clients.push(socket);

    socket.on('send chat message', (msg) => {
        socket.broadcast.emit('chat message', msg);
    });

    socket.on('login', (user) => {
        if (addedUser) return;
        MongoClient.connect(url, (err, db) => {
            assert.equal(null, err);
            console.log(user.username + ' connected correctly to server');
            findDocuments(db, { username: user.username }, (doc) => {
                if (!doc[0] || doc[0].password !== user.password) {
                    socket.emit('login entry', false);
                } else {
                    socket.emit('login entry', true);
                    addedUser = true;
                    socket.username = user.username;
                    io.emit('info', `New user: ${user.username}`);
                    clients[clients.indexOf(socket)].n = user.username;
                    io.emit('update userlist', getUsersList());
                    io.emit('user joined', {
                        username: socket.username,
                        numUsers: clients.length,
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
            console.log('Connected correctly to server');
            findDocuments(db, { username: user.username }, (doc) => {
                if (!doc[0]) {
                    insertDocuments(db, { username: user.username, password: user.password }, () => {});
                    socket.emit('register entry', true);
                    addedUser = true;
                    socket.username = user.username;
                    io.emit('info', `New user: ${user.username}`);
                    clients[clients.indexOf(socket)].n = user.username;
                    io.emit('update userlist', getUsersList());
                    io.emit('user joined', {
                        username: socket.username,
                        numUsers: clients.length,
                    });
                } else {
                    socket.emit('register entry', false);
                }
                db.close();
            });
        });
    });

    socket.on('typing', () => {
        io.emit('typing signal', setUserTyping(clients.indexOf(socket)));
        socket.broadcast.emit('typing', {
            username: socket.username,
        });
    });

    socket.on('not typing', () => {
        io.emit('typing signal', getUsersList());
        socket.broadcast.emit('stop typing', {
            username: socket.username,
        });
    });

    socket.on('disconnect', () => {
        if (addedUser) {
            io.emit('info', `User ${clients[clients.indexOf(socket)].n} disconnected.`);
            console.log(`User ${clients[clients.indexOf(socket)].n} disconnected.`);
            clients.splice(clients.indexOf(socket), 1);
            socket.broadcast.emit('update userlist', getUsersList());
        }
    });
});