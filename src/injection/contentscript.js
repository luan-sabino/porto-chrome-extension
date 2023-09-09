/**
 * Content script currently only used to communicate extension state on off message to injected.js
 * Sends back response to extension (popup.js) after sending message to injected.js
 */
$(function(){

    // localStorage is different from chrome.storage
    // localStorage for injected script, and chrome.storage for extension script (popup.js) and contentscript.js

    chrome.storage.sync.get("state", function (data) {

        if (typeof data.state === 'undefined') {
            chrome.storage.sync.set({"state": "on"}, function() {});    // async
        }

        console.log("Content Script State: " + data.state);
    });

    let index = 1;

    window.addEventListener('message', (ev) => {
        const data = JSON.parse(ev.data)

        chrome.storage.local.set({[data.key]: data.value})
    })

    // message from extension script to this content script.
    // will be used to receive enable disable messages
    // sends response in 'status' variable
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
        console.log(request)
        console.log(sender.tab ?
                    "content script receiving message from a content script:" + sender.tab.url :
                    "content script receiving message from the extension");

        if (request.toggle === true) {
            chrome.storage.sync.set({"state": "on"}, function() { console.log("Content Script State Updated: on"); });  // async
            var data = {
                app_state: "on"
            };
            document.dispatchEvent(new CustomEvent("app_state_message", {detail: data}));
            // cannot return state in function since above .set is async and popup.js does not receive the response
            sendResponse({state: "on"});
        } else if (request.toggle === false) {
            chrome.storage.sync.set({"state": "off"}, function() { console.log("Content Script State Updated: off"); });    // async
            var data = {
                app_state: "off"
            };
            document.dispatchEvent(new CustomEvent("app_state_message", {detail: data}));
            sendResponse({state: "off"});
        } else {
            sendResponse({state: "error"});
        }

    });

});