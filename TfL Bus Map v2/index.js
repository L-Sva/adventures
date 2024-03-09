'use strict';

const canvasOptions = {
    width: 520,
    height: 450,
    basemapOffset: {
        dx: 50,
        dy: 30
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

for (const route of routesData) {
    const lines = route.WKT.slice(11, -1)
        .split(',')
        .map(pair => pair
            .split(' ')
            .map(coord => +coord)
        );

    ctx.strokeStyle = route.direction === 'inbound' ?
        '#006F2E' : '#E32118';

    const thisPath = new Path2D();
    thisPath.moveTo(...lines[0]);
    lines.slice(1).forEach(coords => thisPath.lineTo(...coords));
    ctx.stroke(thisPath);

    busRoutes.set(route.lineId, {
        path2d: thisPath,
        lineName: route.lineName,
        direction: route.direction,
        routeName: route.routeName
    });
}

const londonBase = ctx.getImageData(
    0, 0, ctx.canvas.width, ctx.canvas.height);

canvas.addEventListener('pointermove', hoverEffects);

let PREV_MATCH = null;

function hoverEffects({ offsetX, offsetY }) {
    const pointX = offsetX * dpr;
    const pointY = offsetY * dpr;

    const matchBName = detectPointInPolygon(pointX, pointY);

    // nothing matches, reset image;
    if (PREV_MATCH !== matchBName || matchBName === null) {
        ctx.putImageData(londonBase, 0, 0);

        ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
        ctx.fill(boroughBoundary.get(matchBName));
        ctx.fillText(matchBName ?? '', 460, 0);

        PREV_MATCH = matchBName;
    }
}

function detectPointInPolygon(pointX, pointY) {
    // TODO check if point not inside canvas?
    // find point in any of bounding boxes, then...
    const matchingBoxes = boroughBoundary;

    for (const [bName, bPath] of matchingBoxes) {
        if (ctx.isPointInPath(bPath, pointX, pointY)) {
            return bName;
        }
    }

    return null;
}

// show text outside, on overlayed DIV


// const link = document.createElement('a');
// link.download = 'routes-showing.png';
// link.href = canvas.toDataURL();
// link.click();

// optimise code using OffScreenCanvas & WebWorker
// multilayered canvas?
// loading screen - see London boroughs being drawn real-time as data gets fetched?

// add: tools used heading to all readme files, e.g. Javascript, sqlite, imagemagick (behind the scenes, to make the images) here