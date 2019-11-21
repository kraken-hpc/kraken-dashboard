import React, { Component } from 'react'
import { NodeStateCategory } from '../../kraken-interactions/nodeStateOptions'
import { COLORS } from '../../config'
import { SketchPicker, ColorResult } from 'react-color'
import { DSCorCFG } from '../../kraken-interactions/node'
import { cloneDeep } from 'lodash'

export type NodeArea = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT' | 'BORDER'

export interface NodeColorInfo {
  TOP: NodeColorInfoArea
  RIGHT: NodeColorInfoArea
  LEFT: NodeColorInfoArea
  BOTTOM: NodeColorInfoArea
  BORDER: NodeColorInfoArea
}

export interface NodeColorInfoArea {
  category: string
  DSCorCFG: DSCorCFG
  valuesToColor: { value: string; color: string }[]
}

interface NodeColorProps {
  nodeStateOptions: NodeStateCategory[] | undefined
  currentColorConfig: NodeColorInfo
  changeColorInfo: (newColorInfo: NodeColorInfo) => void
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
          changeColorInfo={this.props.changeColorInfo}
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
  stateOptions: NodeStateCategory[] | undefined
  currentColorConfig: NodeColorInfo
  changeColorInfo: (newColorInfo: NodeColorInfo) => void
}

interface NodeColorDetailsState {
  selectedValueName: string
  selectedAreaInfo: NodeColorInfoArea
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
      selectedAreaInfo: stateInfo.selectedAreaInfo,
      availableCategoryNames: stateInfo.availableCategoryNames,
      availableValues: stateInfo.availableValues,
      currentColorsForAvailableValues: stateInfo.currentColorsForAvailableValues,
    }
  }

  getState = (): {
    selectedAreaInfo: NodeColorInfoArea
    availableCategoryNames: string[]
    availableValues: string[]
    currentColorsForAvailableValues: Map<string, string>
  } => {
    let availableCategories: NodeStateCategory[] = []
    let availableValues: string[] = []
    let availableCategoryNames: string[] = []
    const currentColorsForAvailableValues: Map<string, string> = new Map()

    const selectedAreaInfo: NodeColorInfoArea = this.props.currentColorConfig[this.props.selectedArea]

    if (this.props.stateOptions !== undefined) {
      availableCategories = this.props.stateOptions
    }

    availableCategories.forEach(category => {
      availableCategoryNames.push(category.name)
      if (category.name === selectedAreaInfo.category) {
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

    return { selectedAreaInfo, availableCategoryNames, availableValues, currentColorsForAvailableValues }
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
        selectedAreaInfo: stateInfo.selectedAreaInfo,
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

  handleCategoryChange = (newCategory: string) => {
    const newColorInfo: NodeColorInfo = cloneDeep(this.props.currentColorConfig)
    const newValuesToColor: { value: string; color: string }[] = []
    let newCategoryOptions: string[] = []
    let foundCategory: boolean = false

    // Check if category (and dscorcfg) is being used in another node area first
    Object.values(this.props.currentColorConfig).forEach((key: NodeColorInfoArea) => {
      if (key.category === newCategory && key.DSCorCFG === 'DSC') {
        // We found another area has our same category. Lets use what it has for colors
        foundCategory = true
        newColorInfo[this.props.selectedArea].category = newCategory
        newColorInfo[this.props.selectedArea].DSCorCFG = 'DSC'
        newColorInfo[this.props.selectedArea].valuesToColor = key.valuesToColor
      }
    })

    // If category isn't found on another node area, create it from scratch
    if (!foundCategory) {
      if (this.props.stateOptions !== undefined) {
        this.props.stateOptions.forEach(element => {
          if (element.name === newCategory) {
            newCategoryOptions = element.options
          }
        })
      }
      newCategoryOptions.forEach(newOption => {
        newValuesToColor.push({ value: newOption, color: COLORS.grey })
      })
      newColorInfo[this.props.selectedArea].DSCorCFG = 'DSC'
      newColorInfo[this.props.selectedArea].category = newCategory
      newColorInfo[this.props.selectedArea].valuesToColor = newValuesToColor
    }

    this.props.changeColorInfo(newColorInfo)
  }

  handleDSCCFGChange = (newValue: DSCorCFG) => {
    const newColorInfo: NodeColorInfo = cloneDeep(this.props.currentColorConfig)
    newColorInfo[this.props.selectedArea].DSCorCFG = newValue

    // Check if category (and dscorcfg) is being used in another node area first
    Object.entries(this.props.currentColorConfig).forEach(([key, value]: [string, NodeColorInfoArea]) => {
      const keyArea = key as NodeArea
      if (keyArea !== this.props.selectedArea) {
        if (value.category === newColorInfo[this.props.selectedArea].category && value.DSCorCFG === newValue) {
          // We found another area has our same category and this new DSCorCFG value. Lets use what it has for colors
          newColorInfo[this.props.selectedArea].valuesToColor = value.valuesToColor
        }
      }
    })

    this.props.changeColorInfo(newColorInfo)
  }

  handleColorChange = (newColor: ColorResult) => {
    const newColorInfo: NodeColorInfo = cloneDeep(this.props.currentColorConfig)
    const newValuesToColor: { value: string; color: string }[] = []
    newColorInfo[this.props.selectedArea].valuesToColor.forEach(element => {
      if (element.value === this.state.selectedValueName) {
        newValuesToColor.push({ value: element.value, color: newColor.hex })
      } else {
        newValuesToColor.push(element)
      }
    })
    newColorInfo[this.props.selectedArea].valuesToColor = newValuesToColor

    // Check if category (and dscorcfg) is being used in another node area first
    Object.entries(this.props.currentColorConfig).forEach(([key, value]: [string, NodeColorInfoArea]) => {
      const keyArea = key as NodeArea
      if (keyArea !== this.props.selectedArea) {
        if (
          value.category === newColorInfo[this.props.selectedArea].category &&
          value.DSCorCFG === newColorInfo[this.props.selectedArea].DSCorCFG
        ) {
          // We found another area has our same category and DSCorCFG value. Lets change it's colors to what we are changing to
          newColorInfo[keyArea].valuesToColor = newValuesToColor
        }
      }
    })

    this.props.changeColorInfo(newColorInfo)
  }

  render() {
    if (this.props.stateOptions === undefined) {
      return <div>state options undefined</div>
    }

    return (
      <div className={`color-details-area`}>
        <h1>{this.props.selectedArea}</h1>
        <div className={`color-selection-area`}>
          <div>
            <div className={`color-details-row`}>
              <div style={{ display: 'inline-block', margin: 'auto 10px' }}>Category:</div>
              <DropDown
                options={this.state.availableCategoryNames}
                value={this.state.selectedAreaInfo.category}
                onChange={this.handleCategoryChange}
              />
            </div>
            <div className={`color-details-row`}>
              <div style={{ display: 'inline-block', margin: 'auto 10px' }}>DSC or CFG:</div>
              <DropDown
                options={['DSC', 'CFG']}
                value={this.state.selectedAreaInfo.DSCorCFG}
                onChange={this.handleDSCCFGChange}
              />
            </div>
          </div>
          <div>
            {this.state.availableValues.map(value => {
              return (
                <div
                  className={`color-details-row`}
                  key={value}
                  style={
                    this.state.selectedValueName === value
                      ? { borderColor: COLORS.borderGrey, cursor: 'pointer', backgroundColor: '#f0f0f0' }
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
            onChange={this.handleColorChange}
          />
        </div>
      </div>
    )
  }
}

interface DropDownProps {
  options: string[]
  value: string
  onChange: (newValue: any) => void
}

interface DropDownState {
  open: boolean
}

class DropDown extends Component<DropDownProps, DropDownState> {
  dropDownRef: HTMLDivElement | null = null
  constructor(props: DropDownProps) {
    super(props)
    this.state = {
      open: false,
    }
  }

  componentDidMount = () => {
    document.addEventListener('mousedown', this.handleClick, false)
  }

  handleClick = (e: any) => {
    // Close dropdown if click happens anywhere outside of it
    if (this.dropDownRef !== null && !this.dropDownRef.contains(e.target)) {
      this.setState({
        open: false,
      })
    }
  }

  toggleDropDown = () => {
    this.setState({
      open: !this.state.open,
    })
  }

  render() {
    return (
      <div ref={node => (this.dropDownRef = node)}>
        <div className={this.state.open ? `dropdown-button active` : `dropdown-button`} onClick={this.toggleDropDown}>
          {this.props.value}
          <span className={`arrow`} />
        </div>
        <div className={`dropdown-options`}>
          {this.props.options.map((option: string) => {
            return (
              <div
                key={option}
                className={this.state.open ? `dropdown-option active` : `dropdown-option`}
                onClick={() => {
                  this.props.onChange(option)
                  this.setState({
                    open: false,
                  })
                }}>
                {option}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
