import React from "react";
import { COLORS } from "../../config";

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Legend</div>
      <div className="row" id="first-row">
        <div className="value" id="phys-text">
          Phys
        </div>
        <div
          className={`square`}
          style={{
            borderTopColor: COLORS.grey,
            borderRightColor: COLORS.black,
            borderBottomColor: COLORS.black,
            borderLeftColor: COLORS.grey
          }}
        ></div>
        <div className="value" id="run-text">
          Run
        </div>
      </div>
      <div className="row">
        <div
          className={`square`}
          style={{ borderColor: COLORS.yellow }}
        ></div>
        <div className="value">State Unknown</div>
      </div>
      <div className="row">
        <div
          className={`square`}
          style={{ borderColor: COLORS.grey }}
        ></div>
        <div className="value">Power Off</div>
      </div>
      <div className="row">
        <div
          className={`square`}
          style={{ borderColor: COLORS.blue }}
        ></div>
        <div className="value">Initializing</div>
      </div>
      <div className="row">
        <div
          className={`square`}
          style={{ borderColor: COLORS.green }}
        ></div>
        <div className="value">Power On / Sync</div>
      </div>
      <div className="row">
        <div
          className={`square`}
          style={{ borderColor: COLORS.purple }}
        ></div>
        <div className="value">Hang</div>
      </div>
      <div className="row">
        <div
          className={`square`}
          style={{ borderColor: COLORS.red }}
        ></div>
        <div className="value">Error</div>
      </div>
    </div>
  );
}
