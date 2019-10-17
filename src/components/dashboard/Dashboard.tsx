import React from "react";
import { Legend } from "./Legend";
import { Cluster } from "./Cluster";

interface DashboardProps {
  refreshRate: number;
  useWebSocket: boolean
}

export function Dashboard(props: DashboardProps) {
  return (
    <div style={{textAlign: `center`, display: `inline-block`}}>
      <Legend />
      <div className="node-area">
        <Cluster refreshRate={props.refreshRate} useWebSocket={props.useWebSocket}/>
      </div>
    </div>
  );
}
