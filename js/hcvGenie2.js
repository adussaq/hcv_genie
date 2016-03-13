/*global amd_ww, hcvGenie, PDFJS console, document, checkPromises, jQuery*/
var hcvGenie = {};
var medianSignals = [];
var posDistances = [];
hcvGenie.findBands = (function () {
    'use strict';

     //Notes: This library has a few dependencies
        // 1) The browser being used must support promises
            // Since no version of IE (11 current) support these, a
            // library to add them in will need to load at the top of
            // the page.
        // 2) The browser being used must support web workers
        // 3) The package amd_ww.js is required for running web workers


    //Functions
    var findBandLocations, findGreenRectangles, findGreenRegion,
            pdf2canvas, processCanvas, makeCanvasObject,
            main, findPositiveNeighborRegion, outlineRectangle,
            numericalSort, calculateMedian, medianGrey, round,
            callGenotype,
    //Constants
            roundDigit = 10000,
            // greenXYZ = [76.28056296, -35.52371953, 23.79405389],
            greenXYZ = [76.2806, -35.5237, 23.7941],
            labColorSectionSide = 75, //Through testing this (75) seems the
                                      // fastest
            //No need to run this if there aren't at least 4 x areas
            labColorDistMaxArea = labColorSectionSide * labColorSectionSide * 4,
            minGreenDist = 15, minimum_green_edge = 10,
            minimum_grey_edge = 0.025,
            //The following two sets of data were established using 853 example
            // bands across 10 gels. This was measured by varying the scale
            // uniformly random from 2 to 5 from the pdf sample sent to me.

            // The first set using only the average width
            // and height of the rectangles, the second set looks at the average
            // distances for all the bands that are <= #6 and averages those
            // distances as an additional, less variant, more highly weighted
            // solution.
            //Derived from training sets
            distance_constant_band_rat = 0.020734842905516,
            distance_height_band_rat = 0.116001002429100,
            distance_width_band_rat = 1.255947650078826,
            //Post better six score calc
            distance2_constant_band_rat = 0.004844371294825,
            distance2_height_band_rat = -0.050834339328904,
            distance2_width_band_rat = 0.150816456427006,
            distance2_sixScore_band_rat = 1.009819205853457,
            minimumMedianGrey = 0.145,
                // For 20 pages the results were as follows (Min Grey Edge 0.025)
                //pgs 1-20 after list correction 1:
                // {falsePos: 2, falseNeg: 36, truePos: 1822, trueNeg: 5065, possibleBands: 6925}

    //Global Objects
            colorDistanceWorker, houghTransformWorker, edgeDetectionWorker,
            vertHoughTransformWorker;

    colorDistanceWorker = amd_ww.startWorkers({
        filename: './js/workers/colorDistanceWorker.min.js',
        num_workers: 4
    });

    houghTransformWorker = amd_ww.startWorkers({
        filename: './js/workers/houghTransformWorker.min.js',
        num_workers: 2 //Since Hough Transforms and edge detection often
                        // run simultaneously
    });

    vertHoughTransformWorker = amd_ww.startWorkers({
        filename: './js/workers/vertHoughTransformWorker.min.js',
        num_workers: 2 //Since Hough Transforms and edge detection often
                        // run simultaneously
    });

    edgeDetectionWorker = amd_ww.startWorkers({
        filename: './js/workers/edgeDetectionWorker.min.js',
        num_workers: 2 //Since Hough Transforms and edge detection often
                        // run simultaneously
    });

    calculateMedian = function (array) {
        var medArr;

        medArr = JSON.parse(JSON.stringify(array));
        medArr.sort(numericalSort);

        return (medArr[Math.floor(medArr.length / 2)] +
                medArr[Math.ceil(medArr.length / 2)]) / 2;
    };

    callGenotype = function (lane) {
        // console.log('trying',binarySolution, lane);
        return function (genotypeCall) {
            lane.genotype = genotypeCall;
            return genotypeCall;
        };
    };

    outlineRectangle = function (rectParams, color, myCanvas) {
        var phi, thetaA, r, inc = 0, cosPhi, sinPhi, tempPhi, aShift,
                x0 = rectParams.x0, y0 = rectParams.y0,
                w = rectParams.width, h = rectParams.height,
                theta0 = rectParams.theta, thetaS;
        thetaA = Math.atan2(h, w);
        //theta0 = 0;
        thetaS = thetaA + theta0;
        // console.log('thetas for drawing', theta0, thetaA, thetaS);
        //It is easier to draw this as a parametric equation
        myCanvas.fillStyle(color);
        for (phi = 0; phi < 2 * Math.PI; phi += inc) {
        // for(phi = 0; phi < 2 * Math.PI; phi += Math.PI/(w+h)/4) {
            cosPhi = Math.cos(phi);
            sinPhi = Math.sin(phi);
            //Calculate R, this is a simple parametric equation
            if ((phi > thetaS && phi <= Math.PI - thetaS) ||
                    (phi > Math.PI + thetaS && phi <= 2 * Math.PI - thetaS)) {
                r = Math.abs(h / (2 * sinPhi));
                // inc = (Math.PI - 2 * thetaA) / w / 2;
                tempPhi = phi < Math.PI
                    ? phi
                    : phi - Math.PI;
                aShift = phi < Math.PI
                    ? 0
                    : Math.PI;
                inc = Math.abs(Math.acos(Math.cos(tempPhi + 0.3 / r)) + aShift - phi);
                //inc = Math.abs(Math.acos(cosPhi - 0.1/r) - phi);
                // console.log('here top/bottom next inc', inc, Math.round(r * Math.cos(phi)+ x0), Math.round(r*Math.sin(phi)+ y0));
            } else {
                r = Math.abs(w / (2 * cosPhi));
                if (phi < Math.PI / 2) {
                    tempPhi = phi;
                    aShift = 0;
                } else if (phi < Math.PI) {
                    tempPhi = phi - Math.PI / 2;
                    aShift = Math.PI / 2;
                } else if (phi < 1.5 * Math.PI) {
                    tempPhi = phi - Math.PI;
                    aShift = Math.PI;
                } else {
                    tempPhi = phi - 1.5 * Math.PI;
                    aShift = 1.5 * Math.PI;
                }
                inc = Math.abs(Math.asin(Math.sin(tempPhi + 0.3 / r)) + aShift - phi);
                // console.log('here left/right next inc', inc, Math.round(r * Math.cos(phi)+ x0), Math.round(r*Math.sin(phi)+ y0));
            }
            // console.log(Math.round(r * Math.cos(phi)+ x0), Math.round(r*Math.sin(phi)+ y0));
            // console.log(r, phi);
            //Using x = r cos phi and y = r sin(phi) plot a point
            myCanvas.fillRect(Math.floor(r * Math.cos(phi) + x0 + 0.1),
                    Math.floor(r * Math.sin(phi) + y0 + 0.1), 1, 1);
            inc = Math.max(inc, Math.PI / 180);
        }
        //plot center as cross
        myCanvas.fillRect(Math.round(x0), Math.round(y0) - 1, 1, 3);
        myCanvas.fillRect(Math.round(x0) - 1, Math.round(y0), 3, 1);
    };

    findBandLocations = function (myCanvas, rectangles) {
        //Cycle through each main band location
        var im, rectangleCount, xBuffer, yBuffer = 2,
                distances = [], PI_1_180 = Math.PI / 180,
                rect_dimen_buffer = 1.65, greenRectangleScore = 0,
                lanePromises = [], getmxb,
                analysisRegion = {min: [myCanvas.width, myCanvas.height],
                max: [0, 0], width: myCanvas.width, height: myCanvas.height},
                //functions
                determineBoarderParams, performHoughTransform,
                startEdgeDetection, moveDownLane, walking, getHTEdgeArr,
                distancePromise, vertHoughTrans;
        /*
        leftEdge, bottomEdge = 0, testX, testY, xBuffer,
                testing = false, distances = [], distanceMeasure,
        */

        vertHoughTrans = function (edge, edges, params, next) {
            //Add in a fake rectangle to shift the slope to determine what side
            // we hit we just
            var htEdges;
            htEdges = getHTEdgeArr(edge, edges, params, 2);
            vertHoughTransformWorker.submit({
                array: htEdges.array,
                roundDigit: roundDigit
            }).then(function (rectangle) {
                rectangle.HTscore = round(rectangle.HTscore /
                        minimum_grey_edge / 50); // Note 50 > 10 used in
                                                        // true rectangle
                rectangle.bool = false;
                rectangle.x0 += params.x_shift + htEdges.x_shift;
                rectangle.y0 += params.y_shift + htEdges.y_shift;
                // outlineRectangle(JSON.parse(JSON.stringify(rectangle)), '#800080', myCanvas);
                rectangle.width = params.rect_width;
                rectangle.height = params.rect_height;
                // outlineRectangle(rectangle, '#FFA500', myCanvas);

                params.distances.push({
                    distance2: round(Math.sqrt(Math.pow(rectangle.x0
                            - params.x_origin, 2) +
                            Math.pow(rectangle.y0 -
                            params.y_origin, 2))),
                    //Note that models for the below improved on the
                    // above slightly.
                    distance: round(Math.abs(rectangle.y0 -
                            params.y_origin) * Math.sqrt(params.m *
                            params.m + 1)),
                    rectangle: rectangle
                });
                params = getmxb(params, rectangle);
                next(edge.y + 1);
            }).catch(function (error) {
                console.error(error);
            });
            return;
        };

        getmxb = function (params, rectangle) {
            var i, count, xy_m = 0, x_m = 0, y2_m = 0, y_m = 0, slope,
                    intercept, notfirst, x_m_0 = 0, xhere;
            //Add new points
            //Rect scores seem to be in the 1000's
            notfirst = params.linearArr.length;
            for (i = 0; i < rectangle.HTscore / 500 + 1; i += 1) {
                params.linearArr.push([rectangle.y0, rectangle.x0]);
            }
            //Before calculating slope we decrease the changes in x to account
            // for pixel granularity
            count = params.linearArr.length;
            for (i = 0; i < count; i += 1) {
                x_m_0 += params.linearArr[i][1];
            }
            x_m_0 = round(x_m_0 / count);

            //Note since this line will likely be approaching a zero slope
            // it is better to switch x and y which can be noted above.
            for (i = 0; i < count; i += 1) {
                xhere = params.linearArr[i][1];
                xhere += xhere < x_m_0 - 0.5
                    ? 0.5
                    : xhere > x_m_0 + 0.5
                        ? -0.5
                        : 0;
                // console.log(params.linearArr[i][1], xhere, x_m_0);
                xy_m += params.linearArr[i][0] * xhere;
                y_m += params.linearArr[i][0];
                x_m += xhere;
                y2_m += params.linearArr[i][0] * params.linearArr[i][0];
            }
            xy_m /= count;
            x_m /= count;
            y_m /= count;
            y2_m /= count;
            if (y2_m === y_m * y_m || !notfirst) {
                slope = Math.tan(rectangle.theta);
            } else {
                slope = (xy_m - x_m * y_m) / (y2_m - y_m * y_m);
                slope = (slope * (params.distances.length) +
                        Math.tan(params.theta)) / (params.distances.length + 1);
                // slope = Math.tan(rectangle.theta);
            }
            // slope = Math.abs(slope) > Math.abs(Math.tan(params.theta))
            //     ? Math.tan(params.theta)
            //     : slope;
            //0.9502
            //0.
            //Note we are trying to write the equation yPos * slope + intercept
            // = xPos. xPos is realitive to left x boarder, yPos is realitive to
            // the top boarder
            intercept = x_m - slope * (y_m) + slope * params.y_shift
                    - params.x_shift;

            params.m = slope;
            params.intercept = intercept;
            // console.log(slope, intercept, x_m, y_m, params.x_shift, params.y_shift, params.theta);
            return params;
        };

        determineBoarderParams = function (rectangle) {
            var edgeY, edgeX, edgeHeight, edgeWidth, roundedHypot,
                    theta = rectangle.theta,
                    x0 = rectangle.x0,
                    y0 = rectangle.y0,
                    width = rectangle.width,
                    height = rectangle.height;

            //calculate hypotenuse based on width/height of rectangle and 26 max
            // lanes
            roundedHypot = Math.ceil(100 * (27.5 - distance_constant_band_rat) /
                    (distance_width_band_rat / width +
                    distance_height_band_rat / height)) / 100;

            //Determine the edge transformation boundries
            edgeY = Math.floor(height * 1.15 + y0); //To be sure that the height clears
            edgeHeight = Math.ceil(
                roundedHypot * Math.cos(Math.min(
                    Math.abs(theta),
                    Math.abs(Math.abs(theta) - PI_1_180)
                )) + yBuffer * 2
            );
            xBuffer = 20 + Math.tan(PI_1_180 + Math.abs(theta)) *
                    edgeHeight;
            edgeX = Math.floor(x0 - width / 2 - xBuffer);
            edgeWidth = Math.ceil(width + 2 * xBuffer);

            return {
                x_shift_left: edgeX,
                y_shift_down: edgeY,
                topGreenY: y0 - height * 1.15,
                width: edgeWidth,
                height: edgeHeight
            };
        };

        getHTEdgeArr = function (edge, edges, params, vertScale) {
            var ht_x0, ht_y0, ht_width, ht_height, ht_y_buff, ht_edges,
                    x;

            //For verticle transform
            vertScale = vertScale || 1;

            //Found an edge, perform a hough transform
            ht_width = Math.ceil(params.rect_width * rect_dimen_buffer);
            ht_x0 = Math.floor(edge.x - ht_width / 2);
            ht_y_buff = Math.ceil(Math.sin(Math.abs(params.theta)) *
                    ht_width / 2 +
                    params.rect_height * (rect_dimen_buffer - 1.4)) * vertScale;
            ht_y0 = edge.y - ht_y_buff;
            ht_height = Math.ceil(params.rect_height + ht_y_buff * 2);
            ht_edges = [];

            //Make sure I do not reach into a realm that does not exist
            if (ht_x0 < 0) {
                ht_width = ht_width + 2 * ht_x0;
                ht_x0 = 0;
            }
            if (ht_y0 < 0) {
                ht_height = ht_height + 2 * ht_y0;
                ht_y0 = 0;
            }
            if (ht_height + ht_y0 > params.y_max - 1) {
                ht_y0 = ((ht_height + 2 * ht_y0) -
                        (params.y_max - 1));
                ht_height = params.y_max - 1 - ht_y0;
            }
            if (ht_width + ht_x0 > params.x_max - 1) {
                ht_x0 = ((ht_width + 2 * ht_x0) - (params.x_max - 1));
                ht_width = params.x_max - 1 - ht_x0;
            }

            //Now slice out the parts of the array we need
            for (x = ht_x0; x < ht_width + ht_x0; x += 1) {
                ht_edges.push([]);
                ht_edges[ht_edges.length - 1] = edges[x].slice(
                    ht_y0,
                    ht_height + ht_y0
                );
            }
            return {
                array: ht_edges,
                x_shift: ht_x0,
                y_shift: ht_y0
            };
        };

        startEdgeDetection = function (gausArr) {
            return edgeDetectionWorker.submit({
                array: gausArr,
                non_maximum_suppression: 1, //this is field size for nms
                for_hough: false,
                roundDigit: roundDigit,
                minimum_edge: minimum_grey_edge
            });
        };

        performHoughTransform = function (edge, edges, params, next) {
            var htEdges;
            if (!edge.end) {
                htEdges = getHTEdgeArr(edge, edges, params);
                outlineRectangle({
                    x0: htEdges.array.length / 2 + params.x_shift + htEdges.x_shift,
                    y0: htEdges.array[0].length / 2 + params.y_shift + htEdges.y_shift,
                    height: htEdges.array[0].length,
                    theta: 0,
                    width: htEdges.array.length
                }, '#FFFFCC', myCanvas);
                houghTransformWorker.submit({
                    array: htEdges.array,
                    roundDigit: roundDigit
                }).then(function (rectangle) {
                    // var pixelCorrection;
                    // centerThetaWeight = (rectangle.y0 + htEdges.y_shift) /
                    //         params.y_max * 0;

                    //Adjust score as a function of minimum edge
                    rectangle.HTscore = round(rectangle.HTscore /
                            minimum_grey_edge / 10); //min edge is too small

                    rectangle.x0 += params.x_shift + htEdges.x_shift;
                    rectangle.y0 += params.y_shift + htEdges.y_shift;

                    //To account for pixel granularity
                    // pixelCorrection = rectangle.x0 > params.x_origin + 0.5
                    //     ? 0.5
                    //     : rectangle.x0 < params.x_origin - 0.5
                    //         ? -0.5
                    //         : 0;

                    // centerTheta = Math.atan2(
                    //     (rectangle.x0 - params.x_origin + pixelCorrection),
                    //     rectangle.y0 - params.y_origin
                    // );

                    rectangle.width = ((params.greenRectangleScore +
                            params.rectangleScore) * params.rect_width +
                            rectangle.width * rectangle.HTscore) /
                            (params.rectangleScore + params.greenRectangleScore
                            + rectangle.HTscore);
                    rectangle.height = ((params.greenRectangleScore +
                            params.rectangleScore) * params.rect_height +
                            rectangle.height * rectangle.HTscore) /
                            (params.rectangleScore + params.greenRectangleScore
                            + rectangle.HTscore);
                    // rectangle.theta = (params.rectangleScore *
                    //         params.theta + rectangle.HTscore *
                    //         ((1 - centerThetaWeight) * rectangle.theta +
                    //         centerThetaWeight * centerTheta)) /
                    //         (params.rectangleScore + rectangle.HTscore);
                    rectangle.theta = (params.rectangleScore * params.theta +
                            rectangle.theta * rectangle.HTscore) /
                            (params.rectangleScore + rectangle.HTscore);

                    params.rectangleScore += rectangle.HTscore;

                    rectangle.width = round(rectangle.width);
                    rectangle.height = round(rectangle.height);
                    rectangle.theta = round(rectangle.theta);
                    rectangle.x0 = round(rectangle.x0);
                    rectangle.y0 = round(rectangle.y0);

                    medianGrey(rectangle, myCanvas).then(function (greyScore) {
                        if (greyScore > minimumMedianGrey) {
                            params.rect_width = rectangle.width;
                            params.rect_height = rectangle.height;
                            params.theta = rectangle.theta;
                            rectangle.greyScore = greyScore;
                            params = getmxb(params, rectangle);
                            outlineRectangle(rectangle, '#FFA500', myCanvas);
                            params.distances.push({
                                distance2: round(Math.sqrt(Math.pow(rectangle.x0
                                        - params.x_origin, 2) +
                                        Math.pow(rectangle.y0 -
                                        params.y_origin, 2))),
                                //Note that models for the below improved on the
                                // above slightly.
                                distance: round(Math.abs(rectangle.y0 -
                                        params.y_origin) * Math.sqrt(params.m *
                                        params.m + 1)),
                                rectangle: rectangle
                            });
                            //Just upped to 1.555 from 1.55 to try and skip a double call
                            next(Math.floor(edge.y + params.rect_height * 1.555));
                        } else {
                            next(Math.floor(edge.y + 2));
                        }
                    });
                }).catch(function (x) {
                    params.reject(new Error('Problem with finding grey bands' +
                            x));
                });
            }
        };

        walking = function (edges, yPos, params, rectangle) {
            var walkFunction, blankCheck = 0.5;

            walkFunction = function (yPos) {
                var xPos, edgeFound = false, xRange, j, count = 0;
                //Loop till the end or till an edge is found
                while (!edgeFound && yPos < params.y_max) {
                    //Calculate mid x position based on parameters
                    // xPos = Math.round((yPos + params.y_shift -
                    //         params.y_origin) * Math.tan(params.theta)
                    //         + (params.x_center - params.x_shift));
                    //0.9530054644808743 with above

                    xPos = Math.round(yPos * params.m + params.intercept);
                    //Show path being traced
                    myCanvas.fillStyle('#BE5A52');
                    myCanvas.fillRect(Math.round(xPos + params.x_shift),
                            Math.round(yPos + params.y_shift), 1, 1);

                    //If we find an edge
                    for (xRange = 0; xRange < 1 && !edgeFound; xRange += 1) {
                        if (
                            edges[xPos + xRange] &&
                            edges[xPos + xRange][yPos].direction === 0 &&
                            edges[xPos + xRange][yPos].strength > 0
                        ) {
                            blankCheck = 0.95 * (params.distances.length + 1);
                            performHoughTransform({x: xPos, y: yPos,
                                    end: false}, edges, params, walkFunction);
                            edgeFound = true;
                        }
                    }

                    if (count > blankCheck * params.rect_width) {
                        vertHoughTrans({x: xPos, y: yPos,
                                end: false}, edges, params, walkFunction);
                        blankCheck = 1.5 + 0.95 * (params.distances.length);
                        edgeFound = true;
                    }
                    yPos += 1;
                    count += 1;
                }
                if (!edgeFound) {
                    //Now set all rectangles to same height/width and create
                    // return object
                    for (j = 0; j < params.distances.length; j += 1) {
                        params.distances[j].rectangle.width = params.rect_width;
                        params.distances[j].rectangle.height =
                                params.rect_height;
                    }
                    params.resolve({
                        rect_height: params.rect_height,
                        rect_width: params.rect_width,
                        bands: params.distances,
                        indicatorBand: rectangle
                    });
                }
            };

            return new Promise(function (resolve, reject) {
                params.resolve = resolve;
                params.reject = reject;
                walkFunction(yPos);
            });
        };

        moveDownLane = function (boarderParams, rectangle, rectangleScore) {
            return function (edges) {
                var yPos, params;
                yPos = 0;

                params = {
                    x_shift: boarderParams.x_shift_left,
                    y_shift: boarderParams.y_shift_down,
                    x_center: rectangle.x0,
                    theta: rectangle.theta,
                    x_origin: rectangle.x0,
                    y_origin: rectangle.y0,
                    rect_width: rectangle.width,
                    rect_height: rectangle.height,
                    theta_origin: rectangle.theta,
                    y_max: edges[0].length,
                    x_max: edges.length,
                    rectangleScore: 0,
                    distances: [],
                    greenRectangleScore: rectangleScore,
                    linearArr: []
                };

                params = getmxb(params, rectangle);

                //Start walking down
                return walking(edges, yPos, params, rectangle);
            };
        };

        rectangleCount = rectangles.length;

        //For weighting calculate total rectangle score
        for (im = 0; im < rectangleCount; im += 1) {
            greenRectangleScore += rectangles[im].HTscore;
        }

        //Start the body of this function, this is scoped to try to avoid ns
        // collision
        (function () {
            var boarderParams, i;
            for (i = 0; i < rectangleCount; i += 1) {
                //Initialize where results will be stored
                distances[i] = [];

                //Get edge fitting parameters
                boarderParams = determineBoarderParams(rectangles[i]);
                analysisRegion.min[0] = Math.min(
                    boarderParams.x_shift_left,
                    analysisRegion.min[0]
                );
                analysisRegion.min[1] = Math.min(
                    boarderParams.topGreenY,
                    analysisRegion.min[1]
                );
                analysisRegion.max[0] = Math.max(
                    boarderParams.x_shift_left + boarderParams.width,
                    analysisRegion.max[0]
                );
                analysisRegion.max[1] = Math.max(
                    boarderParams.y_shift_down + boarderParams.height,
                    analysisRegion.max[1]
                );

                //perform the edge calculation
                lanePromises.push(myCanvas.getGaus(
                    myCanvas.getGrey,
                    // The -1/+2 are because sobel edge detection  is the
                    // following step which leaves off the outer boarder of the
                    // array this adjustment will actually create the array we
                    // expect based on the parameters
                    boarderParams.x_shift_left - 1,
                    boarderParams.y_shift_down - 1,
                    boarderParams.width + 2,
                    boarderParams.height + 2
                ).then(
                    startEdgeDetection
                ).then(
                    moveDownLane(boarderParams, rectangles[i],
                            greenRectangleScore)
                ));
            }
        }());

        distancePromise = Promise.all(lanePromises).then(function (allLanes) {
            //calculate the actual lane calls
            var sixScore = 0, sixLimit, i, j, sixCount = 0, call, callArr = [],
                    distance_cont, avgHeight = 0, avgWidth = 0, hwCount = 0;

            for (i = 0; i < allLanes.length; i += 1) {
                avgHeight += (1 + allLanes[i].bands.length)
                        * allLanes[i].rect_height;
                avgWidth += (1 + allLanes[i].bands.length)
                        * allLanes[i].rect_width;
                hwCount += 1 + allLanes[i].bands.length;
            }

            avgHeight /= hwCount;
            avgWidth /= hwCount;
            distance_cont = (distance_width_band_rat / avgWidth +
                    distance_height_band_rat / avgHeight);

            //Concept here is simple, the first 6 bands are more accurately
            // called than the remaining, so calculating an average distance
            // across the entire sheet gives us significantly more prediction
            // power.
            for (i = 0; i < allLanes.length; i += 1) {
                sixLimit = (6.5 - distance_constant_band_rat) / distance_cont;
                for (j = 0; j < allLanes[i].bands.length; j += 1) {
                    if (allLanes[i].bands[j].rectangle.bool &&
                            allLanes[i].bands[j].distance < sixLimit) {
                        call = Math.round(allLanes[i].bands[j].distance *
                                distance_cont + distance_constant_band_rat);
                        sixScore += allLanes[i].bands[j].distance / call;
                        sixCount += 1;
                    } else if (!allLanes[i].bands[j].rectangle.bool) {
                        allLanes[i].bands.splice(j, 1);
                        j -= 1;
                    }
                }
            }

            sixScore /= sixCount;

            //Now I have a 'six score' I can calculate the band calls!
            distance_cont = distance2_width_band_rat / avgWidth +
                    distance2_height_band_rat / avgHeight +
                    distance2_sixScore_band_rat / sixScore;

            for (i = 0; i < allLanes.length; i += 1) {
                callArr[i] = [];
                for (j = 0; j < allLanes[i].bands.length; j += 1) {
                    call = Math.round(allLanes[i].bands[j].distance *
                            distance_cont + distance2_constant_band_rat);
                    allLanes[i].bands[j].call = call;
                    callArr[i].push(call);

                    //Write call on canvas
                    myCanvas.fillText(
                        call,
                        allLanes[i].bands[j].rectangle.x0 - avgWidth / 2.2,
                        allLanes[i].bands[j].rectangle.y0 - avgHeight / 1.65,
                        "Bold " + Math.round(avgHeight * 1.5) + "px Georgia",
                        '#8A2BE2'
                    );
                }
                hcvGenie.genotype(callArr[i]).then(
                    callGenotype(allLanes[i])
                );
            }
            return {
                lanes: allLanes,
                rect_width: avgWidth,
                rect_height: avgHeight,
                six_score: sixScore,
                region: analysisRegion
            };
        });

        // return {
        //     distances: distancePromise,
        //     region: region
        // };
        return distancePromise;
    };

    findGreenRegion = function (canvasObject) {
        var depth = 2;
        return canvasObject.getLABcolorDist(0, 0, canvasObject.width,
                canvasObject.height, greenXYZ, depth).then(function (arr) {
            var x, y, w = arr.length, h = arr[0].length,
                    boarder = [[canvasObject.width, canvasObject.height],
                    [0, 0]];
            for (x = 0; x < w; x += 1) {
                for (y = 0; y < h; y += 1) {
                    if (arr[x][y] < minGreenDist) {
                        posDistances.push(arr[x][y]);
                        boarder[0][0] = Math.min(x * depth, boarder[0][0]);
                        boarder[0][1] = Math.min(y * depth, boarder[0][1]);
                        boarder[1][0] = Math.max(x * depth, boarder[1][0]);
                        boarder[1][1] = Math.max(y * depth, boarder[1][1]);
                    }
                }
            }
            return {
                xmin: boarder[0][0],
                ymin: boarder[0][1],
                width: boarder[1][0] - boarder[0][0] + 1,
                height: boarder[1][1] - boarder[0][1] + 1
            };
        });
    };

    findGreenRectangles = function (myCanvasObject, boarder) {
        var buffer = 5;
        //This can return a Promise or an object, the 'then' chain
        // will treat it the same way.

        //Return the promise of this being done...
        return myCanvasObject.getLABcolorDist(boarder.xmin - buffer,
                boarder.ymin - buffer, boarder.width + buffer * 2,
                boarder.height + buffer * 2, greenXYZ,
                1).then(function (greenArr) {
            //Declare variables
            var x, y, w = greenArr.length, h = greenArr[0].length, shapes = [],
                    shapeMat = JSON.parse(JSON.stringify(greenArr)),
                    shapeBoarders = [], shape, heights = [], widths = [],
                    medianH, medianW, i, rectanglePromises = [], adjustHTresult,
                    houghTransBuffer = 3, xLeft, hWidth, startHoughTransform,
                    yLeft, hHeight, startEdgeDetection, rectTotalW = 0,
                    rectTotalH = 0, totalRectScore = 0;

            adjustHTresult = function (rect, shape) {
                rect.x0 = rect.x0 + shape.xmin - houghTransBuffer;
                rect.y0 = rect.y0 + shape.ymin - houghTransBuffer;
                rect.HTscore = round(rect.HTscore / minimum_green_edge);
                rectTotalW += rect.HTscore * rect.width;
                rectTotalH += rect.HTscore * rect.height;
                totalRectScore += rect.HTscore;
                return rect;
            };

            startEdgeDetection = function (gausArr) {
                return edgeDetectionWorker.submit({
                    array: gausArr,
                    non_maximum_suppression: 0, //this is field size for nms
                    // 95.3005% for 0 vs 94.3716% for 1
                    for_hough: true,
                    roundDigit: roundDigit,
                    minimum_edge: minimum_green_edge
                });
            };

            startHoughTransform = function (shape) {
                return function (edgeObj) {
                    return houghTransformWorker.submit(edgeObj).then(
                        function (rectObj) {
                            return adjustHTresult(rectObj, shape);
                        }
                    );
                };
            };

            //Find each individual shape
            for (x = 0; x < w; x += 1) {
                for (y = 0; y < h; y += 1) {
                    if (shapeMat[x][y] < minGreenDist) {
                        shape = findPositiveNeighborRegion(shapeMat, x, y);
                        heights.push(shape.height);
                        widths.push(shape.width);
                        shapeBoarders.push(shape);
                    }
                }
            }

            //Verify it is of similar size to the other green rectangles
            medianH = calculateMedian(heights);
            medianW = calculateMedian(widths);

            //Remove non rectangles (small and too large pixel formations)
            for (i = 0; i < shapeBoarders.length; i += 1) {
                if (
                    //First is to make sure they are not too small
                    (shapeBoarders[i].width > medianW / 2
                            && shapeBoarders[i].height > medianH / 4)
                    && //And not too big
                    (shapeBoarders[i].width < medianW * 2
                            && shapeBoarders[i].height < medianH * 4)
                ) {
                    //Save actual shapes in new format
                    shapes.push({
                        height: shapeBoarders[i].height,
                        width: shapeBoarders[i].width,
                        x0: shapeBoarders[i].width / 2 +
                                shapeBoarders[i].xmin + boarder.xmin - buffer,
                        y0: shapeBoarders[i].height / 2 +
                                shapeBoarders[i].ymin + boarder.ymin - buffer,
                        xmin: shapeBoarders[i].xmin + boarder.xmin - buffer,
                        ymin: shapeBoarders[i].ymin + boarder.ymin - buffer,
                        theta: 0
                    });
                }
            }

            //Now find edges for each shape (+/- buffer) then apply a hough
                // transform
            for (i = 0; i < shapes.length; i += 1) {
                // Draw the test region
                // outlineRectangle(shapes[i], "#ff6699", myCanvasObject);

                //Get rectangle dimentions for hough transform
                xLeft = Math.floor(shapes[i].xmin - houghTransBuffer);
                hWidth = Math.ceil(shapes[i].width + 2 * houghTransBuffer);
                yLeft = Math.floor(shapes[i].ymin - houghTransBuffer);
                hHeight = Math.ceil(shapes[i].height + 2 * houghTransBuffer);

                //Submit jobs for edge detections and Hough Transform
                rectanglePromises.push(
                    myCanvasObject.getGaus(
                        myCanvasObject.getLABcolorDist,
                        xLeft - 1, //The -1/+2 are because sobel edge detection
                        yLeft - 1, // is the following step which leaves off
                        hWidth + 2, // the outer boarder of the array this
                        hHeight + 2, // will actually create the array we expect
                        greenXYZ  // based on the buffer and widths
                    ).then(
                        startEdgeDetection
                    ).then(
                        startHoughTransform(shapes[i])
                    )
                );
            }
            //calculate average width and height
            return Promise.all(rectanglePromises).then(function (rects) {
                var j, avgHeight, avgWidth, rem;

                avgHeight = round(rectTotalH / totalRectScore);
                avgWidth = round(rectTotalW / totalRectScore);

                //Remove possible duplicate Rectangles
                for (i = 0; i < rects.length; i += 1) {
                    for (j = i + 1; j < rects.length; j += 1) {
                        if (
                            rects[i].x0 < rects[j].x0 + avgWidth / 2
                            &&
                            rects[i].x0 > rects[j].x0 - avgWidth / 2
                        ) {
                            rem = rects[i].rectangleScore <
                                    rects[j].rectangleScore
                                ? j
                                : i;
                            rects.splice(rem, 1);
                            j -= 1;
                        }
                    }
                }

                for (i = 0; i < rects.length; i += 1) {
                    rects[i].height = avgHeight;
                    rects[i].width = avgWidth;
                    outlineRectangle(rects[i], "#6666ff", myCanvasObject);
                }
                return rects;
            });
        });
    };

    findPositiveNeighborRegion = function (shapeMat, xi, yi) {
        var wind = 2, i, xp, yp, res = {ys: [yi], xs: [xi]},
                yB = {}, xB = {}, x, y,
                yStart, xStart, yFin, xFin,
                x_min_bound, y_min_bound,
                x_max_bound, y_max_bound;
        shapeMat[xi][yi] = minGreenDist * 3.5;
        yB[yi] = [xi, xi];
        xB[xi] = [yi, yi];

        for (i = 0; i < res.ys.length; i += 1) {
            //Get x,y point
            y = res.ys[i];
            x = res.xs[i];
            x_min_bound = yB[y][0] === x
                ? 1
                : 0;
            y_min_bound = xB[x][0] === y
                ? 1
                : 0;
            x_max_bound = yB[y][1] === x
                ? 1
                : 0;
            y_max_bound = xB[x][1] === y
                ? 1
                : 0;

            //Make sure it is an edge
            if (x_min_bound + y_min_bound + x_max_bound + y_max_bound > 0) {
                //Based on the point's edge status determine the
                // start/finish points for the search window
                // and the edge status
                xStart = x - wind * x_min_bound;
                xFin = x + wind * x_max_bound;
                yStart = y - wind * y_min_bound;
                yFin = y + wind * y_max_bound;

                //Actually loop through the window created
                for (xp = xStart; xp < xFin + 1; xp += 1) {
                    for (yp = yStart; yp < yFin + 1; yp += 1) {
                        if (xp > 0 && yp > 0 && xp < shapeMat.length &&
                                yp < shapeMat[xp].length) {
                            if (shapeMat[xp][yp] < minGreenDist * 1) {
                                // Save result
                                res.ys.push(yp);
                                res.xs.push(xp);
                                // Set to a higher value so the same spot
                                // is not indicated multiple times
                                shapeMat[xp][yp] = minGreenDist * 3.5;

                                // If this is the fist x,y on this edge
                                // save the array of x_i -> y_i_min, y_i_max
                                // and visa versa
                                xB[xp] = xB[xp] || [yp, yp];
                                yB[yp] = yB[yp] || [xp, xp];

                                //If this is external to the old edge save it
                                xB[xp][0] = yp < xB[xp][0]
                                    ? yp
                                    : xB[xp][0];
                                xB[xp][1] = yp > xB[xp][1]
                                    ? yp
                                    : xB[xp][1];
                                yB[yp][0] = xp < yB[yp][0]
                                    ? xp
                                    : yB[yp][0];
                                yB[yp][1] = xp > yB[yp][1]
                                    ? xp
                                    : yB[yp][1];
                            }
                        }
                    }
                }
            }
        }

        return {
            xmin: Math.min.apply(null, res.xs),
            ymin: Math.min.apply(null, res.ys),
            width: Math.max.apply(null, res.xs) -
                    Math.min.apply(null, res.xs) + 1,
            height: Math.max.apply(null, res.ys) -
                    Math.min.apply(null, res.ys) + 1
        };
    };

    medianGrey = function (rectangle, myCanvas) {
        var x0 = rectangle.x0, y0 = rectangle.y0, w = rectangle.width,
                h = rectangle.height, xs, ys;

        //Top left
        xs = Math.floor(x0 - w / 2);
        ys = Math.floor(y0 - h / 2);

        //Bottom right
        h = Math.ceil(h);
        w = Math.ceil(w);

        return myCanvas.getGrey(xs, ys,
                w, h, 1).then(function (arr) {
            var greys = [], x, y, count = 0, total = 0, median;
            for (x = 0; x < arr.length; x += 1) {
                for (y = 0; y < arr[0].length; y += 1) {
                    greys.push(arr[x][y]);
                    total += arr[x][y];
                    count += 1;
                }
            }
            median = calculateMedian(greys);
            medianSignals.push([median, total / count, median * count / total]);
            median = median < 0.003
                ? 0
                : median * count / total;
            return median;
        });
    };

    makeCanvasObject = function (canvasElement) {
        //This sets up all the functions on the canvas object
        var retObj = {}, context = canvasElement.getContext('2d'),
                canvasArr = context.getImageData(0, 0,
                canvasElement.width, canvasElement.height).data,
                colorDistMemorize = {},
                //Local functions
                calculateGausWindow, gausWeight;

        calculateGausWindow = function (colorArr) {
            var xPos, yPos, w, h, solution = [],
                    weight, totalWeight, i, j, gausScore;
            w = colorArr.length;
            h = colorArr[0].length;
            for (xPos = 2; xPos < w - 2; xPos += 1) {
                solution.push([]);
                for (yPos = 2; yPos < h - 2; yPos += 1) {
                    gausScore = 0;
                    totalWeight = 0;
                    //For each x,y calculate a box gaus score
                    for (i = -2; i < 3; i += 1) {
                        for (j = -2; j < 3; j += 1) {
                            if (colorArr[xPos + i][yPos + j]) {
                                weight = gausWeight(i, j);
                                gausScore += weight *
                                        colorArr[xPos + i][yPos + j];
                                totalWeight += weight;
                            }
                        }
                    }
                    solution[xPos - 2].push(Math.round(roundDigit *
                            gausScore / totalWeight) / roundDigit);
                }
            }
            return solution;
        };

        gausWeight = function (i, j) {
            var weight = Math.abs(j) + Math.abs(i);
            return weight === 4
                ? 2
                : weight === 3
                    ? 4
                    : (weight === 2 && (i === 0 || j === 0))
                        ? 5
                        : weight === 2
                            ? 9
                            : weight === 1
                                ? 12
                                : 15;
        };

        retObj.getRGB = function (x, y, w, h, depth) {
            var xPos, yPos, solution = [], arrPos, xArrPos = 0;
            depth = depth || 1;
            for (xPos = x; xPos < x + w; xPos += depth) {
                solution[xArrPos] = [];
                for (yPos = y; yPos < y + h; yPos += depth) {
                    arrPos = (xPos + canvasElement.width * yPos) * 4;
                    solution[xArrPos].push([
                        canvasArr[arrPos],
                        canvasArr[arrPos + 1],
                        canvasArr[arrPos + 2]
                    ]);
                }
                xArrPos += 1;
            }
            return Promise.resolve(solution);
        };

        retObj.getLABcolorDist = function (x, y, w, h, color, depth) {
            depth = depth || 1;
            return new Promise(function (resolve, reject) {
                var promiseArr = [], sectionN, widRat, higRat,
                        sectionParams = [], newW, newH, newX, newY,
                        colorKey, selectSize = labColorSectionSide * depth;
                //store the color code
                colorKey = color.join('-');
                if (!colorDistMemorize.hasOwnProperty(colorKey)) {
                    colorDistMemorize[colorKey] = {};
                }
                //If the area is large, split it up recursively
                if (w * h / depth / depth > labColorDistMaxArea) {
                    widRat = Math.ceil(w / selectSize);
                    higRat = Math.ceil(h / selectSize);
                    for (sectionN = 0; sectionN < widRat * higRat;
                            sectionN += 1) {
                        newX = x + sectionN % widRat * selectSize;
                        newY = y + Math.floor(sectionN / widRat) *
                                selectSize;
                        newW = Math.min(selectSize, w - newX + x);
                        newH = Math.min(selectSize, h - newY + y);
                        sectionParams.push([newX - x, newY - y]);
                        promiseArr.push(retObj.getLABcolorDist(newX, newY,
                                newW, newH, color, depth));
                    }
                    //Now we have split it up, we have to patch it back together
                    Promise.all(promiseArr).then(function (sections) {
                        var i, solution = [], xPos, yPos;
                        for (i = 0; i < sections.length; i += 1) {
                            if (sectionParams[i][1] === 0) {
                                for (xPos = 0; xPos < sections[i].length;
                                        xPos += 1) {
                                    solution.push(sections[i][xPos]);
                                }
                            } else {
                                for (xPos = 0; xPos < sections[i].length;
                                        xPos += 1) {
                                    for (yPos = 0; yPos < sections[i][xPos].length;
                                            yPos += 1) {
                                        solution[xPos + sectionParams[i][0] /
                                                depth].push(
                                            sections[i][xPos][yPos]
                                        );
                                    }
                                }
                            }
                        }
                        resolve(solution);
                    }).catch(function (err) {
                        console.error(err);
                        reject(new Error('Error with getting RBG Quilted',
                                err));
                    });
                //Otherwise just get the region
                } else {
                    retObj.getRGB(x, y, w, h, depth).then(function (colorArr) {
                        //I now have the color array, however I need to
                        // now use the memorize tool
                        var keyPos, xPos, yPos;
                        for (xPos = 0; xPos < w; xPos += depth) {
                            for (yPos = 0; yPos < h; yPos += depth) {
                                keyPos = (x + xPos * depth)
                                        + '_' + (y + yPos * depth);
                                if (colorDistMemorize[colorKey].hasOwnProperty(
                                    keyPos
                                )) {
                                    colorArr[xPos / depth][yPos / depth] =
                                            colorDistMemorize[colorKey][keyPos];
                                }
                            }
                        }
                        //Now that I have used the memorize tool, I need
                        // to calculate whatever remains and memorize
                        // the results.
                        colorDistanceWorker.submit({
                            arr: colorArr,
                            col: color,
                            roundDigit: roundDigit
                        }).then(function (distanceArray) {
                            w = distanceArray.length;
                            h = distanceArray[0].length;
                            for (xPos = 0; xPos < w; xPos += 1) {
                                for (yPos = 0; yPos < h; yPos += 1) {
                                    keyPos = (x + xPos * depth) + '_' +
                                            (y + yPos * depth);
                                    if (!colorDistMemorize[colorKey].hasOwnProperty(
                                        keyPos
                                    )) {
                                        colorDistMemorize[colorKey][keyPos] =
                                                distanceArray[xPos][yPos];
                                    }
                                }
                            }
                            resolve(distanceArray);
                        }).catch(function (error) {
                            reject(new Error('Error with workers', error));
                        });
                    }).catch(function (error) {
                        reject(new Error('Error with getting RBG', error));
                    });
                }
            });
        };

        retObj.getGaus = function (func, x, y, w, h, color) {
            return func(x - 2, y - 2,
                    w + 4, h + 4, color).then(calculateGausWindow);
        };

        retObj.getGrey = function (x, y, w, h, depth) {
            depth = depth || 1;
            return retObj.getRGB(x, y, w, h, depth).then(function (colorArr) {
                var xPos, yPos, col;
                w = colorArr.length;
                h = colorArr[0].length;
                for (xPos = 0; xPos < w; xPos += 1) {
                    for (yPos = 0; yPos < h; yPos += 1) {
                        col = colorArr[xPos][yPos];
                        //Everything else equal this grey calc got a score of
                        // 93.8251%
                        colorArr[xPos][yPos] = round(
                            (1 - col[0] / 255) * 0.21 +
                                    (1 - col[1] / 255) * 0.72 +
                                    (1 - col[2] / 255) * 0.07
                        );
                        // On pages 1-10 this grey calc got a hmscore of
                        // 93.6612%
                        // colorArr[xPos][yPos] = round(
                        //     (1 - col[0] / 255) * 0.2989 +
                        //             (1 - col[1] / 255) * 0.5870 +
                        //             (1 - col[2] / 255) * 0.1140
                        // );
                    }
                }
                return colorArr;
            });
        };

        retObj.height = canvasElement.height;

        retObj.width = canvasElement.width;

        retObj.fillStyle = function (x) {
            context.fillStyle = x;
        };

        retObj.fillRect = function (x, y, w, h, color) {
            if (color) {
                context.fillStyle = color;
            }
            context.fillRect(x, y, w, h);
        };

        retObj.fillRect = function (x, y, w, h, color) {
            if (color) {
                context.fillStyle = color;
            }
            context.fillRect(x, y, w, h);
        };

        retObj.fillText = function (text, x, y, font, color) {
            if (color) {
                context.fillStyle = color;
            }
            if (font) {
                context.font = font;
            }
            context.fillText(text, x, y);
        };

        return retObj;
    };

    numericalSort = function (a, b) {
        return a < b
            ? -1
            : a > b
                ? 1
                : 0;
    };

    pdf2canvas = function (startObj, canvas, context, scaleSet) {
        return function (pdf) {
            return pdf.getPage(startObj.image.pageNumber).then(function (page) {
                var viewport, scale, renderContext;

                //Set scale
                scale = scaleSet || 2;

                //Get page image object
                viewport = page.getViewport(scale);

                // Prepare canvas using PDF page dimensions
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render PDF page into canvas context
                renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                return page.render(renderContext).then(function () {
                    return canvas;
                });
            });
        };
    };

    //Truely the main function, this returns to the calling function
    processCanvas = function (canvasElement) {
        var myCanvasObject, greenRegionPromise,
                distancesMatrix;

        //Convert the canvas into an object with a number of functions attached
        myCanvasObject = makeCanvasObject(canvasElement);

        //Find the region of the canvas in which there are green bands
        greenRegionPromise = findGreenRegion(myCanvasObject).then(
            function (boarder) {
                //Grab the green rectangles, these represent the samples
                return findGreenRectangles(myCanvasObject, boarder);
            }
        );

        distancesMatrix = greenRegionPromise.then(function (rectangles) {
            return findBandLocations(myCanvasObject, rectangles);
        });

        //Assign parts of the return object
        return {
            canvas: canvasElement,
            bandLocationPromise: distancesMatrix,
            canvasObject: myCanvasObject,
            canvasAnalysisRegion: distancesMatrix.region
        };
    };

    round = function (numb) {
        return Math.round(numb * roundDigit) / roundDigit;
    };

    main = function (input_obj) {
        return new Promise(function (resolve, reject) {
            //if everything is good with then call resolve
            var canvas, context, imgPromise, scale;

            scale = input_obj.image.scale || 2;

            //Create invisible canvas object
            canvas = document.createElement('canvas');
            context = canvas.getContext('2d');

            //If pdf then load the pdf file
            if (input_obj.image.type === 'pdf') {
                imgPromise = PDFJS.getDocument(input_obj.image.url).then(
                    pdf2canvas(input_obj, canvas, context, scale)
                );
            } else { // Otherwise this is just a regular image file
                imgPromise = new Promise(function (resolve, reject) {
                    var image;
                    image = new Image();
                    image.onload = function () {
                        canvas.width = image.width;
                        canvas.height = image.height;
                        context.drawImage(image, 0, 0, image.width,
                                image.height);
                        resolve(canvas);
                    };
                    image.onerror = function (err) {
                        reject(new Error(err));
                    };
                    image.src = input_obj.image.url;
                });
            }
            imgPromise.then(processCanvas).then(function (solution) {
                if (!solution.error) {
                    resolve(solution);
                } else { // else call reject
                    reject(new Error(solution));
                }
            });
        });
    };

    return main;
}());

//After the above loads we need to insure that we can load the JSON with the
// actual genotype calls.
hcvGenie.genotype = (function () {
    'use strict';
    var dictionaryPromise = new Promise(function (resolve, reject) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', './json/genotypesCurrent.json', true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState === 4 && xobj.status === 200) {
                resolve(JSON.parse(xobj.responseText));

            } else if (xobj.readyState === 4) {
                reject(xobj.responseText + "Could not get database");
            }
        };
        xobj.onerror = function () {
            reject(xobj.responseText + "Could not get database");
        };
        xobj.send(null);
    });

    return function (bandPattern) {
        var binarySolution = [
            "0", "0", "0", "0", "0", "0", "0", "0", "0", "0",
            "0", "0", "0", "0", "0", "0", "0", "0", "0", "0",
            "0", "0", "0"
        ];
        return dictionaryPromise.then(function (database) {
            var i, call, thisKey, final;
            for (i = 0; i < bandPattern.length; i += 1) {
                call = parseInt(bandPattern[i]);
                if (call && !isNaN(call) && call > 2 && call < 27) {
                    binarySolution[call - 3 < 20
                        ? call - 3
                        : call - 4] = "1";
                }
            }
            thisKey = (parseInt(binarySolution.join(''), 2)).toString(36);

            if (database.hasOwnProperty(thisKey)) {
                final = database[thisKey].replace(/GNT/g, 'Genotype');
            } else {
                final = "Unknown Band Pattern";
            }

            return final;
        });
    };
}());