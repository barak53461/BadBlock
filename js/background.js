//sets initial values on extension install of global variables 
const REGEXJSFILTER = /[a-zA-Z0-9_:/.-]+\.js/mg;
const INITIALBLURVALUE = 1.0;
const DEFULTMODE = "block";
const DEFULTPCMODE = true;
const FILTER = {urls: ["<all_urls>"]}; // urls to FILTER
const OPT_EXREAINFOSPEC = ["blocking"];
const SERVERURL = "http://127.0.0.1:8080";
const LOCALSCRIPTLIST = ["settings.js","popup.js"];
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

var activeAlarm = false; //boolean to remember wheter a timer is already active
function handelTimer(length){
  if(activeAlarm)
  {return;}
  activeAlarm = true;//symbols starting a new timer
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
      updatekarma(message['nodeid'],message['isad']);  
      sendResponse("Updated Server");
    }
    else if(message['type'] === 'timer')
    {
      handelTimer(message['length']);
      sendResponse("Started timer");
    }
  }
);


function QuarryToServer(){
  $.ajax({
    type: "GET",
    async: true,
    form: 'formatted',
    url: SERVERURL,
    success: function (data) {
      chrome.runtime.onMessage.addListener(
      function (message, sender, sendResponse) {
        if(message['type'] === 'startUp')// sets up a listner that sends the data from the server to startUp requests
        {
          console.log(data);
          sendResponse(data);
        }
      });
    },
    fail: function () { console.error("error quarrying server"); }
  });
}

function handelIcon() {// changes the icon's image to green if the addon is turned off
  chrome.storage.onChanged.addListener(function(changes,namespace){
    if(changes.mode == undefined)// checks if it was the mode value that was changed
    {return;}
    mode = changes.mode.newValue;
    if(mode === "off")
    {
      chrome.browserAction.setIcon({path:"../resources/images/addblock_off.png"});
      return;
    }
    chrome.browserAction.setIcon({path:"../resources/images/addblock.png"});
  });
}

function checkIfScriptLocal(url) { // recives a request's url and returns true if its our own scripts  
  return url.includes(LOCALSCRIPTLIST[0]) || url.includes(LOCALSCRIPTLIST[1]);
}

//from here we will block incoming scripts that target ads to us
function handeladblock(){
  console.log("blocking scripts")
  chrome.storage.sync.get('mode', function({mode}){ 
    chrome.storage.onChanged.addListener(function(changes,namespace){
      if(changes.mode == undefined)
      {return;}
      mode = changes.mode.newValue;
    });
    chrome.webRequest.onBeforeRequest.addListener(function(details){
      //sets up a listner that fires before request's 
      if(checkIfScriptLocal(details.url) || mode !== 'block') // exits function if the request is local or if the addon is off
      {return;} 

      var cancel = null;
      urllst.forEach(url => {// goes over the urls we have and compares them to the 
                             // current request if they are the same blocks the request
        if(details.url.includes(url))
        {
          console.log(details.url);
          cancel = {cancel: true};    
        }
      });
      if(cancel != null)
      {
        return cancel;
      }
    }, FILTER, OPT_EXREAINFOSPEC);        
  });
}

function fillurllst(){
    console.time("Loading script list and setting listener took");
    jQuery.get('https://easylist.to/easylist/easylist.txt', function(data) {// gets the scripts from easylist by the 
                                                                            // regex filter and saves it to urllist
      urllst = data.match(REGEXJSFILTER);
      console.timeEnd("Loading script list and setting listener took");
    });
}

console.log("running func");
QuarryToServer();
fillurllst();
handeladblock();
handelIcon();
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {// recives a node removed by a user and 
                                           // sends a messge to the server to add it 
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
