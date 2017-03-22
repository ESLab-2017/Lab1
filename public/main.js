$(() => {
  const objDiv = $('#msg_sec');
  const $window = $(window);
  const uneInput = $('.usernameInput');
  const pwdInput = $('.passwordInput');
  const loginBtn = $('.loginButton');
  const registerBtn = $('.registerButton');
  const mesInput = $('.boxMessage');
  const messages = $('#messages');

  const loginPage = $('.login.page');
  const chatPage = $('.new.page');

  const userCred = { username: '', password: '' };
  let typing = false;
  let connected = false;
  let curInput = uneInput.focus();

  const socket = io();

  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  function login() {
    userCred.username = cleanInput(uneInput.val().trim());
    userCred.password = cleanInput(pwdInput.val().trim());
    if (userCred.username && userCred.password) {
      socket.emit('login', userCred);
      socket.on('login entry', (suc) => {
        if (suc) {
          loginPage.fadeOut();
          chatPage.show();
          loginPage.off('click');
          curInput = mesInput.focus();
        } else {
          alert('Incorrect username or password!');
        }
      });
    }
  }

  function register() {
    userCred.username = cleanInput(uneInput.val().trim());
    userCred.password = cleanInput(pwdInput.val().trim());
    if (userCred.username && userCred.password) {
      socket.emit('register', userCred);
      socket.on('login entry', (suc) => {
        if (suc) {
          loginPage.fadeOut();
          chatPage.show();
          loginPage.off('click');
          curInput = mesInput.focus();
        } else {
          alert('Username is taken!');
        }
      });
    }
  }

  function updateUserList(u) {
    const list = document.getElementById('ulist');
    list.innerHTML = '';

    for (let i = 0; i < u.length; i += 1) {
      const item = document.createElement('li');
      if (u[i] === userCred.username) {
        item.innerHTML = `<b>${u[i]}</b> <i>(You)</i>`;
      } else {
        item.innerHTML = u[i];
      }
      list.appendChild(item);
    }
  }

  function dateTime() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
      'November', 'December',
    ];
    const d = date.getDate();
    const day = date.getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();
    if (h < 10) {
      h = `0${h}`;
    }
    if (m < 10) {
      m = `0${m}`;
    }
    if (s < 10) {
      s = `0${s}`;
    }
    const result = `${days[day]} ${months[month]} ${d} ${year} ${h}:${m}:${s}`;
    return result;
  }

  loginBtn.click(() => {
    login();
  });

  registerBtn.click(() => {
    register();
  });

  $('#boxMessage').on('input', () => {
    if ($('#boxMessage').val() !== '' && typing === false) {
      socket.emit('typing');
      typing = true;
    } else if ($('#boxMessage').val() === '') {
      socket.emit('not typing');
      typing = false;
    }
  });

  socket.on('connect', () => {
    socket.emit('start');
  });

  socket.on('nick', (nick) => {
    userCred.username = nick;
  });

  $('form').submit(() => {
    const temp = [dateTime(), userCred.username, $('#boxMessage').val()];
    socket.emit('send chat message', temp);
    $('#boxMessage').val('');
    typing = false;
    socket.emit('not typing');
    return false;
  });

  socket.on('chat message', (msg) => {
    if (msg[1] === userCred.username) {
      $('#messages').append(`<li><p align='right'>${msg[2]}</p></br></li>`);
      $('#messages').append(`<li><p class='time' align='right'>${msg[0]}</p></li>`);
    } else {
      $('#messages').append(`<li><b><p align='left'>${msg[1]}:</b> ${msg[2]}</p></li>`);
      $('#messages').append(`<li><p class='time' align='left'>${msg[0]}</p></li>`);
    }
    objDiv.scrollTop = objDiv.scrollHeight;
  });

  socket.on('info', (inf) => {
    $('#messages').append(`<li class='inf'><i>${inf}</i></li>`);
  });

  socket.on('users list', (usersList) => {
    updateUserList(usersList);
  });

  socket.on('typing signal', (usersList) => {
    updateUserList(usersList);
  });
});
