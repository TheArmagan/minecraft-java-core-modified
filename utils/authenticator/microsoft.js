let type;
let demo
if(!!process && !!process.versions && !!process.versions.electron) {
    type = 'electron';
} else if(!!process && !!process.versions && !!process.versions.nw) {
    type = 'nwjs';
} else {
    type = 'browser';
}

class Microsoft {
    constructor(/*client_id = "00000000402b5328"*/){
        // if(client_id === "") client_id = "00000000402b5328"
        this.type = type;
        this.client_id = "00000000402b5328";
    }

    async getAuth(){
      
      return this.login(await require("./GUI/nwjs.js")(this.client_id));

         
    }
    
    async login(code){
      
        let oauth2 = await fetch("https://login.live.com/oauth20_token.srf", {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `client_id=${this.client_id}&code=${code}&grant_type=authorization_code&redirect_uri=https://login.live.com/oauth20_desktop.srf&scope=service::user.auth.xboxlive.com::MBI_SSL`
      }).then(res => res.json());
  
      let refresh_date = new Date().getTime() + oauth2.expires_in * 1000;
  
  
      let xbl = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Properties: {
            AuthMethod: "RPS",
            SiteName: "user.auth.xboxlive.com",
            RpsTicket: oauth2.access_token
          },
          RelyingParty: "http://auth.xboxlive.com",
          TokenType: "JWT"
        })
      }).then(res => res.json());
  
      let xsts = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Properties: {
            SandboxId: "RETAIL",
            UserTokens: [
              xbl.Token
            ]
          },
          RelyingParty: "rp://api.minecraftservices.com/",
          TokenType: "JWT"
        })
      }).then(res => res.json());
  
      let uhs = xbl.DisplayClaims.xui[0].uhs;
  
  
      let mcLogin = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ "identityToken": `XBL3.0 x=${uhs};${xsts.Token}` })
      }).then(res => res.json());
  
      //Check if the player have the game
      let hasGame = await fetch("https://api.minecraftservices.com/entitlements/mcstore", {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${mcLogin.access_token}`
        }
      }).then(res => res.json());
  
      if(!hasGame.items.find(i => i.name == "product_minecraft" || i.name == "game_minecraft")){
        demo = true;
      }
  
  
      //Get the profile
      let profile = await fetch("https://api.minecraftservices.com/minecraft/profile", {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${mcLogin.access_token}`
        }
      }).then(res => res.json());
  
      return {
        access_token: mcLogin.access_token,
        client_token: getUUID(),
        uuid: profile.id,
        name: profile.name,
        refresh_token: oauth2.refresh_token, 
        refresh_date,
        meta: {
          type: "msa",
          demo: demo
        }
      }
    }
    
    async refresh(acc){
      let oauth2 = await fetch("https://login.live.com/oauth20_token.srf", {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=refresh_token&client_id=${this.client_id}&scope=service::user.auth.xboxlive.com::MBI_SSL&refresh_token=${acc.refresh_token}`
        }).then(res => res.json());
        
        let refresh_date = new Date().getTime() + oauth2.expires_in * 1000;
        let xbl = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    AuthMethod: "RPS",
                    SiteName: "user.auth.xboxlive.com",
                    RpsTicket: oauth2.access_token
                },
                RelyingParty: "http://auth.xboxlive.com",
                TokenType: "JWT"
            })
        }).then(res => res.json());
        
        let xsts = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    SandboxId: "RETAIL",
                    UserTokens: [
                        xbl.Token
                    ]
                },
                RelyingParty: "rp://api.minecraftservices.com/",
                TokenType: "JWT"
            })
        }).then(res => res.json());
        
        let uhs = xbl.DisplayClaims.xui[0].uhs;
        
        let mcLogin = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ "identityToken": `XBL3.0 x=${uhs};${xsts.Token}` })
        }).then(res => res.json());
        
        let profile = await fetch("https://api.minecraftservices.com/minecraft/profile", {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${mcLogin.access_token}`
            }
        }).then(res => res.json());

        return {
            access_token: mcLogin.access_token,
            client_token: getUUID(),
            uuid: profile.id,
            name: profile.name,
            refresh_token: oauth2.refresh_token, 
            refresh_date,
            meta: {
                type: "msa"
            }
        }
    }
}

function getUUID() {
    var result = ""
    for (var i = 0; i <= 4; i++) {
        result += (Math.floor(Math.random() * 16777216 )+1048576).toString(16);
        if (i < 4)result += "-"
    }
    return result;
}

module.exports = Microsoft;

