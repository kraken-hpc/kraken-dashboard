import React, { Component } from 'react'
import { NodeStateOptions, Category } from '../../kraken-interactions/nodeStateOptions'
import { COLORS } from '../../config'
import { SketchPicker } from 'react-color'

export type NodeArea = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT' | 'BORDER'

export interface NodeColorInfo {
  TOP: { category: string; valuesToColor: { value: string; color: string }[] }
  RIGHT: { category: string; valuesToColor: { value: string; color: string }[] }
  LEFT: { category: string; valuesToColor: { value: string; color: string }[] }
  BOTTOM: { category: string; valuesToColor: { value: string; color: string }[] }
  BORDER: { category: string; valuesToColor: { value: string; color: string }[] }
}

interface NodeColorProps {
  nodeStateOptions: NodeStateOptions | undefined
  currentColorConfig: NodeColorInfo
}

interface NodeColorState {
  selected: NodeArea
}

export class NodeColor extends Component<NodeColorProps, NodeColorState> {
  constructor(props: NodeColorProps) {
    super(props)

    this.state = {
      selected: 'TOP',
    }
  }

  changeSelectedArea = (area: NodeArea) => {
    this.setState({
      selected: area,
    })
  }

  render() {
    return (
      <div className={`node-color-area`}>
        <NodeAreaSelector
          selected={this.state.selected}
          colorInfo={this.props.currentColorConfig}
          changeSelectedArea={this.changeSelectedArea}
        />
        <NodeColorDetails
          selectedArea={this.state.selected}
          stateOptions={this.props.nodeStateOptions}
          currentColorConfig={this.props.currentColorConfig}
        />
      </div>
    )
  }
}

interface NodeAreaSelectorProps {
  selected: NodeArea
  colorInfo: NodeColorInfo
  changeSelectedArea: (area: NodeArea) => void
}

const NodeAreaSelector = (props: NodeAreaSelectorProps) => {
  return (
    <div className={`area-selector-area`}>
      <div className={`color-square`}>
        <div
          style={props.selected === 'BORDER' ? { borderColor: COLORS.red } : { borderColor: 'transparent' }}
          className={`color-square-border-border`}
        />
        <div
          style={{ borderColor: props.colorInfo.BORDER.valuesToColor[0].color }}
          className={`color-square-border`}
          onClick={() => {
            props.changeSelectedArea('BORDER')
          }}
        />
        <div className={`color-square-mask`}>
          <div
            style={{ backgroundColor: props.colorInfo.TOP.valuesToColor[0].color }}
            className={`color-square-top`}
            onClick={() => {
              console.log('clicked top!')
              props.changeSelectedArea('TOP')
            }}
          />
          <div
            style={{ backgroundColor: props.colorInfo.RIGHT.valuesToColor[0].color }}
            className={`color-square-right`}
            onClick={() => {
              props.changeSelectedArea('RIGHT')
            }}
          />
          <div
            style={{ backgroundColor: props.colorInfo.BOTTOM.valuesToColor[0].color }}
            className={`color-square-bottom`}
            onClick={() => {
              props.changeSelectedArea('BOTTOM')
            }}
          />
          <div
            style={{ backgroundColor: props.colorInfo.LEFT.valuesToColor[0].color }}
            className={`color-square-left`}
            onClick={() => {
              props.changeSelectedArea('LEFT')
            }}
          />
        </div>
        <div
          style={props.selected === 'TOP' ? { borderTopColor: COLORS.red } : { borderTopColor: 'transparent' }}
          className={`color-square-top-border`}
        />
        <div
          style={props.selected === 'RIGHT' ? { borderRightColor: COLORS.red } : { borderRightColor: 'transparent' }}
          className={`color-square-right-border`}
        />
        <div
          style={props.selected === 'BOTTOM' ? { borderBottomColor: COLORS.red } : { borderBottomColor: 'transparent' }}
          className={`color-square-bottom-border`}
        />
        <div
          style={props.selected === 'LEFT' ? { borderLeftColor: COLORS.red } : { borderLeftColor: 'transparent' }}
          className={`color-square-left-border`}
        />
      </div>
    </div>
  )
}

interface NodeColorDetailsProps {
  selectedArea: NodeArea
  stateOptions: NodeStateOptions | undefined
  currentColorConfig: NodeColorInfo
}

interface NodeColorDetailsState {
  selectedValueName: string
  selectedCategory: string
  availableCategoryNames: string[]
  availableValues: string[]
  currentColorsForAvailableValues: Map<string, string>
}

class NodeColorDetails extends Component<NodeColorDetailsProps, NodeColorDetailsState> {
  constructor(props: NodeColorDetailsProps) {
    super(props)

    const stateInfo = this.getState()

    this.state = {
      selectedValueName: stateInfo.availableValues[0],
      selectedCategory: stateInfo.selectedCategory,
      availableCategoryNames: stateInfo.availableCategoryNames,
      availableValues: stateInfo.availableValues,
      currentColorsForAvailableValues: stateInfo.currentColorsForAvailableValues,
    }
  }

  getState = (): {
    selectedCategory: string
    availableCategoryNames: string[]
    availableValues: string[]
    currentColorsForAvailableValues: Map<string, string>
  } => {
    let availableCategories: Category[] = []
    let availableValues: string[] = []
    let availableCategoryNames: string[] = []
    const currentColorsForAvailableValues: Map<string, string> = new Map()

    const selectedCategory = this.props.currentColorConfig[this.props.selectedArea].category

    if (this.props.stateOptions !== undefined) {
      availableCategories = this.props.stateOptions.state_categories
    }

    availableCategories.forEach(category => {
      availableCategoryNames.push(category.name)
      if (category.name === selectedCategory) {
        availableValues = category.options
      }
    })

    availableValues.forEach(value => {
      this.props.currentColorConfig[this.props.selectedArea].valuesToColor.forEach(valueToColor => {
        if (valueToColor.value === value) {
          currentColorsForAvailableValues.set(value, valueToColor.color)
        }
      })
    })

    return { selectedCategory, availableCategoryNames, availableValues, currentColorsForAvailableValues }
  }

  componentDidUpdate = (prevProps: NodeColorDetailsProps) => {
    if (prevProps !== this.props) {
      const stateInfo = this.getState()
      let selectedValueName = stateInfo.availableValues[0]
      if (
        this.state.selectedValueName !== undefined &&
        stateInfo.currentColorsForAvailableValues.get(this.state.selectedValueName) !== undefined
      ) {
        selectedValueName = this.state.selectedValueName
      }
      this.setState({
        selectedValueName: selectedValueName,
        selectedCategory: stateInfo.selectedCategory,
        availableCategoryNames: stateInfo.availableCategoryNames,
        availableValues: stateInfo.availableValues,
        currentColorsForAvailableValues: stateInfo.currentColorsForAvailableValues,
      })
    }
  }

  changeSelectedValue = (valueName: string) => {
    this.setState({
      selectedValueName: valueName,
    })
  }

  render() {
    if (this.props.stateOptions === undefined) {
      return <div>state options undefined</div>
    }

    return (
      <div className={`color-details-area`}>
        <h1>{this.props.selectedArea}</h1>
        <div className={`color-selection-area`}>
          <div className={`color-details-row`}>
            <div style={{ display: 'inline-block', margin: 'auto 10px' }}>Category:</div>
            <DropDown options={this.state.availableCategoryNames} value={this.state.selectedCategory} />
          </div>
          <div>
            {this.state.availableValues.map(value => {
              return (
                <div
                  className={`color-details-row`}
                  style={
                    this.state.selectedValueName === value
                      ? { borderColor: 'grey', cursor: 'pointer' }
                      : { cursor: 'pointer' }
                  }
                  onClick={() => {
                    this.changeSelectedValue(value)
                  }}>
                  <div
                    className={`color-details-row-key`}
                    style={{ display: 'inline-block', margin: 'auto 10px' }}>{`${value}:`}</div>
                  <div
                    className={`color-details-current-square`}
                    style={{ backgroundColor: this.state.currentColorsForAvailableValues.get(value) }}
                  />
                </div>
              )
            })}
          </div>
          <SketchPicker
            presetColors={Object.values(COLORS)}
            disableAlpha={true}
            color={this.state.currentColorsForAvailableValues.get(this.state.selectedValueName)}
          />
        </div>
      </div>
    )
  }
}

interface DropDownProps {
  options: string[]
  value: string
}

interface DropDownState {
  open: boolean
}

class DropDown extends Component<DropDownProps, DropDownState> {
  constructor(props: DropDownProps) {
    super(props)
    this.state = {
      open: false,
    }
  }

  toggleDropDown = () => {
    this.setState({
      open: !this.state.open,
    })
  }

  render() {
    return (
      <div>
        <div className={`dropdown-button`} onClick={this.toggleDropDown}>
          {this.props.value}
        </div>
        <div
          style={this.state.open ? { visibility: 'visible' } : { visibility: 'hidden' }}
          className={`dropdown-options`}>
          {this.props.options.map((option: string) => {
            return <div>{option}</div>
          })}
        </div>
      </div>
    )
  }
}
