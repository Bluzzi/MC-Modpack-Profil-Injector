// Modules :
const fs = require("fs");
const axios = require("axios").default;
const http = require("http");
const child_process = require("child_process");

const AdmZip = require("adm-zip");

// Inject type :

const INJECT_NEW_MODS = "Télécharger les nouveaux mods";
const INJECT_CHANGE_RAM = "Changer la ram dédiée";
const INJECT_COMPLETE = "Injecter";

// Paths :
let modpackPath = process.env.APPDATA + "/royaume-modpack/";
let minecraftPath = process.env.APPDATA + "/.minecraft/";

// Define the button text and get servers mod list :
let serverMods, notInstalledMods;

let button = document.getElementById("button");
let infoBar = document.getElementById("info-bar");

defineButtonText();

async function defineButtonText(){
    serverMods = (await axios.get("http://symp.fr/royaume-server/mods-list.php")).data.split("*");

    if(fs.existsSync(modpackPath)){
        let installedMods = fs.readdirSync(modpackPath + "mods/");

        notInstalledMods = serverMods.filter(mod => !installedMods.includes(mod));

        if(notInstalledMods.length > 0){
            button.textContent = INJECT_NEW_MODS;

            document.getElementById("info-bar").textContent = notInstalledMods.map(
                modName => modName.substr(0, modName.length - 4)
            ).join(", ");
        } else {
            button.textContent = INJECT_CHANGE_RAM;
        }    
    } else {
        button.textContent = INJECT_COMPLETE;
    }

}

// Function for injection :

let injectionStarted = false;
let percent = 0;

/**
 * @param {HTMLElement} button 
 */
async function inject(){
    // Check if injection has started :
    if(injectionStarted) return;
    injectionStarted = true;

    // Set the button background transparent :
    button.style.backgroundColor = "transparent";

    // Injection :
    switch(button.textContent){
        case INJECT_NEW_MODS:
            // Change ram :
            infoBar.textContent = "mise à jour de la mémoire dédiée...";
            updateMemory();
            updateSlider(5);

            // Inject the new mods :
            let downloadedCount = 0;

            for(let key in notInstalledMods){
                let modName = notInstalledMods[key];

                http.get("http://symp.fr/royaume-server/mods/" + modName, res => {
                    res.pipe(fs.createWriteStream(modpackPath + "mods/" + modName)).on("close", () => {
                        infoBar.textContent = "téléchargement du mod " + modName.substr(0, modName.length - 4) + " terminé";
                        updateSlider(5 + Math.round(downloadedCount++ / notInstalledMods.length * 95));

                        if(downloadedCount === notInstalledMods.length) configureMinecraftProfil();
                    });
                });
            }
        break;

        case INJECT_CHANGE_RAM:
            infoBar.textContent = "mise à jour de la mémoire dédiée...";
            updateMemory();
            updateSlider(100);

            setTimeout(() => {
                infoBar.textContent = "lancement de Minecraft...";

                startMinecraft();
            }, 1000);
        break;

        case INJECT_COMPLETE:
            // Create folder :
            infoBar.textContent = "création du dossier...";
            fs.mkdirSync(modpackPath);
            updateSlider(8);

            // Download mod files :
            infoBar.textContent = "téléchargement des fichiers du mod en zip...";
            http.get("http://symp.fr/royaume-server/modpack.zip", async response => {
                response.pipe(fs.createWriteStream(modpackPath + "modfiles.zip")).on("close", () => {
                    updateSlider(15);

                    // Unzip mod files :
                    infoBar.textContent = "Unzip des fichiers du mod...";
                    (new AdmZip(modpackPath + "modfiles.zip")).extractAllTo(modpackPath, true);
                    updateSlider(18);

                    // Remove zip :
                    infoBar.textContent = "suppression du fichier zip...";
                    fs.unlinkSync(modpackPath + "modfiles.zip");
                    updateSlider(24);

                    // Create mods folder :
                    infoBar.textContent = "creation du dossier des mods...";
                    fs.mkdirSync(modpackPath + "mods/");
                    updateSlider(25);

                    // Download all mods :
                    infoBar.textContent = "lancement du téléchargement des mods..."; 

                    let downloadedCount = 0;

                    for(let key in serverMods){
                        let modName = serverMods[key];

                        http.get("http://symp.fr/royaume-server/mods/" + modName, res => {
                            res.pipe(fs.createWriteStream(modpackPath + "mods/" + modName)).on("close", () => {
                                infoBar.textContent = "téléchargement du mod " + modName.substr(0, modName.length - 4) + " terminé";
                                updateSlider(25 + Math.round(downloadedCount++ / serverMods.length * 70));

                                if(downloadedCount === serverMods.length) configureMinecraftProfil();
                            });
                        });
                    }
                });
            });
        break;
    }
}

function configureMinecraftProfil(){
    // Creating profil :
    infoBar.textContent = "configuration du profil minecraft...";

    let data = JSON.parse(fs.readFileSync(minecraftPath + "/launcher_profiles.json"));
    let memory = document.getElementById("memory").value;

    data.profiles["royaume-modpack"] = {
        gameDir: modpackPath,
        javaArgs: "-Xmx" + memory + "m -Xms256m -XX:PermSize=256m -Dminecraft.applet.TargetDirectory=\"" 
            + modpackPath +  "/modpack\" -Dfml.ignorePatchDiscrepancies=true " 
            + "-Dfml.ignoreInvalidMinecraftCertificates=true -Duser.language=en -Duser.country=US",
        lastVersionId: "forge-12.18.3.2422",
        name: "Royaume Modpack",
        type: "custom"
    }
  
    fs.writeFileSync(minecraftPath + "/launcher_profiles.json", JSON.stringify(data, null, 4));
    updateSlider(97);

    // Download forge :
    let versionPath = minecraftPath + "versions/forge-12.18.3.2422/";

    if(!fs.existsSync(versionPath)){
        fs.mkdirSync(versionPath);

        http.get("http://symp.fr/royaume-server/forge-12.18.3.2422.json", async response => {
            response.pipe(fs.createWriteStream(versionPath + "/forge-12.18.3.2422.json")).on("close", () => {
                updateSlider(100);
                configurationCompleted();
            });
        });
    } else {
        updateSlider(100);
        configurationCompleted();
    }
}

function configurationCompleted(){
    infoBar.textContent = "installation terminé, lancement du jeu...";

    startMinecraft();
}

function startMinecraft(){
    child_process.exec("start " + modpackPath + "MinecraftLauncher.exe");

    setTimeout(() => this.close(), 5000);
}

function updateMemory(){
    let data = JSON.parse(fs.readFileSync(minecraftPath + "/launcher_profiles.json"));
    let memory = document.getElementById("memory").value;

    data.profiles["royaume-modpack"].javaArgs = "-Xmx" + memory + "m -Xms256m -XX:PermSize=256m -Dminecraft.applet.TargetDirectory=\"" 
        + modpackPath +  "/modpack\" -Dfml.ignorePatchDiscrepancies=true " 
        + "-Dfml.ignoreInvalidMinecraftCertificates=true -Duser.language=en -Duser.country=US",
  
    fs.writeFileSync(minecraftPath + "/launcher_profiles.json", JSON.stringify(data, null, 4));
}

// Slider manager functions :

/**
 * @param {int} newPercent 
 */
function updateSlider(newPercent){
    let interval = setInterval(() => {
        if(newPercent > percent) percent++;

        button.style.backgroundImage = "linear-gradient(90deg, #479747 " + percent + "%, transparent 0%)";
        button.textContent = percent + "%";

        if(percent === newPercent) clearInterval(interval);
    }, 10);
}