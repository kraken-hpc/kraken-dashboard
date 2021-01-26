import React from 'react'
import { Node, stripProtoUrl, mergeDSCandCFG } from '../../kraken-interactions/node'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import './styles/react-tabs.css'

interface NodeDetailsProps {
  cfgNode: Node
  dscNode: Node
}

export const NodeDetails = (props: NodeDetailsProps) => {
  const dscRunState = props.dscNode.runState !== undefined ? props.dscNode.runState : ''
  const cfgRunState = props.cfgNode.runState !== undefined ? props.cfgNode.runState : ''

  const dscPhysState = props.dscNode.physState !== undefined ? props.dscNode.physState : ''
  const cfgPhysState = props.cfgNode.physState !== undefined ? props.cfgNode.physState : ''

  const uuid = props.cfgNode.id

  let parentUuid = ''

  if (props.cfgNode.parentId !== null && props.cfgNode.parentId !== undefined) {
    parentUuid = props.cfgNode.parentId
  } else {
    props.cfgNode.nodename = 'Master'
  }

  const arch = props.cfgNode.arch !== undefined ? props.cfgNode.arch : ''
  const platform = props.cfgNode.platform !== undefined ? props.cfgNode.platform : ''

  const nodeIdRow = NodeDetailsRow('Node ID', 0, uuid)
  const parentIdRow = parentUuid !== '' ? NodeDetailsRow('Parent ID', 0, parentUuid) : <React.Fragment />
  const physStateRow = NodeDetailsCfgDscRow('Physical State', cfgPhysState, dscPhysState)
  const runStateRow = NodeDetailsCfgDscRow('Run State', cfgRunState, dscRunState)
  const archRow = arch !== '' ? NodeDetailsRow('Architecture', 0, arch) : <React.Fragment />
  const platformRow = platform !== '' ? NodeDetailsRow('Platform', 0, platform) : <React.Fragment />

  const mergedNode = mergeDSCandCFG(props.cfgNode, props.dscNode)
  // Combine cfg and dsc node extensions (dsc takes priority)
  const mergedJsxExtensions = getExtSrvs(mergedNode.extensions, '@type')
  // Combine cfg and dsc node services (dsc takes priority)
  const mergedJsxServices = getExtSrvs(mergedNode.services, 'id')

  const cfgJsxExtensions = getExtSrvs(props.cfgNode.extensions, '@type')
  const cfgJsxServices = getExtSrvs(props.cfgNode.services, 'id')

  const dscJsxExtensions = getExtSrvs(props.dscNode.extensions, '@type')
  const dscJsxServices = getExtSrvs(props.dscNode.services, 'id')

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
      <Tabs>
        <TabList>
          <Tab>Mixed</Tab>
          <Tab>CFG</Tab>
          <Tab>DSC</Tab>
        </TabList>
        <TabPanel>
          {mergedJsxExtensions.length > 0 ? <h2>Extensions:</h2> : <React.Fragment />}
          {mergedJsxExtensions}
          {mergedJsxServices.length > 0 ? <h2>Services:</h2> : <React.Fragment />}
          {mergedJsxServices}
        </TabPanel>
        <TabPanel>
          {cfgJsxExtensions.length > 0 ? <h2>Extensions:</h2> : <React.Fragment />}
          {cfgJsxExtensions}
          {cfgJsxServices.length > 0 ? <h2>Services:</h2> : <React.Fragment />}
          {cfgJsxServices}
        </TabPanel>
        <TabPanel>
          {dscJsxExtensions.length > 0 ? <h2>Extensions:</h2> : <React.Fragment />}
          {dscJsxExtensions}
          {dscJsxServices.length > 0 ? <h2>Services:</h2> : <React.Fragment />}
          {dscJsxServices}
        </TabPanel>
      </Tabs>
    </div>
  )
}

const getExtSrvs = (extSrvs: any[] | undefined, id: string): JSX.Element[] => {
  const jsx: JSX.Element[] = []

  if (extSrvs !== undefined) {
    // Sorting the extensions by name
    extSrvs.sort((a, b) => {
      if (stripProtoUrl(a[id]) < stripProtoUrl(b[id])) {
        return -1
      }
      if (stripProtoUrl(a[id]) > stripProtoUrl(b[id])) {
        return 1
      }
      return 0
    })
    // Getting jsx versions of the extensions
    for (let i = 0; i < extSrvs.length; i++) {
      jsx.push(<GenericExtSrv extSrv={extSrvs[i]} key={i} id={id} />)
    }
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
    if (key === props.id) {
      continue
    } else {
      rows.push(RecursiveValues(props.extSrv[key], key, 0))
    }
  }

  if (rows.length === 0) {
    return (
      <div>
        <div className={`info-title-single`}>{extensionName}</div>
      </div>
    )
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
  } else {
    returnVal.push(NodeDetailsRow(key, depth, object.toString()))
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

const NodeDetailsCfgDscRow = (title: string, cfgValue: string, dscValue: string) => {
  return (
    <div className={`cfg-dsc-row`} key={title}>
      <div className={`cfg-dsc-title`}>{title}:</div>
      <div className={`cfg-dsc-value-row`}>
        <div className={`cfg-dsc-value-container`}>
          <div className={`cfg-dsc-key`}>CFG:</div>
          <div className={`cfg-dsc-value`}>{cfgValue}</div>
        </div>
        <div className={`cfg-dsc-value-container`}>
          <div className={`cfg-dsc-key`}>DSC:</div>
          <div className={`cfg-dsc-value`}>{dscValue}</div>
        </div>
      </div>
    </div>
  )
}
