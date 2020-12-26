//Tab:URL storage and whitelist variable
var obj = {};
var whiteList = {}

//Brukernavigering kontrollør
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	chrome.tabs.get(tabId, function (results) {
		if (chrome.runtime.lastError) return undefined;
		if (results && results.url) {

			var tabURL = new URL(results.url);
			tabURL = tabURL.hostname.replace(/(www.)/gi, "");
			obj[tabId] = tabURL;
			console.log(whiteList);
			console.log(tabURL);

			if (["youtube.com"].includes(tabURL)) {
				if (!whiteList[tabURL]) {
					chrome.tabs.executeScript(tabId, {
						file: "blocker/youtubeskipper.js"
					})
					chrome.tabs.insertCSS(tabId, {
						file: "blocker/patches.css"
					})
				}
			}

		}
	});
});

//Siden-navigering/endringer kontrollør
chrome.tabs.onActivated.addListener(function (activeInfo) {
	chrome.tabs.get(activeInfo.tabId, function (results) {
		if (chrome.runtime.lastError) return undefined;

		if (results && results.url) {
			var tabURL = new URL(results.url);
			tabURL = tabURL.hostname.replace(/(www.)/gi, "");
			obj[activeInfo.tabId] = tabURL;

			if (["youtube.com"].includes(tabURL)) {
				if (whiteList[tabURL]) {
					chrome.tabs.executeScript(tabId, {
						file: "blocker/youtubeskipper.js"
					})
					chrome.tabs.insertCSS(tabId, {
						file: "blocker/patches.css"
					})
				}
			}
		}
	});
});

//Webnavigation kontrollør
chrome.webNavigation.onBeforeNavigate.addListener(function (tab) {
	if (tab.frameId == 0) {
		chrome.tabs.get(tab.tabId, function (results) {
			if (chrome.runtime.lastError) return undefined;

			if (results && results.url) {
				var tabURL = new URL(results.url);
				tabURL = tabURL.hostname.replace(/(www.)/gi, "");
				obj[tab.tabId] = tabURL;

				if (["youtube.com"].includes(tabURL)) {
					if (whiteList[tabURL]) {
						chrome.tabs.executeScript(tabId, {
							file: "blocker/youtubeskipper.js" 
						});
						chrome.tabs.insertCSS(tabId, { 
							file: "blocker/patches.css" 
						});
					}
				}
			}
		});
	}
});

//WebRequest Parametere
var filter = { urls: ["<all_urls>"], types: ["media", "script", "xmlhttprequest", "image", "sub_frame"]};
var extra = ["blocking"];

//Andre variabler
var [url, currentURL, currentURL2, currentURLModified] = ["", "", "", "", ""];
var transparentURL = chrome.runtime.getURL("../images/transparent.gif");
var ad = [];

//Listening for requests.
var callback = (details) => {
	url = new URL(details.url);
	currentURL = url.hostname.replace(/(www.)/gi, "");
	currentURL2 = url.hostname.slice(url.hostname.indexOf(".") + 1);
	currentURLModified = url.hostname + url.pathname;
	ad = [url.pathname, currentURL, currentURL2, currentURLModified];

	if (whiteList[obj[details.tabId]]) {
		return {
			cancel: false
		}
	} 
	else {
		//Scripts
		if (details.type == "script") {
			if (ad.some(e => scriptsList[e])) {
				return {
					redirectUrl: transparentURL
				}
			}
		}
		//Media, Image and Sub_Frame                                                        
		else if (["media", "sub_frame", "image"].some(e => e == details.type)) {
			if (ad.some(e => adsList[e])) {
				return {
					redirectUrl: transparentURL
				}
			} 
			else if (ad.some(e => imageList[e])) {
				return {
					redirectUrl: transparentURL
				}
			}
		}
		//XMLHttpRequests
		else if (details.type = "xmlhttprequest") {
			if (url.pathname == "/get_video_info") {
				//embedded youtube fix
				if (/(embedded)/gi.test(details.url) == true) {
					return {
						redirectUrl: details.url
					}
				}
			} 
			else if (ad.some(e => adsList[e])) {
				return {
					redirectUrl: transparentURL
				}
			}
		}
	}
}

//Upon first-installation
chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason == "install") {
		chrome.storage.sync.set({
			"onOff": true,
			"whiteList": {}
		});
		chrome.webRequest.onBeforeRequest.addListener(callback, filter, extra);
		chrome.tabs.create({ url: "../static/welcomePage.html" });
	} 
	else {
		chrome.storage.sync.set({
			"onOff": true,
			"whiteList": {}
		});
		chrome.webRequest.onBeforeRequest.addListener(callback, filter, extra);
	}
});

//When chrome is opened, turn on or off the blocker based upon the storage-saved data
chrome.storage.sync.get(function (result) {

	//Update whitelist based upon storage upon extension-loading
	whiteList = result["whiteList"];

	//Start or Turn off the blocker based on storage-saved data
	if (result.onOff == true) chrome.webRequest.onBeforeRequest.addListener(callback, filter, extra);
	else if (result.onOff == false) chrome.webRequest.onBeforeRequest.removeListener(callback);
	else return undefined;
});

//Message listener
chrome.runtime.onMessage.addListener(function (message, sender, response) {
	if (message === true) chrome.webRequest.onBeforeRequest.addListener(callback, filter, extra);
	else if (message === false) chrome.webRequest.onBeforeRequest.removeListener(callback);
	else {
		if (message[1] == "UNBLOCK") {
			chrome.storage.sync.get(["whiteList"], function (result) {
				delete result["whiteList"][message[0]];
				whiteList = result["whiteList"]
				chrome.storage.sync.set({ "whiteList": result["whiteList"] }, function(){
					updateWhitelist();
				});
			});
		} 
		else if (message[1] == "BLOCK") {
			console.log("blocking");
			chrome.storage.sync.get(["whiteList"], function (result) {
				result["whiteList"][message[0]] = true;
				whiteList = result["whiteList"];
				chrome.storage.sync.set({ "whiteList": result["whiteList"] }), function(){
					console.log("it's saved!")
					updateWhitelist();
				};
			});
		}
	}
});

//Whitelist Updater
function updateWhitelist(message) {
	chrome.storage.sync.get(["whiteList"], function (result) {
		console.log(result["whiteList"]);
		console.log("oppdaterer whitelisten")
		whiteList = result["whiteList"];
	});
}