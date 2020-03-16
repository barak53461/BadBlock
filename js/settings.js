const DELETE_IMGS_CLASS = "deleteimgs";
var wordcount = 0;

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

function createDeleteElement() {// creates the deletion element and 
                                // gives it the appropriate attributes
    var deletenode = document.createElement("img");
    deletenode.id = "word" + wordcount;
    deletenode.src = "../resources/images/xicon.png";
    deletenode.align = "middle";
    deletenode.classList.add(DELETE_IMGS_CLASS);
    deletenode.onclick = createDeleteFunction(wordcount++);
    return deletenode;
 }

function appendtolist(listid,text){// gets a list and text adds it to the list with
                                   // the appropriate sub elements and attributes
    var node1=document.createElement("li");
    var textnode1=document.createTextNode(text);
    var deletenode = createDeleteElement();
    node1.appendChild(deletenode);
    node1.appendChild(textnode1);
    var t=document.getElementById(listid);
    t.appendChild(node1);
}

function createDeleteFunction(index) { // makes a diffrent function for every 
                                       // based on its index and returns that function 
    var x =  function () { 
        $(`#blockedWordsList`).children()[index+1].remove();
        wordcount--;
        chrome.storage.sync.get('pclist', function({pclist}){
            pclist.splice(index,1);
            chrome.storage.sync.set({'pclist': pclist}, function() {});
        });
     }
     return x;
 }

function addtostoragelist(word) {// recives a word sends it to "appendtolist" and
                                 // adds it to pclist in chrome storage
    appendtolist("blockedWordsList",word)
    chrome.storage.sync.get('pclist', function({pclist}){
        if(pclist == null)
        {
            chrome.storage.sync.set({'pclist': [word]}, function() {});
            console.log(word);
            return;
        }
        pclist.push(word);
        chrome.storage.sync.set({'pclist': pclist}, function() {});
    });
}

$(document).ready(function() { // updates the list to contain words saved previously
    chrome.storage.sync.get('pclist', function({pclist}){
        if(pclist == null)
        {return;}
        pclist.forEach(element => {
            appendtolist("blockedWordsList",element)
        });
    });
}); 

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
$(document).ready(function(){
    $('#whitelistPage').click(addToWL); //binds both the add and remove whitelist buttons
    $('#unWhitelistPage').click(removeFromWL);
    $(document).on('click', ".header", function(e) {// makes it so only the image in header is a link
        e.stopPropagation();
        e.preventDefault();
    })
    $("#expandarrowBW").click(()=>{// binds the arrow clicking to expand the list and flips the arrow
        $("#blockedWordsList").slideToggle();
        $("#expandarrowBW").toggleClass("reverse");
    });
    $("#addtolistbt").click(function (){ // everytime this button is clicked the input is sent to 
                                         // "adddtostoragelist" for handeling and the input is cleared
        newdata = $("#inputarea").val();
        if(newdata == "")
        {return;}
        addtostoragelist(newdata);
        $("#inputarea").val("");
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
}); 