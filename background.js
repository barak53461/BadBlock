//sets initial values on extension install of global variables 
const REGEXJSFILTER = /[a-zA-Z0-9_:/.-]+\.js/mg;
const INITIALBLURVALUE = 1.0;
const DEFULTMODE = "block";
const DEFULTPCMODE = true;
const FILTER = {urls: ["<all_urls>"]}; // urls to FILTER
const OPT_EXREAINFOSPEC = ["blocking"];
const SERVERURL = "http://127.0.0.1:8080";
var urllst = [];

chrome.runtime.onInstalled.addListener(function() {
    //sets the initianl values to predeclared constants
    chrome.storage.sync.set({'mode': DEFULTMODE}, function() {
      console.log(`adblock set mode to ${DEFULTMODE}`);
    });
    chrome.storage.sync.set({'blur': INITIALBLURVALUE}, function() {
      console.log(`deafult blur set to ${INITIALBLURVALUE}rem`);
    });
    chrome.storage.sync.set({'pclist': []}, function() {
      console.log(`defined empty parental control list in storage`);
    });
    chrome.storage.sync.set({'pclistMode': DEFULTPCMODE}, function() {
      console.log(`defined parent control mode : ${DEFULTPCMODE}`);
    });
    chrome.storage.sync.set({'whitelist': ['spacesaver']},function(){
      console.log('made an empty whitelist');
    });  
});

function updatekarma(nodeid, isad) { 
  //sends a messege to the server to raise or lower the karma of a node that was discovered during browsing
  $.ajax({
    type: "post",
    data: {'type': 'manuelfound' ,'nodeid': nodeid, 'isad': isad},
    url: SERVERURL,
    success: function (data) {
      console.log(data);
    }
  });
}
var activeAlarm = false;
function handelTimer(length){
  if(activeAlarm)
  {return;}
  activeAlarm = true;
  chrome.alarms.create("turnon", {delayInMinutes:parseInt(length["hours"])*60+parseInt(length["minutes"])});
  chrome.storage.sync.set({'mode': 'off'}, function() {});
  chrome.alarms.onAlarm.addListener(function (alarm){
    chrome.storage.sync.set({'mode': 'block'}, function() {});
    activeAlarm = false;
    chrome.alarms.clear("turnon");
  })
}
chrome.runtime.onMessage.addListener(
  //recives the karma messege and passes the arguments to the karma handeler
  function(message, sender, sendResponse) {
    if(message['type'] === 'manuelfound')
    {
      updatekarma(message['nodeid'],message['isad'])  
    }
    else if(message['type'] === 'timer')
    {
      handelTimer(message['length']);
    }
  }
);
/*
function setmclisten(message, sender, sendResponse) {
  console.log(data);
  if(message['type'] === 'startUp')
  {
    console.log(data);
    sendResponse(data)
  }
}
function QuarryToServer(){
  chrome.runtime.onMessage.removeListener(setmclisten);
  $.ajax({
    type: "GET",
    async: true,
    form: 'formatted',
    url: SERVERURL,
    success: function (data) {
      //sends a get 
      console.log("set startup listener");
      debugger;
      chrome.runtime.onMessage.addListener(setmclisten);
    },
    fail: function () { console.error("error quarrying server"); }
  });
}
QuarryToServer();
*/
function setmclisten(message, sender, sendResponse, data) { // *** Note `data` param
                                                            // at end
  console.log(data);
  if(message['type'] === 'startUp')
  {
    console.log(data);
    sendResponse(data)
  }
}
let lastListener = null; // *** Remember the last listener
function QuarryToServer(){
  // *** Remove the last listener if any
  if (lastListener) {
      chrome.runtime.onMessage.removeListener(lastListener);
      lastListener = null;
  }
  $.ajax({
    type: "GET",
    async: true,
    form: 'formatted',
    url: SERVERURL,
    success: function (data) {
      //sends a get 
      console.log("set startup listener");
      // *** Create a new listener and attach it
      lastListener = function(message, sender, sendResponse) {
          return setmclisten(message, sender, sendResponse, data);
          // *** Or if `this` is important in the call:
          // return setmclisten.call(this, message, sender, sendResponse, data);
      };
      chrome.runtime.onMessage.addListener(lastListener);
    },
    fail: function () { console.error("error quarrying server"); }
  });
}
QuarryToServer();

function handelIcon() {
  chrome.storage.onChanged.addListener(function(changes,namespace){
    mode = changes.mode.newValue;
    if(mode === "off")
    {
      chrome.browserAction.setIcon({path:"/images/addblock_off.png"});
      return;
    }
    chrome.browserAction.setIcon({path:"images/addblock.png"});
  });
}

//from here we will block incoming scripts that target ads to us
function handeladblock(){
  console.log("blocking scripts")
  chrome.storage.sync.get('mode', function({mode}){ 
    chrome.storage.onChanged.addListener(function(changes,namespace){
      mode = changes.mode.newValue;
    });
    chrome.webRequest.onBeforeRequest.addListener(function(details){
      //sets up a listen to compare current request to saved ads request and blocks it since it compares it alot of times it causes a slight lag
      if(mode !== 'block')
      {return;}

      var cancel = null;
      urllst.forEach(url => {
        if(!details.url.includes("popup.js") && details.url.includes(url))
        {
          console.log(details.url);
          cancel = {cancel: true};    
        }
      });
      if(cancel != null)
      {
        return cancel
      }
    }, FILTER, OPT_EXREAINFOSPEC);        
  });
}


function fillurllst(){
    console.time("Loading script list and setting listener took")
    jQuery.get('https://easylist.to/easylist/easylist.txt', function(data) {
    urllst = data.match(REGEXJSFILTER)
    console.timeEnd("Loading script list and setting listener took")
    });
}

console.log("running func");
//fillurllst();
handeladblock();
handelIcon();
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    debugger;
    if(message['type'] == 'manuelAd')
    {
      $.ajax({
        type: "post",
        data: {'type': 'remove' ,'removead' : message["ad"]},
        url: SERVERURL,
        success: function (data) {
          console.log(data);
        }
      });
    }
  }
);
