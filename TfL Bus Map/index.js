'use strict';

const svgWidth = 700;
const svgHeight = 500;

const svg = d3.select('svg')
  .style('border-style', 'solid')
  .attr('width', svgWidth)
  .attr('height', svgHeight);


(async function main() {

  let titleG = svg.append('g')
    .attr('id', 'titleLabel')
    .attr('font-family', 'monospace')
    .attr('transform', 'translate(100 400) scale(1.4)');

  titleG.append('text')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('font-size', '1em')
    .text('Bus Routes Map');

  let Pr = 40;

  svg.append('defs').append('path')
    .attr('id', 'circlePath')
    .attr('d', `M ${-Pr},0 ` +
      `a ${Pr},${Pr} 0 1,1 ${Pr * 2},0 ` +
      `M ${-Pr},0 ` +
      `a ${Pr},${Pr} 0 1,0 ${Pr * 2},0`);

  let topText = titleG.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '2');

  topText.append('textPath')
    .attr('href', '#circlePath')
    .attr('startOffset', '25%')
    .text('678 bus routes');

  let bottomText = titleG.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '5');

  bottomText.append('textPath')
    .attr('href', '#circlePath')
    .attr('startOffset', '75%')
    .text('9,950 bus stops');


  let londonTopo = await d3.json('./data_files/london-topojson.json');
  let londonData = topojson.feature(londonTopo, londonTopo.objects.london_geo);

  // used to the valid bus names
  // await getBusNames();

  let busRoute = await d3.json('./data_files/all-routes.json');

  // filter the out the "EntityNotFoundException" values
  let validBusRoute = busRoute.filter(o => !o.hasOwnProperty('exceptionType'));

  let lsFeature = validBusRoute.map((val) => ({
    // needed for geoJSON object
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: JSON.parse(val.lineStrings[0])[0]
    },

    // data about stops needed for later
    lineId: val.lineId,
    lineName: val.lineName,
    mode: val.mode,
  }));

  // get latitude and longitude data for bus station locations
  let latLongs = validBusRoute.map(val => val.stations).flat(1);
  let groupedLatLon = d3.group(latLongs, d => d.stationId);
  let nameLonLat = Array.from(groupedLatLon, ([key, value]) => ({
    lonLat: [value[0].lon, value[0].lat],
    name: value[0].name,
    id: value[0].id
  }));

  // just to set the size of the map in the line below
  let routesData = { type: 'FeatureCollection', features: lsFeature };

  let projection = d3.geoMercator()
    .fitSize([svgWidth, svgHeight], routesData);

  let path = d3.geoPath()
    .projection(projection);

  let boroughG = svg.append('g')
    .attr('fill', '#424748')
    .attr('stroke', '#ccc')
    .attr('stroke-linejoin', 'round');

  boroughG.selectAll('path')
    .data(londonData.features)
    .join('path')
    .attr('d', path)
    .append('title')
    .text(d => d.id);

  let busRoutesG = svg.append('g')
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-linejoin', 'round');

  busRoutesG.selectAll('path')
    .data(lsFeature)
    .join('path')
    .attr('id', d => d.mode + '-' + d.lineName)
    .attr('d', path);

  let busStopsG = svg.append('g')
    .attr('fill', 'green');

  // convert from lon,lat to x,y pairs
  let nameXY = nameLonLat.map((d) => ({
    xyPosition: projection(d.lonLat),
    name: d.name.replace(/\s+/g, '-')
      .replace(/['/]/g, '_'),
    id: 'n' + d.id
  }));

  // code to show bus stops as green dots
  busStopsG.selectAll('circle')
    .data(nameXY)
    .join('circle')
    .attr('id', d => d.name)
    .attr('class', d => d.id)
    .attr('cx', d => d.xyPosition[0])
    .attr('cy', d => d.xyPosition[1])
    .attr('r', 1);

  let startStation = svg.select('#Harrow-Town-Centre-_-St-John_s-Road');

  startStation
    .attr('fill', 'blue')
    .attr('r', 5)
    .raise();

  let naptanCodes = [startStation.attr('class')];
  let refStop = svg.select('#South-Harrow-Bus-Station');
  naptanCodes.push(refStop.attr('class'));

  let twoStops = nameXY.filter(d => naptanCodes.includes(d.id));
  let xyRadius = twoStops.map(d => d.xyPosition);

  function getDistance(arr0, arr1) {
    return ((arr1[1] - arr0[1]) ** 2 + (arr1[0] - arr0[0]) ** 2) ** 0.5
  }

  let xyRadiusValue = getDistance(xyRadius[0], xyRadius[1]);
  // distance I'm willing to walk to get
  // to the bus stop (in x, y coordinates)
  // this was around 22.66

  nameXY.forEach(e => (
    e.dist = getDistance(xyRadius[0], e.xyPosition)
  ));

  let localStops = nameXY.filter(e => e.dist <= xyRadiusValue);
  // let localStops = nameXY.filter(e => e.dist <= 42);
  // saved this value into json "local-bus-names"
  // let lStopsData = await Promise.all(localStops.map(e =>
  //   d3.json('https://api.tfl.gov.uk/StopPoint/' + e.id.slice(1))
  // ));
  // let busAtLocal = lStopsData;

  let busAtLocal = await d3.json('./data_files/local-bus-names.json');
  let busNames = busAtLocal.map(e => (e.lines).map(l => l.id)).flat();
  busNames = busNames.filter((v, i, arr) => arr.indexOf(v) === i);
  // makes busNames unique

  let busNamesId = busNames.map(e => '#bus-' + e).join(', ');

  let localBusElem = svg.selectAll(busNamesId);

  localBusElem
    .attr('stroke', 'yellow')
    .raise();

  // hide bus stops to reduce clutter
  busStopsG.style('visibility', 'hidden');

  // here, I _tried_ to get the start and end points of each
  // stations and plot circles based on that, but some stations
  // actually haven't been saved, because they have different names
  // in the TfL API, e.g. Golders Green Station and
  // Golders Green Underground Station

  /*
  let localBusDetails = validBusRoute.filter(
    d => busNames.includes(d.lineId));

  let localNaptan = localBusDetails.map(e =>
      [e.stopPointSequences[0].stopPoint.at(0).stationId,
       e.stopPointSequences[0].stopPoint.at(-1).stationId]
  ).flat().filter((v, i, arr) => arr.indexOf(v) === i);

  let localNaptanClasses = localNaptan.map(e => '.n'+e).join(', ')

  svg.selectAll(localNaptanClasses)
    .attr('r', 3)
    .style('visibility', 'visible');
  */

  // Above didn't work, I just manually put circles at
  // the end of the bus routes.

  let startPointsLocal = [];
  let endPointsLocal = [];

  localBusElem.each(function (d) {
    startPointsLocal.push(this.getPointAtLength(0));
    endPointsLocal.push(this.getPointAtLength(this.getTotalLength()));
  });

  let startStopLocalG = svg.append('g')
    .attr('fill', 'orange');

  startStopLocalG.selectAll('circle')
    .data([...startPointsLocal, ...endPointsLocal])
    .join('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 3);

  startStation
    .style('visibility', 'visible');

  busRoutesG
    .attr('stroke', 'rgba(255, 0, 0, 0.1)');

})();

async function getBusNames() {
  // replace static json file with https://api.tfl.gov.uk/Line/Route
  let busNumbers = await d3.json('./data_files/line-names.json');
  let modesGroup = d3.group(busNumbers, d => d.modeName);

  // valid keys for modesGroup (i.e. modeNames):
  // bus (678), national-rail (24), tube (11), river-bus (7),
  // dlr (1), elizabeth-line (1), cable-car (1), overground (1), tram (1)
}

