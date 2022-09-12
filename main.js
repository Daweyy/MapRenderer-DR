const axios = require('axios');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const imgPath = 'https://cdn.dofusretro.fr/img/maps-gfx'; // + /[ground,object]/[id].png
const CONSTANTS = {
  CELL_WIDTH: 53,
  CELL_HEIGHT: 27,
  CELL_HALF_WIDTH: 26.5,
  CELL_HALF_HEIGHT: 13.5,
  LEVEL_HEIGHT: 20,
  HALF_LEVEL_HEIGHT: 10,
  DEFAULT_MAP_WIDTH: 15,
  DEFAULT_MAP_HEIGHT: 17,
  MAX_DEPTH_IN_MAP: 100000,
};

let groundJson, objectJson = {};

async function loadJSON() {
  groundJson = (await axios.get(`${imgPath}/ground/ground.json`)).data;
  objectJson = (await axios.get(`${imgPath}/object/object.json`)).data;
}

function getCellPos(cellId, nbCellPerRow) {
  const pos = { x: 0, y: 0 };
  let id = cellId;

  while (id > 0) {
    const nbCellOnThisRow = pos.y % 2 === 0 ? nbCellPerRow : nbCellPerRow - 1;
    if (id >= nbCellOnThisRow) {
      pos.y++;
      id -= nbCellOnThisRow;
    } else {
      pos.x += id;
      id = 0;
    }
  }
  return pos;
}

function rotateImage(image, rotation) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.translate(image.width / 2, image.height / 2);
  ctx.rotate(rotation);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  return canvas;
}

async function generateMap(mapid) {
  axios.get(`https://api.dofusretro.fr/maps/${mapid}/`).then(async (response) => {
    await loadJSON();
    const mapData = response.data;
    if (!mapData.cellsData.length > 0) {
      console.error('No data found');
      return;
    };
    const startTime = new Date();
    const imageDim = {
      width: (mapData.width - 1) * CONSTANTS.CELL_WIDTH,
      height: (mapData.height - 1) * CONSTANTS.CELL_HEIGHT,
    };

    const mapCanvas = createCanvas(imageDim.width, imageDim.height);

    const context = mapCanvas.getContext('2d');
    if (mapData.backgroundNum > 0) {
      const backgroundImage = await loadImage(`${imgPath}/ground/${mapData.backgroundNum}.png`);
      context.drawImage(backgroundImage, 0, 0, imageDim.width, imageDim.height);
    }

    for (let i = 0; i < mapData.cellsData.length; i++) {
      let cell = mapData.cellsData[i];
      if (cell.layerGroundNum > 0) {
        let groundImage = await loadImage(`${imgPath}/ground/${cell.layerGroundNum}.png`);
        const cellPos = getCellPos(cell.id, mapData.width);
        const y = cellPos.y * CONSTANTS.CELL_HALF_HEIGHT;
        let x = cellPos.x * CONSTANTS.CELL_WIDTH;
        if (cellPos.y % 2 === 1) {
          x += CONSTANTS.CELL_HALF_WIDTH;
        }
        const origin = {
          x: groundJson.sprites[cell.layerGroundNum].x,
          y: groundJson.sprites[cell.layerGroundNum].y,
        };
        const pos = {
          x: x + origin.x,
          y: y + origin.y,
        };
        context.save();
        if (cell.layerGroundFlip) {
          context.scale(-1, 1);
          pos.x = -pos.x - groundImage.width;
        }
        if (cell.layerGroundRot > 0) {
          groundImage = rotateImage(groundImage, ((cell.layerGroundRot * 90) * Math.PI) / 180);
        }
        context.drawImage(groundImage, pos.x, pos.y);
        context.restore();
      }
    };

    for (let i = 0; i < mapData.cellsData.length; i++) {
      let cell = mapData.cellsData[i];
      if (cell.layerObject1Num > 0) {
        let image = await loadImage(`${imgPath}/object/${cell.layerObject1Num}.png`);
        const cellPos = getCellPos(cell.id, mapData.width);
        const y = cellPos.y * CONSTANTS.CELL_HALF_HEIGHT;
        let x = cellPos.x * CONSTANTS.CELL_WIDTH;
        if (cellPos.y % 2 === 1) {
          x += CONSTANTS.CELL_HALF_WIDTH;
        }
        const origin = {
          x: objectJson.sprites[cell.layerObject1Num].x,
          y: objectJson.sprites[cell.layerObject1Num].y,
        };
        context.save();
        if (cell.layerObject1Rot > 0) {
          image = rotateImage(image, ((cell.layerObject1Rot * 90) * Math.PI) / 180);
        }
        const pos = {
          x: x + origin.x,
          y: y + origin.y,
        };
        if (cell.layerObject1Flip) {
          context.scale(-1, 1);
          pos.x = -pos.x - image.width;
        }
        context.drawImage(image, pos.x, pos.y);
        context.restore();
      }
    };

    for (let i = 0; i < mapData.cellsData.length; i++) {
      let cell = mapData.cellsData[i];
      if (cell.layerObject2Num > 0) {
        const image = await loadImage(`${imgPath}/object/${cell.layerObject2Num}.png`);
        const cellPos = getCellPos(cell.id, mapData.width);
        const y = cellPos.y * CONSTANTS.CELL_HALF_HEIGHT;
        let x = cellPos.x * CONSTANTS.CELL_WIDTH;
        if (cellPos.y % 2 === 1) {
          x += CONSTANTS.CELL_HALF_WIDTH;
        }
        const origin = {
          x: objectJson.sprites[cell.layerObject2Num].x,
          y: objectJson.sprites[cell.layerObject2Num].y,
        };
        const pos = {
          x: x + origin.x,
          y: y + origin.y,
        };
        context.save();
        if (cell.layerObject2Flip) {
          context.scale(-1, 1);
          pos.x = -pos.x - image.width;
        }
        context.drawImage(image, pos.x, pos.y);
        context.restore();
      }
    };

    const buffer = mapCanvas.toBuffer('image/png');
    if (!fs.existsSync(`./output`)) fs.mkdirSync(`./output`);
    fs.writeFileSync(`./output/${mapid}.png`, buffer);
    console.log(`Map ${mapid} rendered in ${new Date() - startTime}ms ! (output/${mapid}.png)`);
  }).catch((error) => {
    console.error((error.response) ? error.response.data : error);
  });
}

if (process.argv[2]) {
  if (Number.isInteger(parseInt(process.argv[2]))) {
    generateMap(process.argv[2]);
  } else {
    console.error('Mapid must be numeric');
  }
} else {
  console.error('Please provide a mapid as argument');
}
