const Discord = require("discord.js");
let Bot = require("dcbot-manager");
const fs = require("fs").promises;
//const { exec } = require("child_process");
const util = require('util');
const exec = util.promisify(require('child_process').exec);


//json file wrapper class
class JsonWrapper{
    readywaiters = [];
    constructor(path){
        this.init(path);
    }
    async init(path){
        this.path = path;
        await this.sync();
        this.isReady = true;
        this.readywaiters.map(r=>r());
    }
    async sync(){
        this.cache = JSON.parse((await fs.readFile(this.path)).toString());
    }
    ready(){
        let that = this;
        return new Promise((res,rej)=>{
            if(this.isReady){
                res();
            }
            that.readywaiters.push(res);
        });
    }
    //ykw fuck the parser I don't need it
    /*
    pathParser(path){
        let p = [];
        if(path.match(/^[a-zA-Z]/)){
            path = "."+path;
        }
        while(path.length > 0){
            if(path[0] === "."){
                path = path.slice(1);
                let id = path.match(/^[a-zA-Z][a-zA-Z0-9]/)[0];
                p.push(id);
            }
        }
        for(let i = 0; i < path.length; i++){
            let c = path[i];
            if(c === "."){//member access
                
            }else if(c === "["){
                let c1 = path[i+1]; 
                if(c1 === "\""){
                    
                }else if(c1.match(/[0-9]/)){//number indexing
                    
                }
            }
        }
    }*/
    async save(){
        await this.ready();
        return await fs.writeFile(this.path,JSON.stringify(this.cache));
    }
};



let getClient = function(Discord){
    let flags = Discord.Intents.FLAGS;
    const client = new Discord.Client({
        intents: [
            /*
                Intents 'GUILDS' is required
                if you wish to receive (message) events
                from guilds as well.
    
                If you don't want that, do not add it.
                Your bot will only receive events
                from Direct Messages only.
            */
            'GUILDS',
            'DIRECT_MESSAGES',
            'GUILD_MESSAGES'
        ],
        partials: ['MESSAGE', 'CHANNEL'] // Needed to get messages from DM's as well
    }/*{
        intents: [
            flags.GUILDS, flags.GUILD_MESSAGES
        ] //["GUILDS", "GUILD_MESSAGES"]
    }*/);
    return client;
};


const client = getClient(Discord);
require("dotenv").config();
client.login(process.env.TOKEN);



//Promise.all() in the main function
let initConfig = async function(){
    let config = new JsonWrapper("metadata.json");
    await config.ready();
    console.log(config.cache);
    //initialization
    if(config.cache.state === "uninitialized"){
        config.cache.id = (Math.random()*10000000000000000).toString(36);
        //config.alias; this is unset in the first stage
        config.cache.state = "ready";
        await config.save();
    }
    return config;
};


/*
let initBot = async function(){
    
};*/

let getIP = async function(){
    try{
        const { stdout, stderr } = await exec("curl -s ifconfig.me");
        if (stderr) {
            console.log("stderr output from curl: "+stderr);
        }
        return stdout;
    }catch(err){
        return "entounter an error executing curl: "+err;
    }
    /*return new Promise((res,rej)=>{
        exec("curl -s ifconfig.me", (error, stdout, stderr) => {
            if (error) {
                res("entounter an error executing curl: "+error);//return back the error
            }else if (stderr) {
                console.log("stderr output from curl: "+stderr);
            }
            res(stdout);
        });
    });*/
};

let genericCommand = async function(name,cmd,msg,substr){
    try{
        const {stdout,stderr} = await exec(cmd);
        if (stderr) {
            msg.reply(`${name}> stderror: ${stderr}`);
        }
        msg.reply(`${name}> success. stdout: ${stdout}`);
    }catch(err){
        msg.reply(`${name}> ${cmd} Error: ${(""+err).slice(0,1900)}`);
    }
};

let splitEscape = function(str,delim){//consecutive delim will result in empty string
    let arr = [];
    let head = "";
    for(let i = 0; i < str.length; i++){
        if(str[i] === delim){
            arr.push(head);
            head = "";
        }else if(str[i] === "\\"){
            i++;
            if(i === str.length){
                head += "\\";
            }else{
                head += str[i];
            }
        }else{
            head += str[i];
        }
    }
    arr.push(head);
    return arr;
};
let splitMatch = function(str,reg){
    let match = str.match(reg);
    if(match === null)return ["",str];
    let head = match[0];
    let rest = str.slice(match[0].length);
    return [head,rest];
};

let parseFlags = function(str){
    try{
        let segs0 = splitEscape(str,"-");
        //fix double dash
        let segs = [];
        for(let i = 0; i < segs0.length; i++){
            if(segs0[i] === ""){
                i++;
                if(i === segs0.length){
                    //ignore it if dash at the end
                }else{
                    segs.push("-"+segs0[i]);
                }
            }else{
                segs.push(segs0[i]);
            }
        }
        console.log(segs);
        let head = segs[0];//head argument, ignore in this case
        segs = segs.slice(1);
        let flags = {};
        for(let i = 0; i < segs.length; i++){
            let seg = segs[i].trim();
            if(seg.length === 0)continue;
            if(seg[0] === "-"){//long flag format
                let id,rest;
                [id,rest] = splitMatch(seg,/^\-\S+/);
                id = id.slice(1);
                rest = rest.trim();
                flags[id] = rest;
            }else{//short flag format
                let id,rest;
                [id,rest] = splitMatch(seg,/^\S+/);
                rest = rest.trim();
                for(let i = 0; i < id.length; i++){
                    flags[id[i]] = "";
                }
                flags[id[id.length-1]] = rest;
            }
        }
        return flags;
    }catch(err){
        console.log("parse flags error, defaulting to empty object: ",err);
        return {};
    }
};




let main = async function(){
    let config = await initConfig();
    let getName = function(){
        return "alias" in config.cache ? config.cache.alias : config.cache.id;
    };
    let idExists = ()=>"id" in config.cache;
    let aliasExists = ()=>"alias" in config.cache;
    
    let bot = (new Bot(client,"/"));
    
    let initmsgs = [];
    bot.onReady(()=>{
        console.log(`Logged in as ${client.user.tag}!`);
    });
    
    let selected = false;
    bot.sub("lsid").addFunc(async (msg,substr)=>{
        let flags = parseFlags(substr);
        console.log(substr,flags);
        console.log(selected);
        if("selected" in flags && !selected){// /lsid --selected
            return;//if not selected do nothing
        }
        msg.reply(
            `id: ${config.cache.id}\n`+
            `alias: ${config.cache.alias}`+
            ("ip" in flags ? `\nip: ${await getIP()}` : "")
        );
    });//list the id of the servers
    bot.sub("select").addFunc(async (msg,substr)=>{
        substr = substr.trim();
        let flags;
        if(substr[0] === "-"){
            flags = parseFlags(substr);
        }else{
            [arg,rest] = splitMatch(substr,/^\S+/);
            flags = parseFlags(rest);
            flags.idalias = arg;
        }
        console.log(substr);
        console.log(flags);
        if("idalias" in flags){
            selected = 
                (idExists() && (config.cache.id === flags.idalias)) ||
                (aliasExists() && (config.cache.alias === flags.idalias));
        }else if("id" in flags){
            selected = idExists() && (config.cache.id === flags.id);
        }else if("alias" in flags){
            selected = aliasExists() && (config.cache.alias === flags.alias);
        }
        if(selected)msg.reply(`${getName()}> selected`);
    });
    //selective commands
    bot.sub("selected").addFunc((msg,substr)=>{
        if(!selected)return;
        msg.reply(
            `${getName()}> under select`
        );
    });
    bot.sub("unselect").addFunc((msg,substr)=>{
        if(!selected)return;
        selected = false;
        msg.reply(
            `${getName()}> unselected`
        );
    });
    bot.sub("ip").addFunc(async (msg,substr)=>{
        if(!selected)return;
        msg.reply(
            `${getName()}> ip: ${await getIP()}`
        );
    });
    bot.sub("alias").addFunc(async (msg,substr)=>{
        if(!selected)return;
        let alias = substr.trim();
        if(alias === ""){
            msg.reply(
                `${getName()}> alias can't be empty string not spaces`
            );
            return;
        }
        let old = config.cache.alias;
        config.cache.alias = alias;
        await config.save();
        msg.reply(
            `${getName()}> alias changed from "${old}" to "${getName()}"`
        );
    });
    bot.sub("github").addFunc(async (msg,substr)=>{
        if(!selected)return;
        msg.reply(
            `${getName()}> https://github.com/martian17/ip_reporter`
        );
    });
    bot.sub("reload").addFunc(async (msg,substr)=>{
        if(!selected)return;
        msg.reply(
            `${getName()}> Reloading, select again when it comes back online`
        );
        throw new Error("random uncaught error");
    });
    bot.sub("pull").addFunc(async (msg,substr)=>{
        if(!selected)return;
        try{
            const {stdout,stderr} = await exec("git pull origin main");
            if (stderr) {
                msg.reply(`${getName()}> stderror: ${stderr}`);
            }
            msg.reply(`${getName()}> Pull success. stdout: ${stdout}`);
        }catch(err){
            msg.reply(`${getName()}> pull error: ${error}`);
        }
    });
    bot.sub("ping").addFunc(async (msg,substr)=>{
        if(!selected)return;
        msg.reply(
            `${getName()}> Pong!`
        );
    });
    bot.sub("inspect").addFunc(async (msg,substr)=>{
        if(!selected)return;
        msg.reply(
            `${getName()}> ${JSON.stringify(msg)}`
        );
    });
    let npm = bot.sub("npm");
    npm.sub("update").addFunc(async (msg,substr)=>{
        if(!selected)return;
        await genericCommand(getName(),"npm update",msg,substr);
    });
    npm.sub("list").addFunc(async (msg,substr)=>{
        if(!selected)return;
        await genericCommand(getName(),"npm list",msg,substr);
    });
};

main();
