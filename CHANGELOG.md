# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2021-05-10
### Added
- Created the 'Connection Manager'. This class is in charge of maintaining connection to Kraken and decide the best form of connection (polling or websocket)
- Put the Connection Manager in a Web Worker to offload all the connection and node organizing activites from the main thread.
### Changed
- Updated the icons with a new logo with transparent eyes
- Set websocket as the primary connection type
- Updated node_modules
### Fixed
- Fixed the node graph not automatically updating 
- Fixed a bug with the close button on the node graph 


## [0.1.1] - 2021-05-05
### Added
- Added this changelog (`CHANGELOG.md`)
- Added settings panel to graph viewer
### Changed
- Set polling mode to default until websocket mode gets fixed
- Set polling rate to 0.5 seconds
- Updated node_modules
### Fixed
- Fixed node graph crashing the app

## [0.1.0] - 2021-01-26
### Added
- Semantic versioning started.
### Changed
- Migrate from github.com/hpc/kraken-dashboard to github.com/kraken-hpc/kraken-dashboard
