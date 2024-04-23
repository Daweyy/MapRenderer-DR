import { createCanvas, loadImage } from "@napi-rs/canvas";

const API_URL = "https://api.dofusretro.fr";
const LOCAL_PATH = "./data";
const GFX_PATH = "img/maps-gfx";

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

let grounds = {};
let objects = {};

async function loadJSON(type) {
	const path = `${LOCAL_PATH}/${type}.json`;
	let file = Bun.file(path);
	if (!(await file.exists())) {
		const response = await fetch(`${API_URL}/${GFX_PATH}/${type}/${type}.json`);
		await Bun.write(file, response);
		file = Bun.file(path);
	}
	return await file.json();
}

async function getImage(id, type) {
	const path = `${LOCAL_PATH}/${type}/${id}.png`;
	let file = Bun.file(path);
	if (!(await file.exists())) {
		const response = await fetch(`${API_URL}/${GFX_PATH}/${type}/${id}.png`);
		await Bun.write(file, response);
		file = Bun.file(path);
	}
	const buffer = await file.arrayBuffer();
	return await loadImage(buffer);
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
	const ctx = canvas.getContext("2d");
	ctx.translate(image.width / 2, image.height / 2);
	ctx.rotate(rotation);
	ctx.drawImage(image, -image.width / 2, -image.height / 2);
	return canvas;
}

async function renderMap(mapid) {
	const mapRequest = await fetch(`${API_URL}/maps/${mapid}`);
	const mapData = await mapRequest.json();
	if (!mapData.cellsData) {
		console.error("No data found for mapid", mapid);
		return;
	}
	grounds = await loadJSON("ground");
	objects = await loadJSON("object");

	const imageDimensions = {
		width: (mapData.width - 1) * CONSTANTS.CELL_WIDTH,
		height: (mapData.height - 1) * CONSTANTS.CELL_HEIGHT,
	};

	const mapCanvas = createCanvas(imageDimensions.width, imageDimensions.height);

	const ctx = mapCanvas.getContext("2d");
	if (mapData.backgroundNum > 0) {
		const image = await getImage(mapData.backgroundNum, "ground");
		ctx.drawImage(image, 0, 0, imageDimensions.width, imageDimensions.height);
	}

	for (let i = 0; i < mapData.cellsData.length; i++) {
		const cell = mapData.cellsData[i];
		if (cell.layerGroundNum > 0) {
			let image = await getImage(cell.layerGroundNum, "ground");
			const cellPos = getCellPos(i, mapData.width);
			const y = cellPos.y * CONSTANTS.CELL_HALF_HEIGHT;
			let x = cellPos.x * CONSTANTS.CELL_WIDTH;
			if (cellPos.y % 2 === 1) {
				x += CONSTANTS.CELL_HALF_WIDTH;
			}
			const origin = {
				x: grounds.sprites[cell.layerGroundNum].x,
				y: grounds.sprites[cell.layerGroundNum].y,
			};
			const pos = {
				x: x + origin.x,
				y: y + origin.y,
			};
			ctx.save();
			if (cell.layerGroundFlip) {
				ctx.scale(-1, 1);
				pos.x = -pos.x - image.width;
			}
			if (cell.layerGroundRot > 0) {
				image = rotateImage(image, (cell.layerGroundRot * 90 * Math.PI) / 180);
			}
			ctx.drawImage(image, pos.x, pos.y);
			ctx.restore();
		}
	}

	for (let i = 0; i < mapData.cellsData.length; i++) {
		const cell = mapData.cellsData[i];
		if (cell.layerObject1Num > 0) {
			let image = await getImage(cell.layerObject1Num, "object");
			const cellPos = getCellPos(i, mapData.width);
			const y = cellPos.y * CONSTANTS.CELL_HALF_HEIGHT;
			let x = cellPos.x * CONSTANTS.CELL_WIDTH;
			if (cellPos.y % 2 === 1) {
				x += CONSTANTS.CELL_HALF_WIDTH;
			}
			const origin = {
				x: objects.sprites[cell.layerObject1Num].x,
				y: objects.sprites[cell.layerObject1Num].y,
			};
			ctx.save();
			if (cell.layerObject1Rot > 0) {
				image = rotateImage(image, (cell.layerObject1Rot * 90 * Math.PI) / 180);
			}
			const pos = {
				x: x + origin.x,
				y: y + origin.y,
			};
			if (cell.layerObject1Flip) {
				ctx.scale(-1, 1);
				pos.x = -pos.x - image.width;
			}
			ctx.drawImage(image, pos.x, pos.y);
			ctx.restore();
		}
	}

	for (let i = 0; i < mapData.cellsData.length; i++) {
		const cell = mapData.cellsData[i];
		if (cell.layerObject2Num > 0) {
			const image = await getImage(cell.layerObject2Num, "object");
			const cellPos = getCellPos(i, mapData.width);
			const y = cellPos.y * CONSTANTS.CELL_HALF_HEIGHT;
			let x = cellPos.x * CONSTANTS.CELL_WIDTH;
			if (cellPos.y % 2 === 1) {
				x += CONSTANTS.CELL_HALF_WIDTH;
			}
			const origin = {
				x: objects.sprites[cell.layerObject2Num].x,
				y: objects.sprites[cell.layerObject2Num].y,
			};
			const pos = {
				x: x + origin.x,
				y: y + origin.y,
			};
			ctx.save();
			if (cell.layerObject2Flip) {
				ctx.scale(-1, 1);
				pos.x = -pos.x - image.width;
			}
			ctx.drawImage(image, pos.x, pos.y);
			ctx.restore();
		}
	}

	const buffer = mapCanvas.toBuffer("image/png");
	const file = Bun.file(`./output/${mapid}.png`);
	await Bun.write(file, buffer);
	console.log(
		`Map ${mapid} rendered in ${Math.round(
			Bun.nanoseconds() / 1_000_000,
		).toLocaleString()}ms`,
	);
}

if (!process.argv[2]) {
	console.error("Please provide a mapid as argument");
	process.exit(1);
}
if (!Number.isInteger(+process.argv[2])) {
	console.error("Mapid must be numeric");
	process.exit(1);
}
renderMap(process.argv[2]);
