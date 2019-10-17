import React, { Component } from "react";
import { REFRESH, WEBSOCKET } from "./config";
import { HashRouter, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Dashboard } from "./components/dashboard/Dashboard";

import './styles/index.css'
import './styles/header.css'
import './styles/cluster.css'
import './styles/legend.css'
import './styles/square.css'

interface AppProps {}

interface AppState {
  refreshRate: number;
  useWebSocket: boolean;
}

class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      refreshRate: REFRESH,
      useWebSocket: WEBSOCKET
    };
  }

  handleRefreshChange = (refreshRate: number) => {
    this.setState({
      refreshRate: refreshRate
    });
  };

  handleWebsocketChange = (useWebSocket: boolean) => {
    console.log("changing websocket");
    this.setState({
      useWebSocket: useWebSocket
    });
  };

  render() {
    return (
      <HashRouter>
        <Header
          refreshRate={this.state.refreshRate}
          handleRefreshChange={this.handleRefreshChange}
          useWebSocket={this.state.useWebSocket}
          handleWebsocketChange={this.handleWebsocketChange}
        />
        <React.Fragment>
          <Route
            exact
            path="/"
            render={() => (
              <Dashboard
                refreshRate={this.state.refreshRate}
                useWebSocket={this.state.useWebSocket}
              />
            )}
          />
          {/* <Route
            path="/node/:uuid"
            render={props => (
              <NodeView
                {...props}
                refreshRate={this.state.refreshRate}
                changeRefresh={this.changeRefresh}
                websocket={this.state.websocket}
              />
            )}
          /> */}
        </React.Fragment>
      </HashRouter>
    );
  }
}

// const App: React.FC = () => {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.tsx</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
