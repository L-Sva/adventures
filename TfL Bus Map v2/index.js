'use strict';

const canvasOptions = {
    width: 540,
    height: 420
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

// change to fetching from file
const boundariesJSON = await fetch(
    './data_files/london-borough-boundaries.json');
let boroughData = await boundariesJSON.json();

ctx.strokeStyle = 'black';
ctx.lineWidth = 0.6;

ctx.translate(30, 30);

for (const { WKT: linestring, Name } of boroughData) {
    const lines = linestring.slice(11, -1)
        .split(',')
        .map(pair => pair
            .split(' ')
            .map(coord => +coord)
        );

    ctx.beginPath();
    ctx.moveTo(...lines[0]);
    lines.slice(1).forEach(coords => ctx.lineTo(...coords));
    ctx.stroke();

    // Name
}

ctx.resetTransform();


// const link = document.createElement('a');
// link.download = 'london-basemap.png';
// link.href = canvas.toDataURL();
// link.click();
