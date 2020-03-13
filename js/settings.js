var wordcount = 0;

function offTimer(){
    var time = {"hours":$("#thours").val(), "minutes": $("#tminutes").val()};
    if(time["hours"] == "")
    {time['hours'] = 0;}
    if(time["minutes"] == "")
    {time['minutes'] = 0;}
    chrome.runtime.sendMessage({type: "timer","length": time}, function() {
       console.log("passed time to background.js"); 
    });
}

function createDeleteElement() { 
    var deletenode = document.createElement("img");
    deletenode.id = "word" + wordcount;
    deletenode.src = "images/xicon.png";
    deletenode.style = "float:right; height:15px; width15px;";
    deletenode.align = "middle";
    deletenode.onclick = createDeleteFunction(wordcount++);
    return deletenode;
 }

function appendtolist(listid,text){
    var node1=document.createElement("li");
    var textnode1=document.createTextNode(text);
    var deletenode = createDeleteElement();
    node1.classList.add("dropdown-item");
    node1.append(deletenode);
    node1.appendChild(textnode1);
    var t=document.getElementById(listid);
    t.appendChild(node1);
}

function createDeleteFunction(index) { 
    var x =  function () { 
        $(`#myList1`).children()[index+1].remove();
        wordcount--;
        chrome.storage.sync.get('pclist', function({pclist}){
            pclist.splice(index,1);
            chrome.storage.sync.set({'pclist': pclist}, function() {});
        });
     }
     return x;
 }

function addtostoragelist(word) 
{
    appendtolist("myList1",word)
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

function scrolluplist(listid) {
    var lst = $(`#${listid}`)
    lst.slideToggle();
}

function reverseimgy(imgid){
    console.log($(imgid).css("transform"));
    $(imgid).css("transform","scaleY(-1)");
    $(imgid).css("-webkit-transform","scaleY(-1)");
    $(imgid).css("-moz-transform","scaleY(-1)");
    $(imgid).css("-o-transform","scaleY(-1)");

}
$(document).ready(function() { 
    chrome.storage.sync.get('pclist', function({pclist}){
        if(pclist == null)
        {return;}
        pclist.forEach(element => {
            appendtolist("myList1",element)
        });
    });
}); 
function getOrigin(url) { 
    var a = document.createElement("a");
    a.href = url;
    return a.host;
}
function addToWL() { 
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      //gets a list containing the active page and assigns it to tabs where the first place is the active tab
        var origin = getOrigin(tabs[0].url);
        chrome.storage.sync.get("whitelist", function({whitelist}){
          if(whitelist.indexOf(origin)!=-1){
            return;
          }
          list = whitelist
          list.push(origin)
          console.log(list);
          $("#whitelistText").html('this website is whitelisted')
          chrome.storage.sync.set({"whitelist":list},function () { 
             console.log(`added ${origin} to the white list`);
           });
      });
    });
  }

function removeFromWL() { 
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //gets a list containing the active page and assigns it to tabs where the first place is the active tab
    var origin = getOrigin(tabs[0].url);
    chrome.storage.sync.get("whitelist", function({whitelist}){
        if(whitelist.indexOf(origin)==-1){
        return;
        }
        $("#whitelistText").html('')
        list = whitelist
        list.splice(whitelist.indexOf(origin),1)
        chrome.storage.sync.set({"whitelist":list},function () { 
            console.log(`removed ${origin} from the white list`);
        });
    });
});
}
$(document).ready(function(){
    $('#whitelistPage').click(addToWL);
    $('#unWhitelistPage').click(removeFromWL);
    $(document).on('click', ".header", function(e) {
        e.stopPropagation();
        e.preventDefault();
        alert($(this).data('id'))
    })
    $("#expandarrow").click(()=>{
        scrolluplist("myList1");
        reverseimgy("#expandarrow");
    });
    $("#addtolistbt").click(function (){
        newdata = $("#inputarea").val();
        if(newdata == "")
        {return;}
        addtostoragelist(newdata);
        $("#inputarea").val("");
    });
    $("#tbutton").click(offTimer);
    chrome.storage.sync.get('pclistMode', function({pclistMode}){
        $("#pcbutton").prop("checked",pclistMode);
        $("#pcbutton").click(()=>{
            chrome.storage.sync.get('pclistMode', function({pclistMode}){
                chrome.storage.sync.set({'pclistMode': !(pclistMode)}, function() {});
            });
        });
    });
}); 