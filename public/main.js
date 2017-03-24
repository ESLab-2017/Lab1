$(() => {
    const FADE_TIME = 150;
    const TYPING_TIMER_LENGTH = 500;
    const COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7',
    ];

    const $window = $(window);

    const $loginPage = $('.login.page');
    const $chatPage = $('.new.page');

    const $uneInput = $('.usernameInput');
    const $pwdInput = $('.passwordInput');
    const $loginBtn = $('.loginButton');
    const $registerBtn = $('.registerButton');

    const $mesInput = $('.inputMessage');
    const $messages = $('.messages');

    const userCred = { username: '', password: '' };
    let typing = false;
    let connected = false;
    let lastTypingTime;
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

    function addSpinningIcon(ev) {
        if (ev === 'login') {
            $loginBtn.html('<img src="img/loading.gif" class="spin" />');
        } else {
            $registerBtn.html('<img src="img/loading.gif" class="spin" />');
        }
    }

    function getTypingMessages(data) {
        return $('.typing.message').filter(function filter() {
            return $(this).data('username') === data.username;
        });
    }

    function getUsernameColor(username) {
        // Compute hash code
        let hash = 7;
        for (let i = 0; i < username.length; i += 1) {
            hash = (username.charCodeAt(i) + (hash << 5)) - hash;
        }
        // Calculate color
        const index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    function addMessageElement(el, options) {
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
        $('.tooltip').tooltipster({
            animation: 'grow',
            delay: 150,
            distance: 4,
            theme: 'tooltipster-borderless',
        });
    }

    function login() {
        userCred.username = cleanInput($uneInput.val().trim());
        userCred.password = cleanInput($pwdInput.val().trim());
        if (userCred.username && userCred.password) {
            addSpinningIcon('login');
            socket.emit('login', userCred);
        }
    }

    function register() {
        userCred.username = cleanInput($uneInput.val().trim());
        userCred.password = cleanInput($pwdInput.val().trim());
        if (userCred.username && userCred.password) {
            addSpinningIcon('register');
            socket.emit('register', userCred);
        }
    }

    function log(message, options) {
        const $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    function addChatMessage(data, options) {
        // Don't fade the message in if there is an 'X was typing'
        const $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        const typingClass = data.typing ? 'typing' : '';
        const $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message)
            .addClass('tooltip')
            .prop('title', data.time);
        let $messageDiv;
        if (data.username !== userCred.username) {
            const $usernameDiv = $('<span class="username"/>')
                .text(data.username)
                .css('color', getUsernameColor(data.username));

            $messageDiv = $('<li class="message"/>')
                .data('username', data.username)
                .addClass(typingClass)
                .append($usernameDiv, $messageBodyDiv);
        } else {
            $messageDiv = $('<li class="message"/>')
                .data('username', data.username)
                .addClass(typingClass)
                .addClass('right')
                .append($messageBodyDiv);
        }

        addMessageElement($messageDiv, options);
    }

    function sendMessage() {
        const msg = cleanInput($mesInput.val());
        const tmp = {
            username: userCred.username,
            message: msg,
            time: dateTime(),
        };
        if (msg && connected) {
            $mesInput.val('');
            addChatMessage(tmp);
            socket.emit('send chat message', tmp);
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

    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(() => {
                const typingTimer = (new Date()).getTime();
                const timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('not typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // Adds the visual chat typing message
    function addChatTyping(data) {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    // Removes the visual chat typing message
    function removeChatTyping(data) {
        getTypingMessages(data).fadeOut(() => {
            $(this).remove();
        });
    }

    function getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    // When page is reloaded, check cookie if logged in before
    if (getCookie("loggedIn")) {
        connected = true;
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        curInput = $mesInput.focus();
        userCred.username = getCookie("userName");
        console.log('Logged in before, user is: ' + getCookie("userName"));
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
        updateTyping();
    });

    $mesInput.click(() => {
        $mesInput.focus();
    });

    socket.on('login entry', (suc) => {
        if (suc) {
            connected = true;
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            curInput = $mesInput.focus();
            document.cookie = "loggedIn" + "=" + 1 + ";path=/";
            document.cookie = "userName" + "=" + userCred.username + ";path=/";
        } else {
            alert('Incorrect username or password!');
            userCred.username = '';
            userCred.password = '';
            location.reload();
        }
    });

    socket.on('register entry', (suc) => {
        if (suc) {
            connected = true;
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            curInput = $mesInput.focus();
            document.cookie = "loggedIn" + "=" + 1 + ";path=/";
            document.cookie = "userName" + "=" + userCred.username + ";path=/";
        } else {
            alert('Username is taken!');
            userCred.username = '';
            userCred.password = '';
            location.reload();
        }
    });

    socket.on('chat message', (msg) => {
        addChatMessage(msg);
    });

    socket.on('info', (inf) => {
        log(inf);
    });

    socket.on('update userlist', (list) => {
        updateUserList(list);
    });

    socket.on('typing signal', (usersList) => {
        updateUserList(usersList);
    });

    socket.on('typing', (data) => {
        addChatTyping(data);
    });

    socket.on('stop typing', (data) => {
        removeChatTyping(data);
    });
});