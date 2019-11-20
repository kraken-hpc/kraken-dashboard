import React from 'react'
import { NodeColorInfo, NodeColorInfoArea } from '../settings/NodeColor'

interface LegendProps {
  colorInfo: NodeColorInfo
}

export function Legend(props: LegendProps) {
  const categoriesUsed: Map<string, NodeColorInfoArea> = new Map()

  Object.entries(props.colorInfo).forEach(([nodeArea, colorInfo]) => {
    const newColorInfo = colorInfo as NodeColorInfoArea
    categoriesUsed.set(newColorInfo.category, newColorInfo)
  })

  return (
    <div className='legend'>
      <div className='legend-title'>Legend</div>
      <div className='row' id='first-row'>
        <div id='top-text'>
          {props.colorInfo.TOP.category.charAt(0).toUpperCase() + props.colorInfo.TOP.category.slice(1)}
        </div>
        <div id='middle-row'>
          <div id='left-text'>
            {props.colorInfo.LEFT.category.charAt(0).toUpperCase() + props.colorInfo.LEFT.category.slice(1)}
          </div>
          <div className={`square-border`} style={{ backgroundColor: props.colorInfo.BORDER.valuesToColor[0].color }}>
            <div
              className={`square`}
              style={{
                borderTopColor: props.colorInfo.TOP.valuesToColor[0].color,
                borderRightColor: props.colorInfo.RIGHT.valuesToColor[0].color,
                borderBottomColor: props.colorInfo.BOTTOM.valuesToColor[0].color,
                borderLeftColor: props.colorInfo.LEFT.valuesToColor[0].color,
                width: '0%',
              }}
            />
          </div>
          <div id='right-text'>
            {props.colorInfo.RIGHT.category.charAt(0).toUpperCase() + props.colorInfo.RIGHT.category.slice(1)}
          </div>
        </div>
        <div id='bottom-text'>
          {props.colorInfo.BOTTOM.category.charAt(0).toUpperCase() + props.colorInfo.BOTTOM.category.slice(1)}
        </div>
        <div id='border-text'>
          {props.colorInfo.BORDER.category.charAt(0).toUpperCase() + props.colorInfo.BORDER.category.slice(1)}
        </div>
      </div>

      {Array.from(categoriesUsed.values()).map(category => {
        return <Category nodeColorInfoArea={category} />
      })}
    </div>
  )
}

interface CategoryProps {
  nodeColorInfoArea: NodeColorInfoArea
}

const Category = (props: CategoryProps): JSX.Element => {
  return (
    <div>
      <div className={`legend-category-title`}>{`${props.nodeColorInfoArea.category.charAt(0).toUpperCase() +
        props.nodeColorInfoArea.category.slice(1)}:`}</div>
      {props.nodeColorInfoArea.valuesToColor.map(valuesToColor => {
        return (
          <div className={`legend-color-value-row`}>
            <div className={`legend-color`} style={{ backgroundColor: valuesToColor.color }} />
            <div className={`legend-value`}>{valuesToColor.value}</div>
          </div>
        )
      })}
    </div>
  )
}
