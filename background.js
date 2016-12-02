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
        // Received message from devtools. Do something:
        console.log('Received message from devtools page', msg);
    });
});

function onBrowserActionClicked(tab) {
	chrome.storage.local.get(null, function(data){
		onError(tab.id, null)

		var plugin = data.plugins[data.selectedPluginIndex];
		var pluginCode = plugin.babelPlugin

		try {
			var babelPlugin = eval("(" + pluginCode + ")")
		} catch (err){
			onError(tab.id, err);
			return;
		}

	    codeInstrumenter.toggleTabInstrumentation(tab.id, {
			babelPlugin,
			onInstrumentationError(err, filename, session){
				debugger
				onError(session.tabId, err)
			},
			onBeforePageLoad: function(callback){
		        this._executeScript(`
		            var script2 = document.createElement("script")
		            script2.text = decodeURI("${encodeURI(plugin.injectedCode)}")
		            document.documentElement.appendChild(script2)`
		        , function(){
		            // ideally we'd wait for a message from the page,
		            // but for now this will work
		            setTimeout(function(){
		                callback();
		            },100)
		        })
		    }
		})
	})
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);

function onError(tabId, err){
	if (err !== null){
		err = err.toString();

		var encodedError = encodeURI(err);
		chrome.tabs.executeScript(tabId, {
			code: `console.error("Babel Instrumenter Error:", decodeURI("${encodedError}"))`
		})
	}

	var port = ports.filter(port => port.tabId === tabId)[0];
	if (port){
		port.postMessage(["runtimeError", err])
	}


}
