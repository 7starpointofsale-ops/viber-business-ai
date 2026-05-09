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
const ORDER_DB = path.join(__dirname, "../database/orders.db.json");

// =======================================
// STATIC
// =======================================
app.use("/admin", express.static(path.join(__dirname, "../admin")));

// =======================================
// INIT FILES
// =======================================
function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

ensureFile(DB_PATH, { categories: [] });
ensureFile(ORDER_DB, { orders: [] });

// =======================================
// CACHE
// =======================================
let dbCache = null;
let lastLoad = 0;

function loadDB() {
  const now = Date.now();
  if (dbCache && now - lastLoad < 3000) return dbCache;

  try {
    dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!dbCache.categories) dbCache.categories = [];
    lastLoad = now;
    return dbCache;
  } catch {
    return { categories: [] };
  }
}

// =======================================
// SAVE DB (IMPORTANT)
// =======================================
function saveDB(data){
  dbCache = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// =======================================
// STATE
// =======================================
const userState = {};
const recentMessages = {};

// =======================================
// TRIGGERS
// =======================================
const HOME_TRIGGERS = new Set([
  "hi","hello","start","menu","home","back","မင်္ဂလာပါ"
]);

const SERVICE_MENU = [
  { label: "💰 ဈေးမေးမယ်", value: "service_price" },
  { label: "🧮 ဈေးတွက်မယ်", value: "service_calc" }
];

const commandMap = {
  "ဈေးတွက်မယ်":"service_calc",
  "ဈေးမေးမယ်":"service_price",
  "calc":"service_calc",
  "price":"service_price"
};

// =======================================
// CLEAN
// =======================================
function normalizeText(text="") {
  return text.replace(/\u200B/g,"").trim().toLowerCase();
}

function normalizeNumber(msg="") {
  const map = {
    "၀":"0","၁":"1","၂":"2","၃":"3","၄":"4",
    "၅":"5","၆":"6","၇":"7","၈":"8","၉":"9"
  };
  return msg.split("").map(c => map[c] ?? c).join("");
}

function isNumber(msg){
  return /^\d+$/.test(normalizeNumber(msg));
}

function formatPrice(n){
  return Number(n||0).toLocaleString();
}

function safe(v){
  return (v===undefined||v===null||v==="") ? "-" : v;
}

// =======================================
// SEND VIBER
// =======================================
async function send(userId, text, keyboard=null){
  try {
    const body = {
      receiver: userId,
      type: "text",
      text,
      min_api_version: 7
    };

    if(keyboard) body.keyboard = keyboard;

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      body,
      {
        headers: {
          "X-Viber-Auth-Token": process.env.VIBER_TOKEN
        }
      }
    );
  } catch(e){
    console.log("SEND ERROR:", e.message);
  }
}

// =======================================
// KEYBOARD
// =======================================
function kb(items){
  return {
    Type:"keyboard",
    DefaultHeight:false,
    Buttons: items.map(i=>({
      Columns:3,
      Rows:1,
      BgColor:"#2d3748",
      ActionType:"reply",
      ActionBody:i.value,
      Text:`<font color="#fff">${i.label}</font>`
    }))
  };
}

// =======================================
// SMART SEARCH
// =======================================
function findItemSmart(db,msg){
  let best=null,bestScore=0;
  const tokens=msg.split(" ");

  db.categories.forEach(c=>{
    (c.items||[]).forEach(i=>{
      let score=0;

      const name=(i.item||"").toLowerCase();
      const size=(i.size||"").toLowerCase();
      const gsm=(i.gsm||"").toLowerCase();

      tokens.forEach(t=>{
        if(name.includes(t)) score+=5;
        if(size.includes(t)) score+=3;
        if(gsm.includes(t)) score+=2;
      });

      if(score>bestScore){
        bestScore=score;
        best=i;
      }
    });
  });

  return best;
}

// =======================================
// 🔥 ADMIN SAVE API (FIXED)
// =======================================
app.post("/api/prices/add",(req,res)=>{
  try {
    const db = loadDB();

    const {
      categoryIndex,
      item,
      size,
      gsm,
      s1,
      s2,
      noSide,
      lamination,
      remark
    } = req.body;

    if(!db.categories[categoryIndex]){
      return res.json({ok:false,message:"Category not found"});
    }

    db.categories[categoryIndex].items.push({
      item,
      size,
      gsm,
      s1:Number(s1||0),
      s2:Number(s2||0),
      noSide:noSide||false,
      lamination:lamination||"",
      remark:remark||""
    });

    saveDB(db);

    res.json({ok:true});

  } catch(e){
    console.log("SAVE ERROR:", e.message);
    res.json({ok:false});
  }
});

// =======================================
// REMOVE BG + IMAGE HANDLER
// =======================================
async function handleImage(body){
  try {
    const userId = body.sender.id;
    const imageUrl = body.message.media;

    const img = await axios.get(imageUrl,{responseType:"arraybuffer"});

    const filePath = path.join(__dirname,"../uploads/viber.jpg");
    fs.writeFileSync(filePath,img.data);

    const form = new FormData();
    form.append("image_file",fs.createReadStream(filePath));

    const bg = await axios.post(
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

    fs.unlinkSync(filePath);

    await axios.post(
      "https://chatapi.viber.com/pa/send_message",
      {
        receiver:userId,
        type:"picture",
        media:"data:image/png;base64," + Buffer.from(bg.data).toString("base64")
      },
      {
        headers:{
          "X-Viber-Auth-Token":process.env.VIBER_TOKEN
        }
      }
    );

  } catch(e){
    console.log("IMAGE ERROR:",e.message);
  }
}

// =======================================
// WEBHOOK
// =======================================
app.post("/webhook", async (req,res)=>{
  res.sendStatus(200);

  try {
    const body=req.body;
    if(body.event!=="message") return;

    if(body.message.type==="picture"){
      await handleImage(body);
      return;
    }

    const userId=body.sender.id;

    const msgToken=userId+"_"+body.message.token;
    if(recentMessages[msgToken]) return;

    recentMessages[msgToken]=true;
    setTimeout(()=>delete recentMessages[msgToken],30000);

    let msg = normalizeText(body.message.text||"");
    msg = commandMap[msg] || msg;
    msg = normalizeNumber(msg);

    const db = loadDB();
    const state = userState[userId];

    if(HOME_TRIGGERS.has(msg)){
      delete userState[userId];
      await send(userId,"📦 7Star System",kb(SERVICE_MENU));
      return;
    }

    if(msg==="service_price"){
      const cats=db.categories.map((c,i)=>({
        label:`📁 ${c.name}`,
        value:`cat_${i}`
      }));
      await send(userId,"📁 Category",kb(cats));
      return;
    }

    if(msg==="service_calc"){
      userState[userId]={mode:"calc"};
      const cats=db.categories.map((c,i)=>({
        label:`📁 ${c.name}`,
        value:`cat_${i}`
      }));
      await send(userId,"🧮 Category",kb(cats));
      return;
    }

    if(msg.startsWith("cat_")){
      const idx=Number(msg.replace("cat_",""));
      const cat=db.categories[idx];
      if(!cat) return;

      const items=cat.items.map((it,i)=>({
        label:`📄 ${it.item}`,
        value:`item_${idx}_${i}`
      }));

      await send(userId,`📁 ${cat.name}`,kb(items));
      return;
    }

    if(msg.startsWith("item_")){
      const p=msg.split("_");
      const item=db.categories?.[p[1]]?.items?.[p[2]];
      if(!item) return;

      let text=`📄 ${item.item}\n📏 ${safe(item.size)}\n📦 ${safe(item.gsm)}`;

      if(item.noSide){
        text+=`\n\n💰 Price:\n${formatPrice(item.s1)} Ks`;
      }else{
        text+=`\n\n💰 1 Side:\n${formatPrice(item.s1)} Ks\n\n💰 2 Side:\n${formatPrice(item.s2)} Ks`;
      }

      await send(userId,text);
      return;
    }

    await send(userId,"📦 Select Service",kb(SERVICE_MENU));

  } catch(e){
    console.log("WEBHOOK ERROR:", e.message);
  }
});

// =======================================
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log("🚀 SYSTEM RUNNING ON",PORT));