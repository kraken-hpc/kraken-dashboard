import { CSSProperties } from 'react'
import { COLORS } from '../../../config'

export const NodeGraphStyle: CSSProperties = {
  display: 'block',
  // width: 'auto',
  // height: '100%',
  flexGrow: 1,
  border: 'black',
  borderRadius: 8,
}

export const GraphAreaStyle: CSSProperties = {
  transitionProperty: 'all',
  transitionDuration: '0.1s',
  transitionTimingFunction: 'ease-out',
  position: 'fixed',
  display: 'flex',
  left: '2rem',
  right: '2rem',
  top: '2rem',
  height: '93%',
  fontFamily: 'Arial, Helvetica, sans-serif',
  zIndex: 101,
  backgroundColor: 'white',
  borderWidth: 'medium',
  borderStyle: 'solid',
  borderColor: COLORS.borderGrey,
  borderRadius: 10,
}

export const CloseButtonStyle: CSSProperties = {
  position: 'absolute',
  top: -16,
  left: -20,
  paddingTop: 4,
  paddingRight: 4,
  paddingBottom: 0,
  paddingLeft: 4,
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontWeight: 'bold',
  backgroundColor: 'white',
  borderWidth: 'medium',
  borderStyle: 'solid',
  borderColor: COLORS.borderGrey,
  borderRadius: 50,
  cursor: 'pointer',
}

export const GraphSettingsStyle: CSSProperties = {
  transitionDuration: '0.1s',
  transitionTimingFunction: 'ease-in-out',
  overflow: 'auto',
  paddingLeft: 5,
  paddingTop: 10,
}
