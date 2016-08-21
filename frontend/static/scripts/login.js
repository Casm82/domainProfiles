window.addEventListener("load",  function () {
  document.getElementById("password").addEventListener("keypress", checkInput, false);

  function checkInput(event) {
    var currentPwd = this.value;
    var loginMsgDiv = document.getElementById("loginMsg");
    var loginButton = document.getElementById("loginButton");

    // Проверяем содержимое поля на наличие кириллицы
    if (currentPwd.match(/[а-яА-я]/)) {
        loginMsgDiv.style.display = "block";
        loginButton.disabled = true;
    } else {
        loginMsgDiv.style.display = "none";
        loginButton.disabled = false;
    }

    // Проверяем нажатия клавиш
    var code = event.charCode || event.keyCode;
    if (code < 32 ||
        event.charCode == 0 ||
        event.ctrlKey || event.altKey)
        return; 
    var text = String.fromCharCode(code);
    var cyr = text.match(/[а-яА-я]/);

    if (cyr) {
        var loginMsgDiv = document.getElementById("loginMsg");
        loginMsgDiv.style.display = "block";
        loginButton.disabled = true;
    } else {
        loginButton.disabled = false;
    }
  }
} , false);
