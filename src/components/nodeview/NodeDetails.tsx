import React from 'react'
import { Node, base64ToUuid, stripProtoUrl, base64Convert } from '../../kraken-interactions/node'

interface NodeDetailsProps {
  cfgNode: Node
  dscNode: Node
}

export const NodeDetails = (props: NodeDetailsProps) => {
  var dscRunState = (typeof props.dscNode.runState !== 'undefined') ? props.dscNode.runState : ""
  var cfgRunState = (typeof props.cfgNode.runState !== 'undefined') ? props.cfgNode.runState : ""

  var dscPhysState = (typeof props.dscNode.physState !== 'undefined') ? props.dscNode.physState : ""
  var cfgPhysState = (typeof props.cfgNode.physState !== 'undefined') ? props.cfgNode.physState : ""

  var uuid = base64ToUuid(props.cfgNode.id)

  var parentUuid = ""

  if (props.cfgNode.parentId !== null && typeof props.cfgNode.parentId !== 'undefined') {
    parentUuid = base64ToUuid(props.cfgNode.parentId)
  } else {
    props.cfgNode.nodename = "Master"
  }

  var arch = (typeof props.cfgNode.arch !== 'undefined') ? props.cfgNode.arch : ""
  var platform = (typeof props.cfgNode.platform !== 'undefined') ? props.cfgNode.platform : ""

  var nodeIdRow = NodeDetailsRow("Node ID", 0, uuid)
  var parentIdRow = (parentUuid !== "") ? NodeDetailsRow("Parent ID", 0, parentUuid) : <React.Fragment />
  var physStateRow = NodeDetailsRow("Physical State", 0, `${dscPhysState} / ${cfgPhysState}`)
  var runStateRow = NodeDetailsRow("Run State", 0, `${dscRunState} / ${cfgRunState}`)
  var archRow = (arch !== "") ? NodeDetailsRow("Architecture", 0, arch) : <React.Fragment />
  var platformRow = (platform !== "") ? NodeDetailsRow("Platform", 0, platform) : <React.Fragment />

  // This is just for sorting the node extensions
  var extensions = []
  var jsxExtensions = []
  if (props.cfgNode.extensions !== undefined){
    for (var i = 0; i < props.cfgNode.extensions.length; i++) {
      extensions.push(props.cfgNode.extensions[i])
    }  
  }
  // Sorting the extensions by name
  extensions.sort(function (a, b) {
    if (stripProtoUrl(a['@type']) < stripProtoUrl(b['@type'])) { return -1; }
    if (stripProtoUrl(a['@type']) > stripProtoUrl(b['@type'])) { return 1; }
    return 0;
  })
  // Getting jsx versions of the extensions
  for (i = 0; i < extensions.length; i++) {
    if (Object.keys(extensions[i]).length > 1) {
      jsxExtensions.push(<GenericExtension extension={extensions[i]} key={i} />)
    }
  }

  // This is just for sorting the node services
  var services = []
  var jsxServices = []
  if (props.dscNode.services !== undefined){
    for (i = 0; i < props.dscNode.services.length; i++) {
      services.push(props.dscNode.services[i])
    }  
  }
  // Sorting the services by name
  services.sort(function (a, b) {
    if (stripProtoUrl(a['id']) < stripProtoUrl(b['id'])) { return -1; }
    if (stripProtoUrl(a['id']) > stripProtoUrl(b['id'])) { return 1; }
    return 0;
  })
  // Getting jsx versions of the services
  for (i = 0; i < services.length; i++) {
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
      {(jsxExtensions.length > 0)
        ?
        <h2>Extensions:</h2>
        : <React.Fragment />}
      {jsxExtensions}
      {(jsxServices.length > 0)
        ? <h2>Services:</h2>
        : <React.Fragment />}
      {jsxServices}
    </div>
  )
}

interface GenericExtensionProps {
  extension: any
}

const GenericExtension = (props: GenericExtensionProps) => {
  var extensionName = stripProtoUrl(props.extension['@type'])
  var rows = [];

  // Not sure why but the linter doesn't like the for loop
  // eslint-disable-next-line
  for (const key of Object.keys(props.extension)) {
    if (key === "@type") {
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
  var serviceName = stripProtoUrl(props.service['id'])
  var rows = [];

  // Not sure why but the linter doesn't like the for loop
  // eslint-disable-next-line
  for (const key of Object.keys(props.service)) {
    if (key === "id") {
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
  var returnVal = []
  if (Array.isArray(object)) {
    returnVal.push(NodeDetailsRow(key, depth))
    for (var i = 0; i < object.length; i++) {
      returnVal.push(RecursiveValues(object[i], i, depth))
    }
    // console.log(object.length)
  } else if (typeof object === "object") {
    returnVal.push(NodeDetailsRow(key, depth))
    // Not sure why but the linter doesn't like the for loop
    // eslint-disable-next-line
    for (const key of Object.keys(object)) {
      returnVal.push(RecursiveValues(object[key], key, depth))
    }
  } else if (typeof object === "boolean") {
    returnVal.push(NodeDetailsRow(key, depth, object.toString()))
  } else {
    returnVal.push(NodeDetailsRow(key, depth, base64Convert(key.toString(), object)))
    // console.log("recursion:", object, "=", typeof object)
  }

  return returnVal
}

const NodeDetailsRow = (key: string | number, depth: number, value?: string) => {
  var padding = ((depth - 1) * 15).toString() + 'px'

  return (<div style={{ paddingLeft: padding }} className={`node-view-row`} key={key}>
    <span className={`node-view-key`}>{key}:</span>
    <span className={`node-view-value`}>{value}</span>
  </div>)
}
