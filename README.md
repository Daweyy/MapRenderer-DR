# <img src="https://api.dofusretro.fr/img/map.png" height="20"> Map Renderer for Dofus Retro 

## About

Generate Dofus Retro maps as PNG, from [API.DofusRetro.fr](https://api.dofusretro.fr) datas

No images are provided with this project, if needed, they will be loaded from API and cached

## How to use
- Get [Bun](https://bun.sh/) runtime (not compatible with Node.JS anymore)


- Clone repository


- Install dependencies : 
```shell
bun install
```
- Run :
```shell
bun main.js <mapid>
# OR
bun run start <mapid>
```
- Find the result in output directory

## Unsupported features
- Random sprites
- Ground levels
- Rotations (partially)

[Feel free to contribute](https://github.com/Daweyy/MapRenderer-DR/fork)