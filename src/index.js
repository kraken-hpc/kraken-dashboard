/* index.js: Root javascript that renders App.js
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './components/App'

ReactDOM.render(<App />, document.getElementById('root'))
