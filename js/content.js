const HIGHLIGHT_CSS = `.hova{background-color: yellow;}`;
const BLUR_CSS = `.blurme{filter: blur(1rem);}`;
const AD_BUTTON_CLASS = 'adbuttons';
const UNCERTAIN_AD_MSG = 'this has been signaled as an ad please review it and decide wheter it is or not\r\n';
const s = new XMLSerializer(); //initilizes a  serilizer
const d = new DOMParser(); // initilizes a dom parser
const AD_WAIT = 3000; // specifiys how many seconds the ad will show for (in miliseconds) 1000ms == 1s
const CENSOR_CHAR = "*"; // the charecter used to censor words
const EASTLIST_FILTER = /^##.*$/mg;// filter by which we fish out the ids and classes that we need to block

maunelremovemode = false; // false means off true means on
manuelremovelist = {}; // will be filled from background
ads_found = 0;

function DOMcensor(el, word,len) { // makes shure that the words we censor are not tags/attributes for example 
                                   // if we want to censore the word armani some site may have a <armani> tag 
                                   // which we dont want to censor since it can caouse corruption of the page
  if (el.children.length > 0) { 
    Array.from(el.children).forEach(function(child){ 
      DOMcensor(child, word, len) 
    }) 
  } else { 
    if (el.innerText) { 
      console.log(word);
      el.innerText = el.innerText.replace(word, CENSOR_CHAR.repeat(len)) 
    } 
  }  
}

function getpclist() {
  // checks wheter the mode for parent control is on if it is 
  // the function gets the list from storage and runs domcensor
  // on every word
  chrome.storage.sync.get('pclistMode', function({pclistMode}){
    if(!pclistMode)
    {return;}
    chrome.storage.sync.get('pclist', function({pclist}){
      pclist.forEach(word=>{
        DOMcensor(document.body,new RegExp(`\\b${word}\\b`, "gmi"),word.length);
      });  
    });
});
}

function getlistfrombg() { 
  // sends the "startUp" message to all scripts recives answer from 
  // background removes the nodes we know are ads and passes the
  // uncertain ads to the function that handels them 
  chrome.runtime.sendMessage({type: "startUp"}, function(response) {
    manuelremovelist = JSON.parse(response);
    chrome.storage.sync.get('mode', function({mode}){
      if(mode !== 'block') //exits function of mode isnt block
      {return;}
      handelMBListUncertain(manuelremovelist["uncertian"]);
      if(manuelremovelist['approved'] == null) 
      {return;}
      // we want to make shure the list isnt empty so we wont 
      // get error when trying to run for each
      manuelremovelist['approved'].forEach((dicnode)=>{comparestrtohtml(document,dicnode,true)});
      });
    });
}

function updatemanuelfound(nodeid,isad) { 
  // recives a node and boolean send to server message with the 
  // boolean indicating wheter the node is a ad or not
  chrome.runtime.sendMessage({type: "manuelfound",'nodeid': nodeid,'isad': isad}, function() {
    console.log('found manuel ad reported to background');
  });
}

function checkifad(node,nodeid) {
  // recives a node in the page and replaces it with a message to the user
  container = contain(node);
  text = document.createElement('a');
  text.innerHTML = UNCERTAIN_AD_MSG;
  node.hidden = true;
  container.appendChild(text);
  //          this line creates the three buttons the the ui uses   
  //              VVV
  buttondir = {'notadbutton': document.createElement('button'),'isadbutton':document.createElement('button'),'showad': document.createElement('button')};
  for(key in buttondir){
    // assigns the three buttons an id a class and write inside them appropriatly
    buttondir[key].class = AD_BUTTON_CLASS;
    buttondir[key].id = key;
    buttondir[key].innerHTML = key;
    container.appendChild(buttondir[key]);
  }
  $(buttondir['showad']).on('click' ,function (){
    //makes it so when you click in the button the ad will show for a timed period defined as a constant
    childs = container.childNodes;
    node.hidden = false;
    for(node1 in childs)
    {
      if(node != node1){
        $(node1).hide();
        console.log(node);
      }
    }
    setTimeout(function () {
      node.hidden = true;
      for(node1 in childs)
      {
        if(node != node1){
          $(node1).show();
        }
      }
    },AD_WAIT)
  });

  $(buttondir["notadbutton"]).on('click',function (){
    // returns the original node and gets rid of the ui 
    console.log(container.childNodes);
    node.hidden = false;
    while(container.childNodes.length > 1)
    {
      container.childNodes.forEach((child)=>{
        if(child != node)
        {
          $(child).remove();
        }
      });
    }
    updatemanuelfound(nodeid,false);// passes the id to the function with 
                                    // false parameter signeling it wasnt an ad
  });
  $(buttondir["isadbutton"]).on('click',function (){
    //removes the node that is an ad and the ui on click
    while(container.childNodes.length > 1)
    {
      container.childNodes.forEach((child)=>{
        if(child != node)
        {
          $(child).remove();
        }
      });
    }
    updatemanuelfound(nodeid,true);// passes the id to the function with 
                                   // false parameter signeling it wasnt an ad
  });

}

function contain(htmlnode) { 
  // surrounds the recived html element with a div parent and returns 
  // the container with the element nested within
  parent = $(htmlnode).parent();
  container = document.createElement('div');
  container.id = "test"
  console.log(container);
  container.appendChild(htmlnode);
  parent[0].appendChild(container);
  return container;
}

function comparestrtohtml(node,dicnode,approved) {// runs oveer all the dom and compares it to a node 
                                                  // if a identical node was found send to checkifad
                                                  // to handel if it isnt an approved node if it is it removes it
                                                  // (approved = true) = certainly an ad , (approved = false) = might be an ad
  if (node == null) {
    return;
  }
  if(s.serializeToString(node) === dicnode['node'])
  {
    if(approved)
    {node.hidden = true;}
    else
    {checkifad(node,dicnode['id']);}
  }
  comparestrtohtml(node.firstElementChild,dicnode,approved);
  comparestrtohtml(node.nextElementSibling,dicnode,approved);
}


function handelMBListUncertain(lst) { // checks if the addon is on if it is 
                                      // passes each node to function for handeling
  chrome.storage.sync.get('mode', function({mode}){
    if(mode !== 'block') 
    {return;}
    lst.forEach(object => {
      comparestrtohtml(document,object,false);
    });
  });

}

function addStyleString(str,id) {// inserts a css encoded style defenition 
                                 // into the current page
  var node = document.createElement('style');
  node.innerHTML = str;
  node.id = id;
  document.body.appendChild(node);
}


function handeladblock(){
  ads_found = 0;// incase this function runs a few times within the same window we zero it in the start
  // will handel the adblocking proccess accoridnt to the current mode specified in the chrome storage
  chrome.storage.sync.get('mode', function({mode}){ 
    jQuery.get('https://easylist.to/easylist/easylist.txt', function(data1) {
    jQuery.get('https://raw.githubusercontent.com/easylist/EasyListHebrew/master/EasyListHebrew.txt', function(data2) {
      //imports easylist using jquary and pulls out the appropriate filters using the predifined regex filter
      id_black_list = Array.prototype.concat(data1.match(EASTLIST_FILTER),data2.match(EASTLIST_FILTER));
      if(mode == 'off')
      {
        //when sending the amount of ads found to the popup we want a numeric way to say the adblock is off we chose -1
        ads_found = -1;
        console.log('adblock is off');
        id_black_list.forEach(element =>// makes shure the ads are visible since the adblock is off
          {
            if(element != `` && $(element.slice(2)).length != 0)
              {
                $(element.slice(2)).removeClass(`blurme`);
                $(element.slice(2)).show();
                console.log(`removed ` + element);
              }
          });
      }else{// NOTE TO SELF: this has some potentiol to be more efficiant work on it
        if(mode == 'block')
          {
            //incase mode is set on block it will go thru our list of ids to block and hide them while counting how many it hid
            id_black_list.forEach(element =>
            {
              node = element.slice(2);//removes the easy list marking and leaves only the id/class with jquary identification (./#)
              if(node != `` && $(node).length != 0)
              {  
                $(node).removeClass(`blurme`);
                $(node).hide();
                console.log(`removed ` + node);
                ads_found++;
              }
            });
          }
          //handel blur
        else if(mode == 'blur')
        {
          //if the mode is set to blur go over the blocking ids list and give them a shared class which we will blur using css
          id_black_list.forEach(element =>
          {
            node = element.slice(2);//removes the easy list marking and leaves only the id/class with jquary identification (./#)
            if(element != `` && $(node).length != 0)
            {
              $(node).show();
              $(node).addClass(`blurme`);
              console.log(`blured ` + element);
              ads_found++;
            }
          });
        }
    }
    });
    });
  });
}

function send_to_background(node) {// passes a node to background to pass to server
  chrome.runtime.sendMessage({type: "manuelAd",ad: node}, function(response) {
    console.log(response.farewell);
  });
}

function turnonmanuel(){ // gives all elements a highlight on hover effect and assigns the onclick handler
  $('body').children().click(function(e){
    elementclicked(e);
    });
    $('body').children().mouseover(function(e){
      $(".hova").removeClass("hova");     
      $(e.target).addClass("hova");
    return false;
    }).mouseout(function(e) {
      $(this).removeClass("hova");
    });
    maunelremovemode = true;
}

function turnoffmanuel(){// removes the hover effect mentioned in the previus function and unbindes the click handler
  $('body').children().prop("onclick", null).off("click")
  $('body').children().mouseover(function(e){
    $(".hova").removeClass("hova");     
    $(e.target).removeClass("hova");
  return false;
  }).mouseout(function(e) {
    $(this).removeClass("hova");
  });
  maunelremovemode = false;
}

function removeme(e) {// removes the sent element and passes it to send to background handler
  send_to_background(s.serializeToString(e.target));
  $(e.target).hide(); 
}

function elementclicked(e){ // manuel remove onclick handler 
    $(e.target).removeAttr('xmlns');
    $(e.target).removeClass("hova");//makes shure we dont add something to the database with unwanted attributes
    turnoffmanuel();
    removeme(e)
}

chrome.storage.onChanged.addListener(function(changes,namespace){// makes it so the blocking changes dynamicly with the mode in storage
  for(var key in changes)
  {
    if(key == `mode`)
      {handeladblock();}
    if(key == 'blur')
    {
        style = document.getElementById('blur')
        style.innerHTML = `.blurme{filter: blur(${changes[key].newValue}rem);}`;
    }
  }
});

function checkWL(){// checks if the site is whitelisted if it isnt runs block handler
  var iswhitelist = false;
  chrome.storage.sync.get("whitelist", function({whitelist}){
    if(whitelist.indexOf(window.location.hostname) != -1)
    {
      iswhitelist = true;
    }
    if(!iswhitelist)
    {handeladblock();}
  });
}
document.body.onload = ()=> {//waits for the page to load before running anything 
  //insert the needed css to the site by class so we can easily change it
  addStyleString(BLUR_CSS,'blur');
  addStyleString(HIGHLIGHT_CSS,'highlight');
  //runs the function that handles the blocking
  checkWL();
  getlistfrombg();
  getpclist();
}

//sets a listener for messeges and activates the according handeling function
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    console.log(message);
    if(message.type == `getCount`){//answers a "getCount" request
      sendResponse(ads_found);
    }else if(message.type == `manuelremove`){ // starts/stops manuel mode after reciving the "manuelremove" request
      if(!maunelremovemode)
      {
        turnonmanuel();
      }else
      {
        turnoffmanuel();
      }
    }
  }
);
