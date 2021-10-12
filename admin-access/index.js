let loginForm, loginButton, loginErrorMsg;
let commandInput, optionsTextArea,outputTextArea;
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
    outputTextArea.innerHTML = content;
  });

  loginForm = document.getElementById("login-form");
  loginButton = document.getElementById("login-form-submit");
  loginErrorMsg = document.getElementById("login-error-msg");
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
  let options = (optionsTextArea.value === "") ? "{}" : JSON.parse(optionsTextArea.value);
  socket.emit("adminAction", {
    "command": commandInput.value.toLowerCase(),
    "options": options
  });
}
