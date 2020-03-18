const DELETE_IMGS_CLASS = "deleteimgs";
const BLOCKED_WORDS_STORAGE_NAME = "pclist";
const BLOCKED_WORDS_LIST_ID = "blockedWordsList";
const YOUTUBER_LIST_ID = 'youtuberList';
const YOUTUBER_LIST_STORAGE_NAME = 'ytlist';

function offTimer(){// obtains the minutes and hours to wait
                    // and passes the time with the appropriate message type to background
    var time = {"hours":$("#thours").val(), "minutes": $("#tminutes").val()};
    if(time["hours"] == "")
    {time['hours'] = 0;}
    if(time["minutes"] == "")
    {time['minutes'] = 0;}
    chrome.runtime.sendMessage({type: "timer","length": time}, function() {
       console.log("passed time to background.js"); 
    });
}

function createDeleteElement(listid, node1, text, storageName) {// creates the deletion element and 
                                                                // gives it the appropriate attributes
    var deletenode = document.createElement("img");
    deletenode.id = listid + "Word" + $(listid).children().length+1;
    deletenode.src = "../resources/images/xicon.png";
    deletenode.align = "middle";
    deletenode.classList.add(DELETE_IMGS_CLASS);
    deletenode.onclick = createDeleteFunction(node1,text,storageName);
    return deletenode;
 }

function appendtolist(listid, text, storageName){// gets a list and text adds it to the list with
                                                 // the appropriate sub elements and attributes
    var node1=document.createElement("li");
    var textnode1=document.createTextNode(text);
    var deletenode = createDeleteElement(listid,node1,text,storageName);
    node1.appendChild(deletenode);
    node1.appendChild(textnode1);
    var t=document.getElementById(listid);
    t.appendChild(node1);
}

function createDeleteFunction(node,text,storageName) { // makes a diffrent function for every 
                                       // based on its index and returns that function 
    var x =  function () { 
        node.remove();
        chrome.storage.sync.get(storageName, function(listdic){
            list = listdic[storageName];
            list.splice(list.indexOf(text),1);
            chrome.storage.sync.set({[storageName]: list}, function() {});
        });
     }
     return x;
 }

function addtostoragelist(word,listid,storageName) {// recives a word sends it to "appendtolist" and
                                                    // adds it to the list with storage name in chrome storage
    appendtolist(listid,word,storageName);
    chrome.storage.sync.get(storageName, function(listdic){
        list = listdic[storageName];
        if(list == null)
        {
            chrome.storage.sync.set({[storageName]: [word]}, function() {});
            console.log(word);
            return;
        }
        list.push(word);
        chrome.storage.sync.set({[storageName]: list}, function() {});
    });
}

function getOrigin(url) { // recives a url and returns its origin for example:
                          // getOrigin('https://www.youtube.com/watch?v=oHg5SJYRHA0') = www.youtube.com
    var a = document.createElement("a");
    a.href = url;
    return a.host;
}

function addToWL() { //adds the current open tab to White list
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      //gets a list containing the active page and assigns it to tabs where the first place is the active tab
        var origin = getOrigin(tabs[0].url);
        chrome.storage.sync.get("whitelist", function({whitelist}){
          if(whitelist.indexOf(origin)!=-1){
            return;
          }
          list = whitelist;
          list.push(origin);
          console.log(list);
          chrome.storage.sync.set({"whitelist":list},function () { 
             console.log(`added ${origin} to the white list`);
           });
      });
    });
  }

function removeFromWL() { // removes the current open tab from whitelist if the current site isnt 
                          // in the whitelist this function does nothing
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //gets a list containing the active page and assigns it to tabs where the first place is the active tab
    var origin = getOrigin(tabs[0].url);
    chrome.storage.sync.get("whitelist", function({whitelist}){
        if(whitelist.indexOf(origin)==-1){
        return;
        }
        list = whitelist;
        list.splice(whitelist.indexOf(origin),1);
        chrome.storage.sync.set({"whitelist":list},function () { 
            console.log(`removed ${origin} from the white list`);
        });
    });
});
}
$(document).ready(function() { // updates the blocked words and youtuber lists to contain words and youtubers saved previously
    chrome.storage.sync.get(BLOCKED_WORDS_STORAGE_NAME, function({pclist}){
        if(pclist == null)
        {return;}
        pclist.forEach(element => {
            appendtolist(BLOCKED_WORDS_LIST_ID,element,BLOCKED_WORDS_STORAGE_NAME);
        });
    });
    chrome.storage.sync.get(YOUTUBER_LIST_STORAGE_NAME, function({ytlist}){
        if(ytlist == null)
        {return;}
        ytlist.forEach(element => {
            appendtolist(YOUTUBER_LIST_ID,element,YOUTUBER_LIST_STORAGE_NAME);
        });
    });
}); 



$(document).ready(function(){
    $('#whitelistPage').click(addToWL); //binds both the add and remove whitelist buttons
    $('#unWhitelistPage').click(removeFromWL);
    $(document).on('click', ".header", function(e) {// makes it so only the image in header is a link
        e.stopPropagation();
        e.preventDefault();
    });

    $("#expandarrowBW").click(()=>{// binds the arrow clicking to expand the list and flips the arrow
        $("#blockedWordsList").slideToggle();
        $("#expandarrowBW").toggleClass("reverse");
    });

    $("#expandarrowYT").click(()=>{// binds the arrow clicking to expand the list and flips the arrow
        $("#youtuberList").slideToggle();
        $("#expandarrowYT").toggleClass("reverse");
    });

    $("#addtolistBWbt").click(function (){ // everytime this button is clicked the input is sent to 
                                         // "adddtostoragelist" for handeling and the input is cleared
        newdata = $("#inputBWarea").val();
        if(newdata == "")
        {return;}
        addtostoragelist(newdata, BLOCKED_WORDS_LIST_ID, BLOCKED_WORDS_STORAGE_NAME);
        $("#inputBWarea").val("");
    });

    $("#addtolistYTbt").click(function (){ // everytime this button is clicked the input is sent to 
        // "adddtostoragelist" for handeling and the input is cleared
        newdata = $("#inputYTarea").val();
        if(newdata == "")
        {return;}
        addtostoragelist(newdata, YOUTUBER_LIST_ID, YOUTUBER_LIST_STORAGE_NAME);
        $("#inputYTarea").val("");
    });
    $("#tbutton").click(offTimer);// binds the timer handler
    chrome.storage.sync.get('pclistMode', function({pclistMode}){// checks or leaves unchecked the blocked words
                                                                 // mode according to storage and makes it so
                                                                 // it updates storage if its clicked
        $("#pcbutton").prop("checked",pclistMode);
        $("#pcbutton").click(()=>{
            chrome.storage.sync.get('pclistMode', function({pclistMode}){
                chrome.storage.sync.set({'pclistMode': !(pclistMode)}, function() {});
            });
        });
    });
    chrome.storage.sync.get('ytlistMode', function({ytlistMode}){// checks or leaves unchecked the youtube whitelisting
                                                                 // mode according to storage and makes it so
                                                                 // it updates storage if its clicked
        $("#ytbutton").prop("checked",ytlistMode);
        $("#ytbutton").click(()=>{
            chrome.storage.sync.get('ytlistMode', function({ytlistMode}){
                chrome.storage.sync.set({'ytlistMode': !(ytlistMode)}, function() {});
            });
        });
    });
}); 