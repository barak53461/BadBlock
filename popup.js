$(document).on(`input change`, `#slider`, function() {
  //checks for change in blur slider location quantifys it
  $(`#blurSample`).css(`filter`, `blur(${$(this).val()/10}rem)`)
  chrome.storage.sync.set({'blur': $(this).val()/10}, function() {
    console.log(`blur set to ${$(this).val()/10}rem`);
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

function updateUI(){
    // incharge of updating the ui to the last saved settings from chrome storage
  chrome.storage.sync.get("mode", function({mode}){
    // setting the parm as {mode} means that if we send the dictionery x to the func it executes mode = x['mode']
    //ticks off the currect mode   
    switch(mode){
      case "block":
        document.getElementById("block").checked = true;
        break;
      case "blur":
        document.getElementById("blur").checked = true;
        break;
      case "off":
        document.getElementById("off").checked = true;
        break;
      default:
        console.error("undefined mode");
        break;
    }
  });
  chrome.storage.sync.get("blur", function({blur}){
  // sets the slider level according to last choice of user and blurs the image accordingly
  document.getElementById('slider').value = blur*10;
  $(`#blurSample`).css(`filter`, `blur(${blur}rem)`)
  // document.getElementById('blurSample').style = `filter:blur(${blurlvl}rem)`
  // $('#blurSample').css(`filter`, `blur(${blurlvl}rem)`);
  });
  WLMessge();
}

function changeMode(value){
    //changes the value of mode stored in chrome 
    chrome.storage.sync.set({"mode": value}, function() {         
    });
    
}
function WLMessge(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //gets a list containing the active page and assigns it to tabs where the first place is the active tab
      var origin = getOrigin(tabs[0].url);
      chrome.storage.sync.get("whitelist", function({whitelist}){
        if(whitelist.indexOf(origin)!=-1){
          $("#whitelistText").html('this website is whitelisted')
        }
    });
  });
}
function radiocheck(){
    // checks which option is ticked and updates chrome storage (onclick handeler of mode menu)
    if(document.getElementById("block").checked){
        changeMode("block");
    }
    if(document.getElementById("blur").checked){
        changeMode("blur");
    }
    if(document.getElementById("off").checked){
        changeMode("off");
    }
}

function manuelremove(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  //gets a list containing the active page and assigns it to tabs where the first place is the active tab
  chrome.tabs.sendMessage(tabs[0].id, {type: "manuelremove"}, function(answer) {
    //sends a messge to the viewed page to run manuelremove 
    console.log(answer);
    });
  });
}

document.body.onload = function(){
    //the script below will only run once the popup page is loaded
    updateUI();//calls updateUI to reset UI to preset values
    $('#whitelistPage').click(addToWL);
    $('#unWhitelistPage').click(removeFromWL);
    $("#radiocheck").click(radiocheck);//binds the radiocheck handeler function to run onclick on the mode menu
    $("#removebutton").click(manuelremove);//binds the manuel remove handel to button
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type: "getCount"}, function(count) {
            //asks the content script of the current page a "getCount" question and prints to UI accordingly
            if(count == -1){
              document.getElementById("adCount").innerHTML = "adblock is off";
              return;
            }
            else if(count == 0){
              document.getElementById("adCount").innerHTML = "no ads found";
              return;
            }
            if(typeof(count) == typeof(1) && count != -1){
                document.getElementById("adCount").innerHTML = "detected " + count + " ads";
                return;
            } 
        });
    });
    
  }