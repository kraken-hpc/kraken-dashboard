/* Classes.js: Contains react component classes that are used across the entire project
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

import React from 'react'
import * as Common from './Common'
import {
  Link,
} from 'react-router-dom'

export function Header(props) {
  return (
    <div className={`banner`}>
      <Link to={`/`}>
        <div className="banner_text">Kraken</div>
      </Link>
      <SettingsArea refreshRate={props.refreshRate} changeRefresh={props.changeRefresh} />
    </div>
  )
}

class SettingsArea extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      menuOpen: false,
    }
  }

  modalToggle() {
    this.setState({
      menuOpen: !this.state.menuOpen
    })
  }

  render() {
    return (
      <React.Fragment>
        <svg onClick={() => this.modalToggle()} className={`settings`} id={`settings_button`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="none" d="M0 0h20v20H0V0z" /><path fill={Common.GLOBAL_COLORS.title_red} d="M15.95 10.78c.03-.25.05-.51.05-.78s-.02-.53-.06-.78l1.69-1.32c.15-.12.19-.34.1-.51l-1.6-2.77c-.1-.18-.31-.24-.49-.18l-1.99.8c-.42-.32-.86-.58-1.35-.78L12 2.34c-.03-.2-.2-.34-.4-.34H8.4c-.2 0-.36.14-.39.34l-.3 2.12c-.49.2-.94.47-1.35.78l-1.99-.8c-.18-.07-.39 0-.49.18l-1.6 2.77c-.1.18-.06.39.1.51l1.69 1.32c-.04.25-.07.52-.07.78s.02.53.06.78L2.37 12.1c-.15.12-.19.34-.1.51l1.6 2.77c.1.18.31.24.49.18l1.99-.8c.42.32.86.58 1.35.78l.3 2.12c.04.2.2.34.4.34h3.2c.2 0 .37-.14.39-.34l.3-2.12c.49-.2.94-.47 1.35-.78l1.99.8c.18.07.39 0 .49-.18l1.6-2.77c.1-.18.06-.39-.1-.51l-1.67-1.32zM10 13c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" /></svg>
        <SettingsModal menuOpen={this.state.menuOpen} refreshRate={this.props.refreshRate} updateRefresh={this.props.changeRefresh} />
      </React.Fragment>
    )
  }
}

class SettingsModal extends React.Component {
  constructor(props) {
    super(props)

    var topHeight = "7rem"
    var bottomHeight = "8rem"

    this.state = {
      topHeight: topHeight,
      bottomHeight: bottomHeight,
      style: {
        opacity: (this.props.menuOpen) ? 100 : 0,
        visibility: (this.props.menuOpen) ? "visible" : "hidden",
        top: (this.props.menuOpen) ? topHeight : bottomHeight,
      },
    }

    this.updateRefresh = this.updateRefresh.bind(this)
  }

  updateRefresh(event) {
    this.props.updateRefresh(event.target.value)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.menuOpen !== this.props.menuOpen) {
      this.setState({
        style: {
          opacity: (nextProps.menuOpen) ? 100 : 0,
          visibility: (nextProps.menuOpen) ? "visible" : "hidden",
          top: (nextProps.menuOpen) ? this.state.topHeight : this.state.bottomHeight,
        }
      })
    }
  }

  render() {
    return (
      <form className={`settings`} id={`settings_modal`} style={this.state.style}>
        <label>Refresh Rate:</label>
        <input
          id="slider"
          name="refreshRate"
          type="range"
          min="0.15"
          max="2"
          value={this.props.refreshRate}
          onChange={this.updateRefresh}
          step=".05"
        />
        <div id="slider_output">{this.props.refreshRate}</div>
      </form>
    );
  }
}

