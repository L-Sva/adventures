import Flatbush from './flatbush.js';

const canvasOptions = {
    width: 520,
    height: 500,
    basemapOffset: {
        dx: 50,
        dy: 80
    }
};

const canvas = document.getElementById('tfl-bus-map');
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');

// const dpr = window.devicePixelRatio ?? 1;
const dpr = 4;
canvas.width = canvasOptions.width * dpr;
canvas.height = canvasOptions.height * dpr;

// normalize coordinate system to use CSS pixels
ctx.scale(dpr, dpr);

canvas.style.width = canvasOptions.width + 'px';
canvas.style.height = canvasOptions.height + 'px';

const boundariesJSON = await fetch(
    './data_files/london-borough-boundaries.json');
let boroughData = await boundariesJSON.json();

ctx.strokeStyle = 'black';
ctx.lineWidth = 0.6;

ctx.textAlign = 'end';
ctx.font = '20px sans-serif';

ctx.translate(
    canvasOptions.basemapOffset.dx,
    canvasOptions.basemapOffset.dy
);

const boroughBoundary = new Map();
const boroughName = document.getElementById('borough-name');
const routeName = document.getElementById('route-name');
const routeDetails = document.getElementById('route-details');

for (const { WKT: linestring, Name } of boroughData) {
    const lines = linestring.slice(11, -1)
        .split(',')
        .map(pair => pair
            .split(' ')
            .map(coord => +coord)
        );

    const thisPath = new Path2D();
    thisPath.moveTo(...lines[0]);
    lines.slice(1).forEach(coords => thisPath.lineTo(...coords));
    ctx.stroke(thisPath);

    boroughBoundary.set(Name, thisPath);
}

const routesJSON = await fetch(
    './data_files/london-bus-routes.json');
let routesData = await routesJSON.json();

const busRoutes = new Map();
const boundingBoxes = [];

for (const route of routesData) {
    const lines = route.WKT.slice(11, -1)
        .split(',')
        .map(pair => pair
            .split(' ')
            .map(coord => +coord)
        );

    const xCoords = lines.map(e => e[0]);
    const yCoords = lines.map(e => e[1]);
    boundingBoxes.push([
        Math.min(...xCoords), Math.min(...yCoords),
        Math.max(...xCoords), Math.max(...yCoords)
    ]);

    ctx.strokeStyle = route.direction === 'inbound' ?
        '#006F2E' : '#E32118';

    const thisPath = new Path2D();
    thisPath.moveTo(...lines[0]);
    lines.slice(1).forEach(coords => thisPath.lineTo(...coords));
    ctx.stroke(thisPath);

    busRoutes.set(`${route.lineName} (${route.direction})`, {
        path2d: thisPath,
        routeName: route.routeName
    });
}

const londonBase = ctx.getImageData(
    0, 0, ctx.canvas.width, ctx.canvas.height);

const FBindex = new Flatbush(busRoutes.size);
boundingBoxes.forEach(bounds => FBindex.add(...bounds));
FBindex.finish();

let PAUSE_FLAG = false;
let PREV_MATCH = null;

canvas.addEventListener('pointermove', hoverEffects);
document.body.addEventListener('keydown',
    ({ key }) => { if (key === 'Control') PAUSE_FLAG = true; }
);
document.body.addEventListener('keyup',
    ({ key }) => { if (key === 'Control') PAUSE_FLAG = false; }
);

function hoverEffects({ offsetX, offsetY }) {
    if (PAUSE_FLAG) return;

    const matchRoute = detectPointOnLine(offsetX, offsetY);
    routeName.textContent = matchRoute.lineTitle ?? '';
    routeDetails.textContent = matchRoute.routeName ?? '';

    const matchBorough = detectPointInPolygon(offsetX, offsetY);

    // nothing matches, reset image;
    if (PREV_MATCH !== matchBorough || matchBorough === null) {
        ctx.putImageData(londonBase, 0, 0);

        ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
        ctx.fill(boroughBoundary.get(matchBorough));
        boroughName.textContent = matchBorough ?? '';

        PREV_MATCH = matchBorough;
    }
}

function detectPointInPolygon(offsetX, offsetY) {
    const matchingBoxes = boroughBoundary;

    for (const [bName, bPath] of matchingBoxes) {
        if (ctx.isPointInPath(
            bPath, offsetX * dpr, offsetY * dpr
        )) return bName;
    }

    return null;
}

const busRouteKeys = Array.from(busRoutes.keys());

function detectPointOnLine(offsetX, offsetY) {
    const matchingIndexes = FBindex.search(
        (offsetX - canvasOptions.basemapOffset.dx),
        (offsetY - canvasOptions.basemapOffset.dy),
        (offsetX - canvasOptions.basemapOffset.dx),
        (offsetY - canvasOptions.basemapOffset.dy)
    );

    const matchingBoxes = matchingIndexes
        .map(idx => busRouteKeys.at(idx))
        .map(key => [key, busRoutes.get(key)]);

    for (const [lineTitle, {
        path2d: rPath, routeName
    }] of matchingBoxes) {
        if (ctx.isPointInStroke(
            rPath, offsetX * dpr, offsetY * dpr
        )) return { lineTitle, routeName };
    }

    return { lineTitle: null, routeName: null };
}


// optimise code using OffScreenCanvas & WebWorker
// loading screen - see London boroughs being drawn real-time as data gets fetched?
