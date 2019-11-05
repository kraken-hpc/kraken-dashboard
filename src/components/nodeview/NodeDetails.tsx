import React from 'react'
import { Node, base64ToUuid, stripProtoUrl, base64Convert } from '../../kraken-interactions/node'
import { string } from 'prop-types'

interface NodeDetailsProps {
  cfgNode: Node
  dscNode: Node
}

export const NodeDetails = (props: NodeDetailsProps) => {
  const dscRunState = props.dscNode.runState !== undefined ? props.dscNode.runState : ''
  const cfgRunState = props.cfgNode.runState !== undefined ? props.cfgNode.runState : ''

  const dscPhysState = props.dscNode.physState !== undefined ? props.dscNode.physState : ''
  const cfgPhysState = props.cfgNode.physState !== undefined ? props.cfgNode.physState : ''

  const uuid = base64ToUuid(props.cfgNode.id)

  let parentUuid = ''

  if (props.cfgNode.parentId !== null && props.cfgNode.parentId !== undefined) {
    parentUuid = base64ToUuid(props.cfgNode.parentId)
  } else {
    props.cfgNode.nodename = 'Master'
  }

  const arch = props.cfgNode.arch !== undefined ? props.cfgNode.arch : ''
  const platform = props.cfgNode.platform !== undefined ? props.cfgNode.platform : ''

  const nodeIdRow = NodeDetailsRow('Node ID', 0, uuid)
  const parentIdRow = parentUuid !== '' ? NodeDetailsRow('Parent ID', 0, parentUuid) : <React.Fragment />
  const physStateRow = NodeDetailsRow('Physical State', 0, `${dscPhysState} / ${cfgPhysState}`)
  const runStateRow = NodeDetailsRow('Run State', 0, `${dscRunState} / ${cfgRunState}`)
  const archRow = arch !== '' ? NodeDetailsRow('Architecture', 0, arch) : <React.Fragment />
  const platformRow = platform !== '' ? NodeDetailsRow('Platform', 0, platform) : <React.Fragment />

  // Combine cfg and dsc node extensions (dsc takes priority)
  const jsxExtensions = getExtSrvs(props.cfgNode.extensions, props.dscNode.extensions, '@type')

  // Combine cfg and dsc node services (dsc takes priority)
  const jsxServices = getExtSrvs(props.cfgNode.services, props.dscNode.services, 'id')

  return (
    <div className={`node-detail`}>
      <h1 className={`node-title`}>{props.cfgNode.nodename}</h1>
      <div className={`non-bordered-detail`}>
        {nodeIdRow}
        {parentIdRow}
        {physStateRow}
        {runStateRow}
        {archRow}
        {platformRow}
      </div>
      {jsxExtensions.length > 0 ? <h2>Extensions:</h2> : <React.Fragment />}
      {jsxExtensions}
      {jsxServices.length > 0 ? <h2>Services:</h2> : <React.Fragment />}
      {jsxServices}
    </div>
  )
}

const getExtSrvs = (cfg: any[] | undefined, dsc: any[] | undefined, id: string): JSX.Element[] => {
  const map: Map<string, any> = new Map()

  if (cfg !== undefined) {
    for (let i = 0; i < cfg.length; i++) {
      map.set(cfg[i][id], cfg[i])
    }
  }

  if (dsc !== undefined) {
    for (let i = 0; i < dsc.length; i++) {
      const obj = map.get(dsc[i][id])
      if (obj !== undefined) {
        const merged = { ...obj, ...dsc[i] }
        map.set(obj[id], merged)
      } else {
        map.set(dsc[i][id], dsc[i])
      }
    }
  }

  const array = Array.from(map.values())
  const jsx: JSX.Element[] = []

  // Sorting the extensions by name
  array.sort((a, b) => {
    if (stripProtoUrl(a[id]) < stripProtoUrl(b[id])) {
      return -1
    }
    if (stripProtoUrl(a[id]) > stripProtoUrl(b[id])) {
      return 1
    }
    return 0
  })
  // Getting jsx versions of the extensions
  for (let i = 0; i < array.length; i++) {
    jsx.push(<GenericExtSrv extSrv={array[i]} key={i} id={id} />)
  }
  return jsx
}

interface GenericExtSrvProps {
  extSrv: any
  id: string
}

const GenericExtSrv = (props: GenericExtSrvProps) => {
  const extensionName = stripProtoUrl(props.extSrv[props.id])
  const rows = []

  for (const key of Object.keys(props.extSrv)) {
    if (key === '@type') {
      continue
    } else {
      rows.push(RecursiveValues(props.extSrv[key], key, 0))
    }
  }

  if (rows.length === 0) {
    return <div className={`info-title-single`}>{extensionName}</div>
  } else {
    return (
      <div className={`bordered-detail`}>
        <div className={`info-title`}>{extensionName}</div>
        {rows}
      </div>
    )
  }
}

const RecursiveValues = (object: any, key: string | number, depth: number): any[] => {
  depth++
  const returnVal = []
  if (Array.isArray(object)) {
    returnVal.push(NodeDetailsRow(key, depth))
    for (let i = 0; i < object.length; i++) {
      returnVal.push(RecursiveValues(object[i], i, depth))
    }
  } else if (typeof object === 'object') {
    returnVal.push(NodeDetailsRow(key, depth))
    for (const key of Object.keys(object)) {
      returnVal.push(RecursiveValues(object[key], key, depth))
    }
  } else if (object === Boolean) {
    returnVal.push(NodeDetailsRow(key, depth, object.toString()))
  } else {
    returnVal.push(NodeDetailsRow(key, depth, base64Convert(key.toString(), object.toString())))
  }

  return returnVal
}

const NodeDetailsRow = (key: string | number, depth: number, value?: string) => {
  const padding = ((depth - 1) * 15).toString() + 'px'

  return (
    <div style={{ paddingLeft: padding }} className={`node-view-row`} key={key}>
      <span className={`node-view-key`}>{key}:</span>
      <span className={`node-view-value`}>{value}</span>
    </div>
  )
}
