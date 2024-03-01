'use strict';

const canvasOptions = {
    width: 600,
    height: 400
};

const canvas = document.getElementById('tfl-bus-map');
canvas.width = canvasOptions.width;
canvas.height = canvasOptions.height;

const ctx = canvas.getContext('2d');

ctx.fillStyle = 'green';
ctx.fillRect(10, 10, 150, 100);
