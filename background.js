var codeInstrumenter = new ChromeCodeInstrumenter({});

// http://stackoverflow.com/questions/11661613/chrome-devpanel-extension-communicating-with-background-page
var ports = [];
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== "babel-instrumenter") return;
    ports.push(port);
    // Remove port when destroyed (eg when devtools instance is closed)
    port.onDisconnect.addListener(function() {
        var i = ports.indexOf(port);
        if (i !== -1) ports.splice(i, 1);
    });
    port.onMessage.addListener(function(msg) {
		if (msg[0] === "connect") {
			port.tabId = msg[1];
		}
		if (msg[0] === "enableInstrumentation") {
			updateTab(port.tabId, codeInstrumenter.reloadTabWithInstrumentationEnabled.bind(codeInstrumenter))
		}
        // Received message from devtools. Do something:
        console.log('Received message from devtools page', msg);
    });
});

function onBrowserActionClicked(tab) {
	updateTab(tab.id, codeInstrumenter.toggleTabInstrumentation.bind(codeInstrumenter))
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);

function updateTab(tabId, updateFn){
	chrome.storage.local.get(null, function(data){
		onError(tabId, null)

		var plugin = data.plugins[data.selectedPluginIndex];
		var pluginCode = plugin.babelPlugin

		try {
			var babelPlugin = eval("(" + pluginCode + ")")
		} catch (err){
			onError(tabId, err);
			return;
		}

	    updateFn(tabId, {
			babelPlugin,
			jsExecutionInhibitedMessage: "Babel Code Instrumenter: JavaScript execution inhibited during initial load",
			onInstrumentationError(err, filename, session){
				onError(session.tabId, err)
			},
			onBeforePageLoad: function(callback){
				this.executeScriptOnPage(`var instrumenterDocumentReadyInterval = setInterval(function(){
					if (f__getReadyState(document) === "complete") {
						clearInterval(instrumenterDocumentReadyInterval);
						if (window.onBabelInstrumenterDocumentReady){
							window.onBabelInstrumenterDocumentReady();
						}
					}
				}, 50)`, () => {
					this.executeScriptOnPage(plugin.injectedCode, function(){
			            // ideally we'd wait for a message from the page,
			            // but for now this will work
			            setTimeout(function(){
			                callback();
			            },100)
			        })
				})
		    }
		})
	})
}

function onError(tabId, err){
	if (err !== null){
		err = err.toString();

		var encodedError = encodeURI(err);
		chrome.tabs.executeScript(tabId, {
			code: `console.error("Babel Instrumenter Error:", decodeURI("${encodedError}"))`
		})

		chrome.browserAction.setBadgeText({
            text: "!",
            tabId: tabId
        });
        chrome.browserAction.setBadgeBackgroundColor({
            tabId: tabId,
            color: "red"
        })
	}

	var port = ports.filter(port => port.tabId === tabId)[0];
	if (port){
		port.postMessage(["runtimeError", err])
	}
}
