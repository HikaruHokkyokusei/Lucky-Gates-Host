let socket;

window.onload = () => {
  socket = io.connect(window.location.origin, {
    'reconnectionDelay': 2500,
    "reconnectionAttempts": 100
  });

  socket.on("hideForum", () => {
    let rightDiv = document.getElementById("right");
    rightDiv.removeChild(document.getElementById("LoginForm"));
    rightDiv.removeChild(document.getElementById("hr"));

    let inputFieldForm = document.getElementById("InputFieldForm");
    inputFieldForm.innerHTML += '<br>\n<textarea class="formElement" id="outputTA" placeholder="Output By Server"></textarea>';

    inputFieldForm.style.visibility = "visible";

    document.getElementById("sendToServer")
      .addEventListener("click", (e) => {
        e.preventDefault();
        formSendFunction();
      });
  });

  socket.on("setOutput", (content) => {
    let outputTextArea = document.getElementById("outputTA");
    if (typeof content == "object") {
      outputTextArea.innerHTML = JSON.stringify(content, undefined, 4);
    } else {
      outputTextArea.innerHTML = content;
    }
  });

  document.getElementById("submit")
    .addEventListener("click", (e) => {
      e.preventDefault();

      let usernameInput, passwordInput;
      usernameInput = document.getElementById("username");
      passwordInput = document.getElementById("password");

      socket.emit("authenticateAdmin", {
        username: usernameInput.value,
        password: passwordInput.value
      });
    });
};

function formSendFunction() {
  console.log("Sending Data To Server...");
  let emitEventInput, commandInput, optionsTextArea;
  emitEventInput = document.getElementById("emitEvent");
  commandInput = document.getElementById("command");
  optionsTextArea = document.getElementById("options");

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
