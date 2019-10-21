import React from 'react'
import { Node, base64ToUuid, stripProtoUrl, base64Convert } from '../../kraken-interactions/node'

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

  // This is just for sorting the node extensions
  const extensions = []
  const jsxExtensions = []
  if (props.cfgNode.extensions !== undefined) {
    for (let i = 0; i < props.cfgNode.extensions.length; i++) {
      extensions.push(props.cfgNode.extensions[i])
    }
  }
  // Sorting the extensions by name
  extensions.sort(function(a, b) {
    if (stripProtoUrl(a['@type']) < stripProtoUrl(b['@type'])) {
      return -1
    }
    if (stripProtoUrl(a['@type']) > stripProtoUrl(b['@type'])) {
      return 1
    }
    return 0
  })
  // Getting jsx versions of the extensions
  for (let i = 0; i < extensions.length; i++) {
    if (Object.keys(extensions[i]).length > 1) {
      jsxExtensions.push(<GenericExtension extension={extensions[i]} key={i} />)
    }
  }

  // This is just for sorting the node services
  const services = []
  const jsxServices = []
  if (props.cfgNode.services !== undefined) {
    for (let i = 0; i < props.cfgNode.services.length; i++) {
      services.push(props.cfgNode.services[i])
    }
  }
  // Sorting the services by name
  services.sort(function(a, b) {
    if (stripProtoUrl(a['id']) < stripProtoUrl(b['id'])) {
      return -1
    }
    if (stripProtoUrl(a['id']) > stripProtoUrl(b['id'])) {
      return 1
    }
    return 0
  })
  // Getting jsx versions of the services
  for (let i = 0; i < services.length; i++) {
    if (Object.keys(services[i]).length > 1) {
      jsxServices.push(<GenericService service={services[i]} key={i} />)
    }
  }

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

interface GenericExtensionProps {
  extension: any
}

const GenericExtension = (props: GenericExtensionProps) => {
  const extensionName = stripProtoUrl(props.extension['@type'])
  const rows = []

  for (const key of Object.keys(props.extension)) {
    if (key === '@type') {
      continue
    } else {
      rows.push(RecursiveValues(props.extension[key], key, 0))
    }
  }

  return (
    <div className={`bordered-detail`}>
      <div className={`info-title`}>{extensionName}</div>
      {rows}
    </div>
  )
}

interface GenericServiceProps {
  service: any
}

const GenericService = (props: GenericServiceProps) => {
  const serviceName = stripProtoUrl(props.service.id)
  const rows = []

  for (const key of Object.keys(props.service)) {
    if (key === 'id') {
      continue
    } else {
      rows.push(RecursiveValues(props.service[key], key, 0))
    }
  }

  return (
    <div className={`bordered-detail`}>
      <div className={`info-title`}>{serviceName}</div>
      {rows}
    </div>
  )
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
