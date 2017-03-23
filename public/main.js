$(() => {
  const FADE_TIME = 150;

  const $objDiv = $('#msg_sec');
  const $window = $(window);

  const $loginPage = $('.login.page');
  const $chatPage = $('.new.page');

  const $uneInput = $('.usernameInput');
  const $pwdInput = $('.passwordInput');
  const $loginBtn = $('.loginButton');
  const $registerBtn = $('.registerButton');

  const $mesInput = $('.inputMessage');
  const $messages = $('#messages');

  const userCred = { username: '', password: '' };
  let typing = false;
  let connected = false;
  let curInput = $uneInput.focus();

  const socket = io();

  function cleanInput(input) {
    return $('<div/>').text(input).text();
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

  function addMessageElement (el, options) {
    const $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function login() {
    userCred.username = cleanInput($uneInput.val().trim());
    userCred.password = cleanInput($pwdInput.val().trim());
    if (userCred.username && userCred.password) {
      socket.emit('login', userCred);
      socket.on('login entry', (suc) => {
        if (suc) {
          connected = true;
          $loginPage.fadeOut();
          $chatPage.show();
          $loginPage.off('click');
          curInput = $mesInput.focus();
        } else {
          alert('Incorrect username or password!');
          userCred.username = '';
          userCred.password = '';
        }
      });
    }
  }

  function register() {
    userCred.username = cleanInput($uneInput.val().trim());
    userCred.password = cleanInput($pwdInput.val().trim());
    if (userCred.username && userCred.password) {
      socket.emit('register', userCred);
      socket.on('login entry', (suc) => {
        if (suc) {
          connected = true;
          $loginPage.fadeOut();
          $chatPage.show();
          $loginPage.off('click');
          curInput = $mesInput.focus();
        } else {
          alert('Username is taken!');
          userCred.username = '';
          userCred.password = '';
        }
      });
    }
  }

  function sendMessage() {
    const message = cleanInput($mesInput.val());
    const temp = [dateTime(), userCred.username, message];
    if (message && connected) {
      socket.emit('send chat message', temp);
      $mesInput.val('');
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

  $loginBtn.click(() => {
    login();
  });

  $registerBtn.click(() => {
    register();
  });

  $window.keydown((ev) => {
    // Auto-focus the current input when a key is typed
    if (userCred.username && !(ev.ctrlKey || ev.metaKey || ev.altKey)) {
      curInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (ev.which === 13) {
      if (userCred.username) {
        sendMessage();
        socket.emit('not typing');
        typing = false;
      }
    }
  });

  $mesInput.on('input', () => {
    if ($('#boxMessage').val() !== '' && typing === false) {
      socket.emit('typing');
      typing = true;
    } else if ($('#boxMessage').val() === '') {
      socket.emit('not typing');
      typing = false;
    }
  });

  // socket.on('connect', () => {
  //   socket.emit('start');
  // });

  // socket.on('nick', (nick) => {
  //   userCred.username = nick;
  // });

  socket.on('chat message', (msg) => {
    if (msg[1] === userCred.username) {
      $('#messages').append(`<li><p align='right'>${msg[2]}</p></br></li>`);
      $('#messages').append(`<li><p class='time' align='right'>${msg[0]}</p></li>`);
    } else {
      $('#messages').append(`<li><b><p align='left'>${msg[1]}:</b> ${msg[2]}</p></li>`);
      $('#messages').append(`<li><p class='time' align='left'>${msg[0]}</p></li>`);
    }
    $objDiv.scrollTop = $objDiv.scrollHeight;
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
