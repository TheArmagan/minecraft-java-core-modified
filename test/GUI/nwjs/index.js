const {launch, microsoft} = require('minecraft-java-core');
const fs = require('fs');
const login = require('../../login.json');
const Microsoft = new microsoft()
const launcher = new launch();

async function authenticate(){
    fs.writeFileSync(`../../login.json`, JSON.stringify(await Microsoft.getAuth(), true, 4), 'UTF-8')
    // let opts = {
    //     url: "http://146.59.227.140/fabric/",
    //     authorization: await Microsoft.getAuth(),
    //     path: "../../.Minecraft",
    //     version: "1.18.1",
    //     detached: true,
    
    //     java: true,
    //     args: [],
    //     custom: false,
    
    //     server: {
    //         ip: "127.0.0.1",
    //         port: 25565,
    //         autoconnect: false
    //     },
    
    //     verify: false,
    //     ignored: ["options.txt", "logs", "optionsof.txt", "saves"],
    
    //     memory: {
    //         min: `2G`,
    //         max: `4G` 
    //     }
    // }
    
    // launcher.launch(opts)
    
    // launcher.on('progress', (DL, totDL) => {
    //     console.log(`${(DL / 1067008).toFixed(2)} Mb to ${(totDL / 1067008).toFixed(2)} Mb`);
    // });
    
    
    // // launcher.on('speed', (speed) => {
    // //     console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
    // // })
    
    // launcher.on('estimated', (time) => {
    //     let hours = Math.floor(time / 3600);
    //     let minutes = Math.floor((time - hours * 3600) / 60);
    //     let seconds = Math.floor(time - hours * 3600 - minutes * 60);
    //     console.log(`${hours}h ${minutes}m ${seconds}s`);
    // })
    
    
    // launcher.on('data', (e) => {
    //     console.log(e)
    // })
    
    // // launcher.on('close', () => {
    // //     console.clear();
    // //     console.log("game closed");
    // // })
}

authenticate()









