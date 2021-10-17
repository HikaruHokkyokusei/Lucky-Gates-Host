let socket;

window.onload = () => {
  document.getElementById("wrapper").style.visibility = "visible";

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
  let emitEventInput, commandInput;
  emitEventInput = document.getElementById("emitEvent");
  commandInput = document.getElementById("command");

  if (emitEventInput.value === "" || emitEventInput.value === "adminAction") {

    socket.emit("adminAction", {
      "command": commandInput.value.toLowerCase(),
      "options": getBodyForPacket()
    });
  } else {
    socket.emit(emitEventInput.value, getBodyForPacket());
  }
}

function getBodyForPacket() {
  let optionsTextArea = document.getElementById("options");
  let gameIdInput = document.getElementById("gameId");
  let playerAddressInput = document.getElementById("playerAddress");

  let body = JSON.parse((optionsTextArea.value === "") ? "{}" : optionsTextArea.value);

  if (gameIdInput.value !== "") {
    body["gameId"] = gameIdInput.value;
  }

  if (playerAddressInput.value !== "") {
    body["playerAddress"] = playerAddressInput.value;
  }

  return body;
}
