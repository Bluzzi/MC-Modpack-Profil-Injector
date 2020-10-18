const { app, BrowserWindow } = require("electron");
const convertSass = require("sass-folder-converter");

convertSass(__dirname + "/assets/sass/", __dirname + "/assets/css/", "compressed");

function createMainWindow(){
    const window = new BrowserWindow({
        width: 1200,
        minWidth: 700,
        height: 700,
        minHeight: 500,
        icon: "./assets/images/icon.png",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
        }
    });

    window.loadFile("./views/index.html");
}

app.whenReady().then(createMainWindow);