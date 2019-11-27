import React, { Component } from 'react'
import { NodeColorInfo, NodeColorInfoArea, NodeArea } from '../settings/NodeColor'
import { cloneDeep } from 'lodash'

interface LegendProps {
  colorInfo: NodeColorInfo
}

interface LegendState {
  leftWidth: number | undefined
  rightWidth: number | undefined
}

export class Legend extends Component<LegendProps, LegendState> {
  leftText: React.RefObject<any>
  rightText: React.RefObject<any>
  constructor(props: LegendProps) {
    super(props)
    this.leftText = React.createRef()
    this.rightText = React.createRef()
    this.state = {
      leftWidth: undefined,
      rightWidth: undefined,
    }
  }

  sortCategories = (categoriesUsed: Map<string, NodeColorInfoArea>): NodeColorInfoArea[] => {
    let finalCategories: NodeColorInfoArea[] = []

    categoriesUsed.forEach((colorInfo, name) => {
      const newColorInfo: NodeColorInfoArea = cloneDeep(colorInfo)
      newColorInfo.category = name
      finalCategories.push(newColorInfo)
    })

    finalCategories = finalCategories.sort((a, b) => {
      return a.category.localeCompare(b.category)
    })

    return finalCategories
  }

  componentDidMount = () => {
    if (this.leftText.current.offsetWidth > this.rightText.current.offsetWidth) {
      this.setState({
        rightWidth: this.leftText.current.offsetWidth + 7,
      })
    } else if (this.leftText.current.offsetWidth < this.rightText.current.offsetWidth) {
      this.setState({
        leftWidth: this.rightText.current.offsetWidth + 7,
      })
    }
  }

  render = () => {
    const categoriesUsed: Map<string, NodeColorInfoArea> = new Map()
    const legendColorInfo: NodeColorInfo = cloneDeep(this.props.colorInfo)

    Object.entries(legendColorInfo).forEach(([nodeArea, colorInfo]: [string, NodeColorInfoArea]) => {
      categoriesUsed.set(colorInfo.category, colorInfo)
      // Check if another area has the same category but a different dsc/cfg value
      Object.entries(legendColorInfo).forEach(([otherNodeArea, otherColorInfo]: [string, NodeColorInfoArea]) => {
        if (nodeArea !== otherNodeArea) {
          if (otherColorInfo.category === colorInfo.category && otherColorInfo.DSCorCFG !== colorInfo.DSCorCFG) {
            categoriesUsed.set(`${colorInfo.category}(${colorInfo.DSCorCFG})`, colorInfo)
            categoriesUsed.delete(colorInfo.category)
          }
        }
      })
    })

    Object.entries(this.props.colorInfo).forEach(([nodeArea, colorInfo]: [string, NodeColorInfoArea]) => {
      const newNodeArea = nodeArea as NodeArea
      const categoryUsed = categoriesUsed.get(colorInfo.category)
      if (categoryUsed === undefined) {
        // This area had it's name changed
        categoriesUsed.forEach((otherColorInfo, otherCategoryName) => {
          if (colorInfo.category === otherColorInfo.category && colorInfo.DSCorCFG === otherColorInfo.DSCorCFG) {
            legendColorInfo[newNodeArea].category = otherCategoryName
          }
        })
      }
    })

    const finalCategoriesUsed = this.sortCategories(categoriesUsed)

    return (
      <div className='legend'>
        <div className='legend-title'>Legend</div>
        <div className='row' id='first-row'>
          <div id='top-text'>
            {legendColorInfo.TOP.category.charAt(0).toUpperCase() + legendColorInfo.TOP.category.slice(1)}
          </div>
          <div id='middle-row'>
            <div
              id='left-text'
              ref={this.leftText}
              style={this.state.leftWidth !== null ? { width: `${this.state.leftWidth}px` } : {}}>
              {legendColorInfo.LEFT.category.charAt(0).toUpperCase() + legendColorInfo.LEFT.category.slice(1)}
            </div>
            <div
              className={`square-border`}
              style={{ backgroundColor: Array.from(legendColorInfo.BORDER.valuesToColor.values())[0].color }}>
              <div
                className={`square`}
                style={{
                  borderTopColor: Array.from(legendColorInfo.TOP.valuesToColor.values())[0].color,
                  borderRightColor: Array.from(legendColorInfo.RIGHT.valuesToColor.values())[0].color,
                  borderBottomColor: Array.from(legendColorInfo.BOTTOM.valuesToColor.values())[0].color,
                  borderLeftColor: Array.from(legendColorInfo.LEFT.valuesToColor.values())[0].color,
                  width: '0%',
                }}
              />
            </div>
            <div
              id='right-text'
              ref={this.rightText}
              style={this.state.rightWidth !== null ? { width: `${this.state.rightWidth}px` } : {}}>
              {legendColorInfo.RIGHT.category.charAt(0).toUpperCase() + legendColorInfo.RIGHT.category.slice(1)}
            </div>
          </div>
          <div id='bottom-text'>
            {legendColorInfo.BOTTOM.category.charAt(0).toUpperCase() + legendColorInfo.BOTTOM.category.slice(1)}
          </div>
          <div id='border-text'>
            {legendColorInfo.BORDER.category.charAt(0).toUpperCase() + legendColorInfo.BORDER.category.slice(1)}
          </div>
        </div>

        {finalCategoriesUsed.map((colorInfo: NodeColorInfoArea) => {
          return <Category nodeColorInfoArea={colorInfo} key={colorInfo.category} />
        })}
      </div>
    )
  }
}

interface CategoryProps {
  nodeColorInfoArea: NodeColorInfoArea
}

const Category = (props: CategoryProps): JSX.Element => {
  return (
    <div>
      <div className={`legend-category-title`}>{`${props.nodeColorInfoArea.category.charAt(0).toUpperCase() +
        props.nodeColorInfoArea.category.slice(1)}:`}</div>
      {Array.from(props.nodeColorInfoArea.valuesToColor.entries()).map(([valuesToColorKey, valuesToColor]) => {
        return (
          <div className={`legend-color-value-row`} key={valuesToColor.enum}>
            <div className={`legend-color`} style={{ backgroundColor: valuesToColor.color }} />
            <div className={`legend-value`}>{valuesToColorKey}</div>
          </div>
        )
      })}
    </div>
  )
}
