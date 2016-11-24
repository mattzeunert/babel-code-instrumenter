var codeInstrumenter = new ChromeCodeInstrumenter({
    logBGPageLogsOnInspectedPage: true
});

function onBrowserActionClicked(tab) {
	chrome.storage.local.get(null, function(data){
		var plugin = data.plugins[data.selectedPluginIndex];
		var pluginCode = plugin.babelPlugin
		var babelPlugin = eval("(" + pluginCode + ")")

	    codeInstrumenter.toggleTabInstrumentation(tab.id, {
			babelPlugin,
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
