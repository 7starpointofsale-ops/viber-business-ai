const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const upload = multer({ dest: "uploads/" });
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =======================================
// PATH
// =======================================
const DB_PATH = path.join(__dirname, "../database/price.db.json");
const ORDER_PATH = path.join(__dirname, "../database/orders.db.json");
const UPLOAD_FILE = path.join(__dirname, "../uploads/viber.jpg");

// =======================================
// INIT
// =======================================
function ensure(file, fallback){
  if(!fs.existsSync(file)){
    fs.writeFileSync(file, JSON.stringify(fallback,null,2));
  }
}

ensure(DB_PATH,{categories:[]});
ensure(ORDER_PATH,{orders:[]});

// =======================================
// CACHE
// =======================================
let cache=null;
let last=0;

function loadDB(){
  const now=Date.now();
  if(cache && now-last<3000) return cache;

  try{
    cache=JSON.parse(fs.readFileSync(DB_PATH,"utf8"));
    if(!cache.categories) cache.categories=[];
    last=now;
    return cache;
  }catch{
    return {categories:[]};
  }
}

function saveDB(data){
  cache=data;
  fs.writeFileSync(DB_PATH,JSON.stringify(data,null,2));
}

// =======================================
// STATE
// =======================================
const userState={};
const msgCache={};

// =======================================
// MENU
// =======================================
const MENU=[
  {label:"💰 ဈေးမေးမယ်", value:"price"},
  {label:"🧮 ဈေးတွက်မယ်", value:"calc"}
];

// =======================================
// CLEAN
// =======================================
function clean(t=""){
  return t.replace(/\u200B/g,"").trim().toLowerCase();
}

// =======================================
// SEND
// =======================================
async function send(id,text,kb=null){
  try{
    const body={receiver:id,type:"text",text,min_api_version:7};
    if(kb) body.keyboard=kb;

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      body,
      {headers:{"X-Viber-Auth-Token":process.env.VIBER_TOKEN}}
    );
  }catch(e){
    console.log(e.message);
  }
}

// =======================================
// KEYBOARD
// =======================================
function kb(items){
  return {
    Type:"keyboard",
    Buttons:items.map(i=>({
      Columns:3,
      Rows:1,
      ActionType:"reply",
      ActionBody:i.value,
      Text:`<font color="#fff">${i.label}</font>`,
      BgColor:"#2d3748"
    }))
  };
}

// =======================================
// REMOVE BG IMAGE
// =======================================
async function handleImage(body){
  try{
    const userId=body.sender.id;
    const url=body.message.media;

    const img=await axios.get(url,{responseType:"arraybuffer"});
    fs.writeFileSync(UPLOAD_FILE,img.data);

    const form=new FormData();
    form.append("image_file",fs.createReadStream(UPLOAD_FILE));

    const res=await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      form,
      {
        responseType:"arraybuffer",
        headers:{
          ...form.getHeaders(),
          "X-Api-Key":process.env.REMOVE_BG_KEY
        }
      }
    );

    fs.unlinkSync(UPLOAD_FILE);

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver:userId,
        type:"picture",
        media:"data:image/png;base64,"+Buffer.from(res.data).toString("base64")
      },
      {headers:{"X-Viber-Auth-Token":process.env.VIBER_TOKEN}}
    );

  }catch(e){
    console.log("IMG ERR",e.message);
  }
}

// =======================================
// ADMIN SAVE API
// =======================================
app.post("/api/prices/add",(req,res)=>{
  try{
    const db=loadDB();

    const {categoryIndex,item,size,gsm,s1,s2,noSide}=req.body;

    if(!db.categories[categoryIndex]){
      return res.json({ok:false});
    }

    db.categories[categoryIndex].items.push({
      item,
      size,
      gsm,
      s1:Number(s1||0),
      s2:Number(s2||0),
      noSide:noSide||false
    });

    saveDB(db);

    res.json({ok:true});
  }catch(e){
    res.json({ok:false});
  }
});

// =======================================
// WEBHOOK
// =======================================
app.post("/webhook",async(req,res)=>{
  res.sendStatus(200);

  try{
    const body=req.body;
    if(!body.event) return;

    // IMAGE DETECT (FIXED)
    if(body.message && body.message.media){
      return handleImage(body);
    }

    const id=body.sender.id;
    const token=id+"_"+body.message.token;

    if(msgCache[token]) return;
    msgCache[token]=true;
    setTimeout(()=>delete msgCache[token],60000);

    let msg=clean(body.message.text||"");

    if(["hi","hello","start","menu","home"].includes(msg)){
      userState[id]={};
      return send(id,"📦 7Star System",kb(MENU));
    }

    const db=loadDB();

    if(msg==="price"){
      const cats=db.categories.map((c,i)=>({
        label:`📁 ${c.name}`,
        value:`cat_${i}`
      }));
      return send(id,"📁 Category",kb(cats));
    }

    if(msg==="calc"){
      userState[id]={mode:"calc"};
      const cats=db.categories.map((c,i)=>({
        label:`📁 ${c.name}`,
        value:`cat_${i}`
      }));
      return send(id,"🧮 Category",kb(cats));
    }

    if(msg.startsWith("cat_")){
      const i=Number(msg.split("_")[1]);
      const cat=db.categories[i];
      if(!cat) return;

      const items=cat.items.map((it,x)=>({
        label:`📄 ${it.item}`,
        value:`item_${i}_${x}`
      }));

      return send(id,`📁 ${cat.name}`,kb(items));
    }

    if(msg.startsWith("item_")){
      const [_,c,i]=msg.split("_");
      const item=db.categories[c]?.items?.[i];
      if(!item) return;

      const text=
`📄 ${item.item}
📏 ${item.size||"-"}
📦 ${item.gsm||"-"}

💰 1 Side: ${item.s1}
💰 2 Side: ${item.s2}`;

      return send(id,text);
    }

    return send(id,"📦 Menu",kb(MENU));

  }catch(e){
    console.log(e.message);
  }
});

// =======================================
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log("🚀 RUNNING",PORT));