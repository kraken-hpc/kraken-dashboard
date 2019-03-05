# Kraken Dashboard
kraken-dashboard is a web application created using [Node.js](https://nodejs.org) and [React](https://reactjs.org/). It's purpose is to give a visual monitor of a system controlled by [Kraken](https://github.com/hpc/kraken)

## Getting Started
### Prerequisites
The only requirement for kraken-dashboard is nodejs. Once this is installed, you can use npm to install all the other dependencies.
* [Node.js](https://nodejs.org)
* [yarn](https://yarnpkg.com/lang/en/docs/install)
```
sudo yum install nodejs
```

### Starting a development server
1. Clone the repository: `git clone https://github.com/hpc/kraken-dashboard.git`
2. Go into the kraken-dashboard directory: `cd kraken-dashboard`
3. To install all node modules run: `yarn` (This is only nessesary after a fresh clone)
4. To start the development server run: `yarn start` (This should open a browser automatically otherwise go to localhost:3000)
5. Enjoy!

### Build an electron application
1. Clone the repository: `git clone https://github.com/hpc/kraken-dashboard.git`
2. Go into the kraken-dashboard directory: `cd kraken-dashboard`
3. To install all node modules run: `yarn` (This is only nessesary after a fresh clone)
4. To build the electron app: `yarn electron-pack` (this will build the electron application in the `dist` folder)
5. Enjoy!

## Configuration
The most common configuration settings are in `src/components/Common.js`. Here you can change the ip address of your kraken instance so the dashboard will poll information from the correct ip. You can also set the default refresh rate here.
```
export var KRAKEN_IP = '192.168.57.10:3141'
export var REFRESH = 0.5
```

---
## Examples:
The Dashboard is the main screen that will show information about all the nodes in a cluster that Kraken is managing.
![Dashboard](https://i.imgur.com/WxCjWM4.png)

---
The node view gives more details on a specific node and can be accessed by clicking on the node in the dashboard screen. It includes information about all extensions and services as well as discoverable and configuration state of the node. At the bottom of the page is the mutation node graph.

Mutation graph colors:
* Red: The current mutation node or edge
* Green: Nodes and edges that in the current mutation path
* Grey: All possible mutation nodes and edges
![NodeView](https://i.imgur.com/DjdTQhL.png)