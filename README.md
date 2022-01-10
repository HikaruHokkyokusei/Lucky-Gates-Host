<p align="center">
  <img src="./LGH-Info-Img.jpg" alt="Information about LGH">
</p>

<h1 align="center">Lucky Gates Host</h1>

Base framework for the project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 13.1.1.

## Initialization

Following environment variables need to be set up before using this project: -
<ul>
<label>For server: -</label>
<li><code>PORT</code></li>

<label>For admin console: -</label>
<li><code>adminUsername</code></li>
<li><code>adminPassword</code></li>

<label>For MongoDB: -</label>
<li><code>DBUsername</code></li>
<li><code>DBPassword</code></li>
<li><code>DBClusterName</code></li>
<li><code>DBName</code></li>

<label>For owner wallet: -</label>
<li><code>ownerWalletAddress</code></li>
<li><code>ownerPrivateKey</code></li>

<label>For blockchain data providers `(Value format -> ["...", "...", ...])`: -</label>
<li><code>BSC_API</code></li>
<li><code>GOERLI_API</code></li>

<label>For box API/SDK: -</label>
<li><code>BoxClientId</code></li>
<li><code>BoxClientSecret</code></li>
<li><code>BoxDeveloperToken</code></li>
</ul>

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `public/` directory.

## Development server

The root folder contains a `server.js` file.

<ul>
  <li>Step <code>0</code>: Make sure all node dependencies are already installed.</li>
  <li>Step <code>1</code>: Build the angular app.</li>
  <li>Step <code>2</code>: Set the environment variable <code>PORT</code> on which you want the application to listen on (default is <code>6969</code>).</li>
  <li>Step <code>3</code>: Run <code>node server</code> to start the server.</li>
</ul>

Application can then be visited on `localhost:PORT`.

## Logs

Logs of the game are automatically uploaded to [box.com](https://www.box.com/) (Set up in main.py file of python
scripts).

Box App Type: - `Custom App -> Server Authentication (Client Credentials Grant)`

Additionally, if the app is deployed on heroku, following commands can also be used: -

<ul>
<li>heroku ps:copy "./private/PythonScripts/jsLog.log" -a <code>APP_NAME</code></li>
<li>heroku ps:copy "./private/PythonScripts/pyLog.log" -a <code>APP_NAME</code></li>
</ul>

Note: - First time user of above command requires a dyno restart.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

