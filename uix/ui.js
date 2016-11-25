class App extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
    }
    componentDidMount(){
        chrome.storage.local.get(null, (data) => {
            if (data.plugins === undefined){
                data = {
                    selectedPluginIndex: 0,
                    plugins: [
                        {
                            name: "plugin 1",
                            babelPlugin: "babel",
                            injectedCode: "injected"
                        },
                        {
                            name: "plugin 2",
                            babelPlugin: "babel2",
                            injectedCode: "injected2"
                        },
                        {
                            name: "plugin 3",
                            babelPlugin: "babel3",
                            injectedCode: "injected3"
                        }
                    ]
                }
            }

            this.setState(data)
        })
    }
    componentDidUpdate(){
        this.persistPlugins();
    }
    render(){
        if (this.state.plugins === undefined) {
            return <div>Loading plugins</div>
        }

        var selectedPluginIndex = this.state.selectedPluginIndex;
        var selectedPlugin = this.state.plugins[selectedPluginIndex]

        return <div className="row">
            <div className="col-md-2">
                <select onChange={(e) => this.setState({selectedPluginIndex: e.target.value})} value={selectedPluginIndex}>
                    {this.state.plugins.map((plugin, i) => <option value={i} key={i}>
                        {plugin.name}
                    </option>)}
                </select>
                <button onClick={() => this.addPlugin()}>
                    Add Babel Plugin
                </button>
            </div>
            <div className="col-md-10">
                <PluginEditor plugin={selectedPlugin} onChange={this.onPluginEdited.bind(this)}/>
            </div>
        </div>
    }
    onPluginEdited(newPlugin){
        var plugins = this.state.plugins.slice();
        plugins[this.state.selectedPluginIndex] = newPlugin;
        this.setState({plugins})
    }
    addPlugin(){
        var plugins = this.state.plugins.slice();
        plugins.push({
            babelPlugin: `function babelPlugin(babel) {
  	return {
    	visitor: {
	      	FunctionDeclaration(path) {
        		var call = babel.types.callExpression(
          			babel.types.identifier("logCall"),
                    [babel.types.stringLiteral(path.node.id.name)]
        		);
        		var expression = babel.types.expressionStatement(call)
				path.node.body.body.unshift(expression)
      		}
    	}
	}
}`,
            injectedCode: `window.calls = {}
window.logCall = function(fnName){
	if (!window.calls[fnName]){
      	window.calls[fnName] = 0;
    }
	window.calls[fnName]++
}`,
            name: "New Plugin"
        })
        this.setState({
            plugins,
            selectedPluginIndex: plugins.length - 1
        })
    }
    persistPlugins(){
        chrome.storage.local.set(this.state)
    }
}

class PluginEditor extends React.Component {
    render(){
        return <div className="row">
            <div className="col-md-12">
                <input
                    value={this.props.plugin.name}
                    onChange={e => this.updatePlugin("name", e.target.value)}
                ></input>
            </div>
            <div className="col-md-6">
                <h2>Babel Plugin</h2>
                <CodeEditor
                    value={this.props.plugin.babelPlugin}
                    onChange={(e) => this.updatePlugin("babelPlugin", e.target.value)}>
                </CodeEditor>
            </div>
            <div className="col-md-6">
                <h2>Code Injected Into Page</h2>
                <CodeEditor
                    value={this.props.plugin.injectedCode}
                    onChange={(e) => this.updatePlugin("injectedCode", e.target.value)}>
                </CodeEditor>
            </div>
        </div>
    }
    updatePlugin(propertyName, newValue){
        var newPlugin = Object.assign({}, this.props.plugin)
        newPlugin[propertyName] = newValue

        this.props.onChange(newPlugin)
    }
}

class CodeEditor extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
        this.updateErrors = _.debounce(this.updateErrors, 250)
    }
    componentDidUpdate(prevProps, prevState){
        this.updateErrors()
    }
    render(){
        return <div>
            <CodeMirrorEditor
                value={this.props.value}
                onChange={this.props.onChange}
            >
            </CodeMirrorEditor>
            {
                this.state.errors ?
                <pre>{this.state.errors}</pre> :
                null
            }
        </div>
    }
    updateErrors(){
        this.setState({errors: this.getErrors()})
    }
    getErrors(){
        var error = null;
        try {
            // just check if syntax is valid
            Babel.transform(this.props.value, {}).code
        } catch (err) {
            error = err.toString()
        }

        return error;
    }
}

ReactDOM.render(<App />, document.querySelector(".app"))
