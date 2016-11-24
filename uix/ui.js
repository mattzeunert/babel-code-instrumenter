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
            <PluginEditor plugin={selectedPlugin} onChange={this.onPluginEdited.bind(this)}/>
        </div>
    }
    onPluginEdited(newPlugin){
        var plugins = this.state.plugins.slice();
        plugins[this.state.selectedPluginIndex] = newPlugin;
        this.setState({plugins})

        this.persistPlugins();
    }
    addPlugin(){
        var plugins = this.state.plugins.slice();
        plugins.push({
            babelPlugin: "babel",
            injectedCode: "injjjjjj",
            name: "New Plugin"
        })
        this.setState({
            plugins,
            selectedPluginIndex: plugins.length - 1
        })
        this.persistPlugins();
    }
    persistPlugins(){
        chrome.storage.local.set(this.state)
    }
}

class PluginEditor extends React.Component {
    render(){
        return <div>
            <div className="col-md-5">
                <h2>Babel Plugin</h2>
                <textarea
                    value={this.props.plugin.babelPlugin}
                    onChange={(e) => this.updatePlugin("babelPlugin", e.target.value)}>
                </textarea>
            </div>
            <div className="col-md-5">
                <h2>Code Injected Into Page</h2>
                <textarea
                    value={this.props.plugin.injectedCode}
                    onChange={(e) => this.updatePlugin("injectedCode", e.target.value)}>
                </textarea>
            </div>
        </div>
    }
    updatePlugin(propertyName, newValue){
        var newPlugin = Object.assign({}, this.props.plugin)
        newPlugin[propertyName] = newValue

        this.props.onChange(newPlugin)
    }
}

ReactDOM.render(<App />, document.querySelector(".app"))
