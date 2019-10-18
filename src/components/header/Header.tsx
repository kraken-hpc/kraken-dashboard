/* Classes.js: Contains react component classes that are used across the entire project
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import CSS from 'csstype'
import { COLORS } from '../../config'

interface HeaderProps {
  refreshRate: number
  handleRefreshChange: (refreshRate: number) => void
  useWebSocket: boolean
  handleWebsocketChange: (websocket: boolean) => void
}

export function Header(props: HeaderProps) {
  return (
    <div className={`header`}>
      <Link to={`/`} className={`header-link`}>
        <div className='header-text'>Kraken</div>
      </Link>
      <SettingsArea
        refreshRate={props.refreshRate}
        handleRefreshChange={props.handleRefreshChange}
        useWebSocket={props.useWebSocket}
        handleWebsocketChange={props.handleWebsocketChange}
      />
    </div>
  )
}

interface SettingsAreaProps {
  refreshRate: number
  handleRefreshChange: (refreshRate: number) => void
  useWebSocket: boolean
  handleWebsocketChange: (websocket: boolean) => void
}

interface SettingsAreaState {
  menuOpen: boolean
}

class SettingsArea extends React.Component<SettingsAreaProps, SettingsAreaState> {
  constructor(props: SettingsAreaProps) {
    super(props)

    this.state = {
      menuOpen: false,
    }
  }

  modalToggle() {
    this.setState({
      menuOpen: !this.state.menuOpen,
    })
  }

  render() {
    return (
      <React.Fragment>
        <svg
          onClick={() => this.modalToggle()}
          className={`settings`}
          id={`settings-button`}
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 20 20'>
          <path fill='none' d='M0 0h20v20H0V0z' />
          <path
            fill={COLORS.titleRed}
            d='M15.95 10.78c.03-.25.05-.51.05-.78s-.02-.53-.06-.78l1.69-1.32c.15-.12.19-.34.1-.51l-1.6-2.77c-.1-.18-.31-.24-.49-.18l-1.99.8c-.42-.32-.86-.58-1.35-.78L12 2.34c-.03-.2-.2-.34-.4-.34H8.4c-.2 0-.36.14-.39.34l-.3 2.12c-.49.2-.94.47-1.35.78l-1.99-.8c-.18-.07-.39 0-.49.18l-1.6 2.77c-.1.18-.06.39.1.51l1.69 1.32c-.04.25-.07.52-.07.78s.02.53.06.78L2.37 12.1c-.15.12-.19.34-.1.51l1.6 2.77c.1.18.31.24.49.18l1.99-.8c.42.32.86.58 1.35.78l.3 2.12c.04.2.2.34.4.34h3.2c.2 0 .37-.14.39-.34l.3-2.12c.49-.2.94-.47 1.35-.78l1.99.8c.18.07.39 0 .49-.18l1.6-2.77c.1-.18.06-.39-.1-.51l-1.67-1.32zM10 13c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z'
          />
        </svg>
        <SettingsModal
          menuOpen={this.state.menuOpen}
          refreshRate={this.props.refreshRate}
          handleRefreshChange={this.props.handleRefreshChange}
          useWebSocket={this.props.useWebSocket}
          handleWebsocketChange={this.props.handleWebsocketChange}
        />
      </React.Fragment>
    )
  }
}

interface SettingsModalProps {
  menuOpen: boolean
  refreshRate: number
  handleRefreshChange: (refreshRate: number) => void
  useWebSocket: boolean
  handleWebsocketChange: (websocket: boolean) => void
}

interface SettingsModalState {
  topHeight: string
  bottomHeight: string
  style: CSS.Properties
}

class SettingsModal extends React.Component<SettingsModalProps, SettingsModalState> {
  constructor(props: SettingsModalProps) {
    super(props)

    const topHeight = '7rem'
    const bottomHeight = '8rem'

    this.state = {
      topHeight: topHeight,
      bottomHeight: bottomHeight,
      style: {
        opacity: this.props.menuOpen ? 100 : 0,
        visibility: this.props.menuOpen ? 'visible' : 'hidden',
        top: this.props.menuOpen ? topHeight : bottomHeight,
      },
    }
  }

  componentDidUpdate(prevProps: SettingsModalProps) {
    if (prevProps.menuOpen !== this.props.menuOpen) {
      this.setState({
        style: {
          opacity: this.props.menuOpen ? 100 : 0,
          visibility: this.props.menuOpen ? 'visible' : 'hidden',
          top: this.props.menuOpen ? this.state.topHeight : this.state.bottomHeight,
        },
      })
    }
  }

  render() {
    return (
      <form className={`settings`} id={`settings-modal`} style={this.state.style}>
        <div className={`settings-row`}>
          <label>Reconnect Rate:</label>
          <input
            id='slider'
            name='refreshRate'
            type='range'
            min='0.15'
            max='2'
            value={this.props.refreshRate}
            onChange={event => {
              this.props.handleRefreshChange(parseFloat(event.target.value))
            }}
            step='.05'
          />
          <div id='slider-output'>{this.props.refreshRate}</div>
        </div>
        <div className={`settings-row`}>
          <label>Websocket:</label>
          <input
            style={{ margin: `auto 7px` }}
            name='websocket'
            type='checkbox'
            checked={this.props.useWebSocket}
            onChange={() => {
              this.props.handleWebsocketChange(!this.props.useWebSocket)
            }}
          />
        </div>
      </form>
    )
  }
}
