/* App.js: Root javascript that renders App.js and handles routing
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

import React, { Component } from 'react'
import Dashboard from './Dashboard'
import NodeView from './NodeView'
import * as Common from './Common'
import {
  BrowserRouter,
  Route,
} from 'react-router-dom'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refreshRate: Common.REFRESH,
    };
  }

  changeRefresh = (refreshRate) => {
    this.setState({
      refreshRate: refreshRate
    })
  }


  render() {
    return (
      <BrowserRouter>
        <React.Fragment>
          <Route
            exact path='/'
            render={(props) => <Dashboard {...props} refreshRate={this.state.refreshRate} changeRefresh={this.changeRefresh} />}
          />
          <Route
            path='/node/:uuid'
            render={(props) => <NodeView {...props} refreshRate={this.state.refreshRate} changeRefresh={this.changeRefresh} />}
          />
        </React.Fragment>

      </BrowserRouter>
    )
  }
}

export default App