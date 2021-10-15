let loginForm, loginButton, loginErrorMsg;
let emitEventInput, commandInput, optionsTextArea,outputTextArea;
let socket;

window.onload = () => {
  socket = io.connect(window.location.origin);

  socket.on("hideForum", () => {
    const mainHolder = document.getElementById("main-holder");
    document.getElementById("login-header").innerHTML = "Welcome to Admin Console";
    mainHolder.removeChild(document.getElementById("login-error-msg-holder"))
    mainHolder.removeChild(loginForm);
  });

  socket.on("setOutput", (content) => {
    if (typeof content == "object") {
      outputTextArea.innerHTML = JSON.stringify(content, undefined, 4);
    } else {
      outputTextArea.innerHTML = content;
    }
  });

  loginForm = document.getElementById("login-form");
  loginButton = document.getElementById("login-form-submit");
  loginErrorMsg = document.getElementById("login-error-msg");
  emitEventInput = document.getElementById("emitEventInput");
  commandInput = document.getElementById("commandInput");
  optionsTextArea = document.getElementById("optionsTextArea")
  outputTextArea = document.getElementById("outputTextArea");

  loginButton.addEventListener("click", (e) => {
    e.preventDefault();
    const username = loginForm.username.value;
    const password = loginForm.password.value;

    socket.emit("authenticateAdmin", {
      username: username,
      password: password
    });
  });
};

function sendAdminAction() {
  let options = (optionsTextArea.value === "") ? "{}" : optionsTextArea.value;
  options = JSON.parse(options);
  if (emitEventInput.value === "" || emitEventInput.value === "adminAction") {
    socket.emit("adminAction", {
      "command": commandInput.value.toLowerCase(),
      "options": options
    });
  } else {
    socket.emit(emitEventInput.value, options);
  }
}
