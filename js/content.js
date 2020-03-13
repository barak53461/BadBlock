maunelremovemode = false; // false means off true means on
manuelremovelist = {};
ads_found = 0;
const highlightCss = `.hova{background-color: yellow;}`;
const blurCss = `.blurme{filter: blur(1rem);}`;
const extension_id = chrome.runtime.id;
const adbuttonclass = 'adbuttons';
const UncertainAdMsg = 'this has been signaled as an ad please review it and decide wheter it is or not\r\n';
const s = new XMLSerializer(); //initilizes a  serilizer
const d = new DOMParser(); // initilizes a dom parser
const adWait = 3000; // specifiys how many seconds the ad will show for (in miliseconds) 1000ms == 1s
const censorChar = "*"; // the charecter used to censor words
const eastlistfilter = /^##.*$/mg;// filter by which we fish out the ids and classes that we need to block

function DOMcensor(el, word,len) { 
  if (el.children.length > 0) { 
    Array.from(el.children).forEach(function(child){ 
      DOMcensor(child, word, len) 
    }) 
  } else { 
    if (el.innerText) { 
      console.log(word);
      el.innerText = el.innerText.replace(word, censorChar.repeat(len)) 
    } 
  }  
}

function getpclist() {
  //checks wheter the mode for parent control is on if it is it gets the list from storage and runs domcensor on every word
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
  //gets the list from background page and splits handeling to nodes we know are ads and to nodes that were uncertain
  chrome.runtime.sendMessage({type: "startUp"}, function(response) {
    manuelremovelist = JSON.parse(response);
    chrome.storage.sync.get('mode', function({mode}){
      if(mode !== 'block') 
      {return;}
      console.log(manuelremovelist["uncertian"]);
      handelMBListUncertain(manuelremovelist["uncertian"]);
      if(manuelremovelist['approved'] == null)
      {return;}
      manuelremovelist['approved'].forEach((dicnode)=>{comparestrtohtmlapproved(document,dicnode)})
      });
    });
}

function updatemanuelfound(nodeid,isad) { 
  chrome.runtime.sendMessage({type: "manuelfound",'nodeid': nodeid,'isad': isad}, function() {
    console.log('found manuel ad reported to background');
  });
}

function checkifad(node,nodeid) { 
  container = contain(node);
  text = document.createElement('a');
  text.innerHTML = UncertainAdMsg;
  node.hidden = true;
  container.appendChild(text);
  buttondir = {'notadbutton': document.createElement('button'),'isadbutton':document.createElement('button'),'showad': document.createElement('button')};
  for(key in buttondir){
    buttondir[key].class = adbuttonclass;
    buttondir[key].id = key;
    buttondir[key].innerHTML = key;
    container.appendChild(buttondir[key]);
  }
  $(buttondir['showad']).on('click' ,function (){
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
    },adWait)
  });

  $(buttondir["notadbutton"]).on('click',function (){
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
    updatemanuelfound(nodeid,false);
  });
  $(buttondir["isadbutton"]).on('click',function (){
    while(container.childNodes.length > 1)
    {
      container.childNodes.forEach((child)=>{
        if(child != node)
        {
          $(child).remove();
        }
      });
    }
    updatemanuelfound(nodeid,true);
  });

}

function contain(htmlnode) { 
  //surrounds the recived html element with a div and returns the container with the element nested
  parent = $(htmlnode).parent();
  container = document.createElement('div');
  container.id = "test"
  console.log(container);
  container.appendChild(htmlnode);
  parent[0].appendChild(container);
  return container;
}

function comparestrtohtml(node,dicnode) {
  if (node == null) {
    return;
  }
  if(s.serializeToString(node) === dicnode['node'])
  {
    checkifad(node,dicnode['id']);
  }
  comparestrtohtml(node.firstElementChild,dicnode);
  comparestrtohtml(node.nextElementSibling,dicnode);
}

function comparestrtohtmlapproved(node,dicnode) {
  if (node == null) {
    return;
  }
  if(s.serializeToString(node) === dicnode['node'])
  {
    node.hidden = true;
  }
  comparestrtohtmlapproved(node.firstElementChild,dicnode);
  comparestrtohtmlapproved(node.nextElementSibling,dicnode);
}

function handelMBListUncertain(lst) { 
  chrome.storage.sync.get('mode', function({mode}){
    if(mode !== 'block') 
    {return;}
    lst.forEach(object => {
      comparestrtohtml(document,object);
    });
  });

}

function addStyleString(str,id) {
  //inserts a css encoded style defenition into the current page
  var node = document.createElement('style');
  node.innerHTML = str;
  node.id = id;
  document.body.appendChild(node);

}


function handeladblock(){
  
  // will handel the adblocking proccess accoridnt to the current mode specified in the chrome storage
  chrome.storage.sync.get('mode', function({mode}){ 
    jQuery.get('https://easylist.to/easylist/easylist.txt', function(data1) {
    jQuery.get('https://raw.githubusercontent.com/easylist/EasyListHebrew/master/EasyListHebrew.txt', function(data2) {
      //imports easylist using jquary and assigns it to data then cuts it according to set filters
     
      id_black_list = Array.prototype.concat(data1.match(eastlistfilter),data2.match(eastlistfilter));
      console.log(typeof(id_black_list));

      if(mode == 'off')
      {
        //when sending the amount of ads found to the popup we want a numeric way to say the adblock is off we chose -1
        ads_found = -1;
        console.log('adblock is off');
        id_black_list.forEach(element =>
          {
            if(element != `` && $(element.slice(2)).length != 0)
              {
                $(element.slice(2)).removeClass(`blurme`);
                $(element.slice(2)).show();
                console.log(`removed ` + element);
              }
          });
      }else{
        if(mode == 'block')
          {
            //incase mode is set on block it will go thru our list of ids to block and hide them while counting how many it hid
            id_black_list.forEach(element =>
            {
              node = element.slice(2);
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
            if(element != `` && $(element.slice(2)).length != 0)
            {
              $(element.slice(2)).show();
              $(element.slice(2)).addClass(`blurme`);
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

function send_to_background(node) 
{ 
  chrome.runtime.sendMessage({type: "manuelAd",ad: node}, function(response) {
    console.log(response.farewell);
  });
}

function turnonmanuel(){ 
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

function turnoffmanuel(){
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

function removeme(e) {
  send_to_background(s.serializeToString(e.target));
  $(e.target).hide(); 
}

function elementclicked(e){
    $(e.target).removeAttr('xmlns');
    $(e.target).removeClass("hova");//makes shure we dont add something to the database with unwanted attributes
    turnoffmanuel();
    removeme(e)
}

chrome.storage.onChanged.addListener(function(changes,namespace){
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
function checkWL(){
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
document.body.onload = ()=> {
  //insert the needed css to the site by class so we can easily change it
  addStyleString(blurCss,'blur');
  addStyleString(highlightCss,'highlight');
  //runs the function that handles the blocking
  checkWL();
  getlistfrombg();
  getpclist();
}

//sets a listener for messeges and activates the according handeling function
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    console.log(message);
    if(message.type == `getCount`)
    {sendResponse(ads_found);
    }else if(message.type == `manuelremove`)
    {
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
