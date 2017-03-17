/*global amd_ww, hcvGenie, PDFJS console, document, checkPromises, jQuery, $*/
var hcvGenie = {};
var medianSignals = [];
var acceptedMedians = [];
var posDistances = [];
var failedRects = [];
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
            pdf2canvas, processCanvas, makeCanvasObject, setUpClickFuncs,
            main, findPositiveNeighborRegion, outlineRectangle,
            numericalSort, calculateMedian, medianGrey, round,
            callGenotype, respondToClick, iWalked, rectFound,
            undoColoring, addBand, calcMedianGrey, onchange,
    //Constants
            roundDigit = 10000,
            // greenXYZ = [76.28056296, -35.52371953, 23.79405389],
            greenXYZ = [76.2806, -35.5237, 23.7941],
            labColorSectionSide = 75, //Through testing this (75) seems the
                                      // fastest
            //No need to run this if there aren't at least 4 x areas
            labColorDistMaxArea = labColorSectionSide * labColorSectionSide * 4,
            minGreenDist = 15, minimum_green_edge = 10,
            minimum_grey_edge = 0.05,
            //The following two sets of data were established using 853 example
            // bands across 10 gels. This was measured by varying the scale
            // uniformly random from 2 to 5 from the pdf sample sent to me.

            // The first set using only the average width
            // and height of the rectangles, the second set looks at the average
            // distances for all the bands that are <= #6 and averages those
            // distances as an additional, less variant, more highly weighted
            // solution.
            //Derived from training sets
            distance_height_band_rat = 0.535608495,
            distance_width_band_rat = 0,
            distance_constant_band_rat = 0.000742077,

            // distance_constant_band_rat = 0.0485802080124064,
            // distance_height_band_rat = -26.623046832386127,
            // distance_width_band_rat = 1.54676646183801,

            //Post better six score calc - lots of testing...
            // distance2_constant_band_rat = 0.0483728056694675,
            // distance2_height_band_rat = 0.000464581012733501,
            // distance2_width_band_rat = 1.33847362845221,
            // distance2_sixScore_band_rat = 0.13044095127234,

            // For test that was just done
            distance2_height_band_rat = 0,
            distance2_width_band_rat = -0.304306184,
            distance2_sixScore_band_rat = 1.183531192,
            distance2_constant_band_rat = 0.00448763,

            //Test 2...
            // distance2_constant_band_rat = 0.0265064097696132,
            // distance2_height_band_rat = 0.0265064097696132,
            // distance2_width_band_rat = 1.023597047521722,
            // distance2_sixScore_band_rat = 0,

            checks_const_object = {
        avg: 1.805357641,
        median: 0.30328079,
        horz: -0.001111204,
        vert: -3.22129E-05,
        avg_horz: 0.015833984,
        avg_vert: -0.00596518,
        med_horz: 0,
        med_vert: 0,
        constant: -0.090801333,
        minimum: 0.206066754
    },

    //Global Objects
            colorDistanceWorker, houghTransformWorker, edgeDetectionWorker,
            vertHoughTransformWorker;

    colorDistanceWorker = amd_ww.startWorkers({
        filename: '../js/workers/colorDistanceWorker.min.js',
        num_workers: 4
    });

    houghTransformWorker = amd_ww.startWorkers({
        filename: '../js/workers/houghTransformWorker.min.js',
        num_workers: 2 //Since Hough Transforms and edge detection often
                        // run simultaneously
    });

    vertHoughTransformWorker = amd_ww.startWorkers({
        filename: '../js/workers/vertHoughTransformWorker.min.js',
        num_workers: 2 //Since Hough Transforms and edge detection often
                        // run simultaneously
    });

    edgeDetectionWorker = amd_ww.startWorkers({
        filename: '../js/workers/edgeDetectionWorker.min.js',
        num_workers: 2 //Since Hough Transforms and edge detection often
                        // run simultaneously
    });

    calculateMedian = function (array) {
        var medArr;

        medArr = JSON.parse(JSON.stringify(array));
        medArr = medArr.sort(numericalSort);

        return (medArr[Math.floor((medArr.length - 1) / 2)] +
                medArr[Math.ceil((medArr.length - 1) / 2)]) / 2;
    };

    undoColoring = function (colorPosArr, canvas) {
        return function () {
            var i;
            for (i = 0; i < colorPosArr.length; i += 1) {
                canvas.clearRect(colorPosArr[i][0], colorPosArr[i][1],
                        colorPosArr[i][2], colorPosArr[i][3]);
            }
        };
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
                theta0 = rectParams.theta, thetaS, x, y, origin = [];
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
            x = Math.floor(r * Math.cos(phi) + x0 + 0.1);
            y = Math.floor(r * Math.sin(phi) + y0 + 0.1);
            origin.push([x, y, 1, 1]);
            myCanvas.fillRect(x, y, 1, 1);
            inc = Math.max(inc, Math.PI / 180);
        }
        //plot center as cross (origin stuff)
        origin.push([Math.round(x0), Math.round(y0) - 1, 1, 3]);
        origin.push([Math.round(x0) - 1, Math.round(y0), 3, 1]);

        //Actually plot it...
        myCanvas.fillRect(Math.round(x0), Math.round(y0) - 1, 1, 3);
        myCanvas.fillRect(Math.round(x0) - 1, Math.round(y0), 3, 1);

        return undoColoring(origin, myCanvas);
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
                if (rectangle.bool) {
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
                } else {
                    next(edge.y + 1);
                }
            }).catch(function (error) {
                console.error(error);
            });
            return;
        };

        getmxb = function (params, rectangle) {
            var i, count, xy_m = 0, x_m = 0, y2_m = 0, y_m = 0, slope,
                    intercept, notfirst, x_m_0 = 0, xhere;
            //Add new points
            //Rect scores seem to be in the 1000's, weighting the center on how
            // good the rectangle is...
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
            var htEdges, testRegionParams;
            if (!edge.end) {
                htEdges = getHTEdgeArr(edge, edges, params);
                testRegionParams = {
                    x0: htEdges.array.length / 2 + params.x_shift + htEdges.x_shift,
                    y0: htEdges.array[0].length / 2 + params.y_shift + htEdges.y_shift,
                    height: htEdges.array[0].length,
                    theta: 0,
                    width: htEdges.array.length
                };
                // console.log(htEdges.array.length, htEdges.array[0].length);
                outlineRectangle(testRegionParams, '#FFFFCC', myCanvas);
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
                    rectangle.HT_ret = JSON.parse(JSON.stringify(rectangle));

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
                        var checks, distanceFromGuess, check2;
                        distanceFromGuess = Math.sqrt(
                            Math.pow(rectangle.y0 - testRegionParams.y0, 2) +
                                Math.pow(rectangle.x0 - testRegionParams.x0, 2)
                        );
                        //We check distance because if the spot checked is really
                        // wrong it will come back and think it is somewhere
                        // entirely off the strip.

                        check2 = {
                            //Overall strength of signal checks
                            avg: greyScore.avg,
                            median: greyScore.median,
                            //Edge strength
                            horz: (rectangle.HT_horz[0] + rectangle.HT_horz[1]) / rectangle.width,
                            vert: (rectangle.HT_vert[0] + rectangle.HT_vert[1]) / rectangle.height,

                            //ratio
                            avg_horz: -Math.log(greyScore.avg / ((rectangle.HT_horz[0] + rectangle.HT_horz[1]) / rectangle.width)),
                            avg_vert: -Math.log(greyScore.avg / ((rectangle.HT_vert[0] + rectangle.HT_vert[1]) / rectangle.height)),
                            med_horz: -Math.log(greyScore.median / ((rectangle.HT_horz[0] + rectangle.HT_horz[1]) / rectangle.width)),
                            med_vert: -Math.log(greyScore.median / ((rectangle.HT_vert[0] + rectangle.HT_vert[1]) / rectangle.height))
                        };

                        //new...
                        checks = Object.keys(check2).map(function (key) {
                            return check2[key] * checks_const_object[key];
                        }).reduce(function (a, b) {
                            return a + b;
                        }) + checks_const_object.constant;

                        if (checks > checks_const_object.minimum && distanceFromGuess < rectangle.width) {
                        // if (check2 < 5 && check2 > 4 && distanceFromGuess < rectangle.width) {

                            //We accept that this is a rectangle
                            acceptedMedians.push([checks, greyScore.avg, greyScore.median, rectangle.HTscore]);
                            params.rect_width = rectangle.width;
                            params.rect_height = rectangle.height;
                            params.theta = rectangle.theta;
                            rectangle.greyScore = greyScore;
                            rectangle.greyScore.checks = checks;
                            rectangle.greyScore.check2 = check2;
                            rectangle.InitialParams = testRegionParams;
                            params = getmxb(params, rectangle);
                            var undo = outlineRectangle(rectangle, '#FFA500', myCanvas);
                            // rectFound(rectangle, params);
                            params.distances.push({
                                distance: round(Math.sqrt(Math.pow(rectangle.x0
                                        - params.x_origin, 2) +
                                        Math.pow(rectangle.y0 -
                                        params.y_origin, 2))),
                                //Note that models for the below improved on the
                                // above slightly.
                                // distance2: round(Math.abs(rectangle.y0 -
                                //         params.y_origin) * Math.sqrt(params.m *
                                //         params.m + 1)),
                                rectangle: rectangle
                            });
                            rectangle.clear = undo;
                            //Just upped to 1.555 from 1.55 to try and skip a double call
                            next(Math.floor(rectangle.y0 - params.y_shift +
                                params.rect_height));
                        } else {
                            failedRects.push([checks, greyScore.avg, greyScore.median, rectangle.HTscore]);
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

                    iWalked(xPos + params.x_shift, yPos + params.y_shift, params.lane_number);

                    // walkedHere(xPos + params.x_shift, yPos + params.y_shift);

                    //If we find an edge
                    for (xRange = 0; xRange < 1 && !edgeFound; xRange += 1) {
                        if (
                            edges[xPos + xRange] &&
                            edges[xPos + xRange][yPos].direction === 0 &&
                            edges[xPos + xRange][yPos].strength > 0
                        ) {
                            edgeFound = true;
                            blankCheck = 0.95 * (params.distances.length + 1);
                            performHoughTransform({x: xPos, y: yPos,
                                    end: false}, edges, params, walkFunction);
                        }
                    }

                    if (!edgeFound && count > blankCheck * params.rect_width) {
                        edgeFound = true;
                        vertHoughTrans({x: xPos, y: yPos,
                                end: false}, edges, params, walkFunction);
                        blankCheck = 1.5 + 0.95 * (params.distances.length);
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

        moveDownLane = function (boarderParams, rectangle, rectangleScore, laneNumber) {
            return function (edges) {
                var yPos, params;
                yPos = 0;
                console.log(edges.length, edges[0].length, laneNumber, rectangle);
                params = {
                    lane_number: laneNumber,
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
                            greenRectangleScore, i)
                ));
            }
        }());

        distancePromise = {};

        distancePromise.lanePromise = Promise.all(lanePromises).then(function (allLanes) {
            //calculate the actual lane calls
            var sixScore = 0, sixLimit, i, j, sixCount = 0, call, callArr = [],
                    distance_cont, avgHeight = 0, avgWidth = 0, hwCount = 0,
                    allLanesFunc, writtenText = [], changeCall,
                    removeCall;

            //Idea here is that in order to allow the allLanes object to be
            // constantly updatable, we need to have it be a function rather
            // than a real object. This object needs to be non editable in most
            // cases, with editability very specified
            allLanesFunc = function () {
                var ret = JSON.parse(JSON.stringify(allLanes)), ii, jj;
                //Now simplify the arrays
                for (ii = 0; ii < ret.length; ii += 1) {
                    for (jj = 0; jj < ret[ii].bands.length; jj += 1) {
                        if (!ret[ii].bands[jj]) {
                            ret[ii].bands.splice(jj, 1);
                            jj -= 1;
                        }
                    }
                }

                //Add the special functions
                return ret;
            };

            addBand = function (lane, rectangle) {
                var distance;
                distance = Math.sqrt(
                    Math.pow(allLanes[lane].indicatorBand.x0 - rectangle.x0, 2) +
                    Math.pow(allLanes[lane].indicatorBand.y0 - rectangle.y0, 2)
                );
                call = Math.round(distance *
                        distance_cont + distance2_constant_band_rat);

                j = allLanes[lane].bands.length;
                i = lane;

                //update objects
                allLanes[lane].bands.push({
                    distance: distance,
                    rectangle: rectangle,
                    call: call,
                    change_call: changeCall(i, j),
                    remove: removeCall(i, j)
                });
                callArr[i].push(call);
                writtenText[i][j] = [
                    call,
                    rectangle.x0 - avgWidth / 2.2,
                    rectangle.y0 - avgHeight / 1.65,
                    "Bold " + Math.round(avgHeight * 2) + "px Georgia"
                ];

                //write call on the canvas
                myCanvas.fillText(
                    writtenText[i][j][0],
                    writtenText[i][j][1],
                    writtenText[i][j][2],
                    writtenText[i][j][3],
                    '#8A2BE2'
                );

                return hcvGenie.genotype(callArr[i]).then(
                    callGenotype(allLanes[i])
                ).then(function () {
                    return medianGrey(rectangle, myCanvas);
                }).then(function (greyScore) {
                    var checks, check2, rect;
                    rect = allLanes[i].bands[j].rectangle;
                    //We check distance because if the spot checked is really
                    // wrong it will come back and think it is somewhere
                    // entirely off the strip.

                    check2 = {
                        //Overall strength of signal checks
                        avg: greyScore.avg,
                        median: greyScore.median,
                        //Edge strength
                        horz: (rect.HT_horz[0] + rect.HT_horz[1]) / rect.width,
                        vert: (rect.HT_vert[0] + rect.HT_vert[1]) / rect.height,

                        //ratio
                        avg_horz: -Math.log(greyScore.avg / ((rect.HT_horz[0] + rect.HT_horz[1]) / rectangle.width)),
                        avg_vert: -Math.log(greyScore.avg / ((rect.HT_vert[0] + rect.HT_vert[1]) / rectangle.height)),
                        med_horz: -Math.log(greyScore.median / ((rect.HT_horz[0] + rect.HT_horz[1]) / rectangle.width)),
                        med_vert: -Math.log(greyScore.median / ((rect.HT_vert[0] + rect.HT_vert[1]) / rectangle.height))
                    };

                    checks = Object.keys(check2).map(function (key) {
                        return check2[key] * checks_const_object[key];
                    }).reduce(function (a, b) {
                        return a + b;
                    }) + checks_const_object.constant;

                    //We accept that this is a rectangle
                    rect.greyScore = greyScore;
                    rect.greyScore.checks = checks;
                    rect.greyScore.check2 = check2;

                    allLanes[i].bands[j].rectangle = rect;

                    return allLanes[i].bands[j];
                }).then(function (band) {
                    onchange(allLanesFunc());
                    return rectFound(band, {lane_number: i}, allLanes[i]);
                });
            };

            changeCall = function (i, j) {
                return function (new_call) {
                    var band = allLanes[i].bands[j], newCall = [], ii;

                    //Actually update the objects
                    band.call = new_call;
                    callArr[i][j] = new_call;

                    //Delete the old writing
                    myCanvas.clearText(
                        writtenText[i][j][0],
                        writtenText[i][j][1],
                        writtenText[i][j][2],
                        writtenText[i][j][3]
                    );

                    //Add in new writting
                    writtenText[i][j][0] = new_call;
                    myCanvas.fillText(
                        writtenText[i][j][0],
                        writtenText[i][j][1],
                        writtenText[i][j][2],
                        writtenText[i][j][3],
                        '#8A2BE2'
                    );


                    //Still needs to be done in case bands have been
                    //removed
                    for (ii = 0; ii < callArr[i].length; ii += 1) {
                        if (callArr[i][ii]) {
                            newCall.push(callArr[i][ii]);
                        }
                    }

                    return hcvGenie.genotype(newCall).then(
                        callGenotype(allLanes[i])
                    ).then(function (x) {
                        onchange(allLanesFunc());
                        return x;
                    });
                };
            };

            removeCall = function (i, j) {
                return function () {
                    var band = allLanes[i].bands[j], newCall = [], ii;
                    //get rid of rectangle
                    band.rectangle.clear();

                    //Get rid of the lable
                    myCanvas.clearText(
                        writtenText[i][j][0],
                        writtenText[i][j][1],
                        writtenText[i][j][2],
                        writtenText[i][j][3]
                    );

                    //Actually delete the objects
                    delete allLanes[i].bands[j];
                    delete callArr[i][j];
                    // console.log(band);

                    for (ii = 0; ii < callArr[i].length; ii += 1) {
                        if (callArr[i][ii]) {
                            newCall.push(callArr[i][ii]);
                        }
                    }

                    return hcvGenie.genotype(newCall).then(
                        callGenotype(allLanes[i])
                    ).then(function (x) {
                        onchange(allLanesFunc());
                        return x;
                    });
                };
            };

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
                writtenText[i] = [];
                for (j = 0; j < allLanes[i].bands.length; j += 1) {
                    call = Math.round(allLanes[i].bands[j].distance *
                            distance_cont + distance2_constant_band_rat);

                    allLanes[i].bands[j].call = call;
                    allLanes[i].bands[j].change_call = changeCall(i, j);
                    allLanes[i].bands[j].remove = removeCall(i, j);

                    rectFound(allLanes[i].bands[j], {lane_number: i}, allLanes[i]);

                    callArr[i].push(call);

                    //Write call on canvas
                    writtenText[i][j] = [
                        call,
                        allLanes[i].bands[j].rectangle.x0 - avgWidth / 2.2,
                        allLanes[i].bands[j].rectangle.y0 - avgHeight / 1.65,
                        "Bold " + Math.round(avgHeight * 2) + "px Georgia"
                    ];
                    myCanvas.fillText(
                        writtenText[i][j][0],
                        writtenText[i][j][1],
                        writtenText[i][j][2],
                        writtenText[i][j][3],
                        '#8A2BE2'
                    );
                }
                hcvGenie.genotype(callArr[i]).then(
                    callGenotype(allLanes[i])
                );
            }
            return {
                lanes: allLanesFunc,
                rect_width: avgWidth,
                rect_height: avgHeight,
                six_score: sixScore,
                region: analysisRegion
            };
        });

        distancePromise.model_fit_data = function () {
            return distancePromise.lanePromise.then(function (lanesObj) {
                var i, j, lanes = lanesObj.lanes(), band1, band2, angle,
                        testPosition, pos = {x: 0, y: 0}, sortBands, sixScore,
                        negativePromises = [], positives = [], distanceCall = [],
                        reCalcSixScore;

                sortBands = function (a, b) {
                    return a.call - b.call;
                };

                testPosition = function (x, y, w, h) {
                    return Promise.all([
                        myCanvas.getGaus(
                            myCanvas.getGrey,
                            // The -1/+2 are because sobel edge detection  is the
                            // following step which leaves off the outer boarder of the
                            // array this adjustment will actually create the array we
                            // expect based on the parameters
                            Math.floor(x - w * 2 / 2) - 1,
                            Math.floor(y - h * 1.75 / 2) - 1,
                            Math.ceil(w * 2) + 2,
                            Math.floor(h * 1.75) + 2
                        ).then(function (gausArr) {
                            return edgeDetectionWorker.submit({
                                array: gausArr,
                                non_maximum_suppression: 0, //this is field size for nms
                                // 95.3005% for 0 vs 94.3716% for 1
                                for_hough: true,
                                roundDigit: roundDigit,
                                minimum_edge: minimum_grey_edge
                            });
                        }).then(function (edges) {
                            return houghTransformWorker.submit(edges);
                        }),
                        medianGrey({
                            x0: x,
                            y0: y,
                            width: w,
                            height: h
                        }, myCanvas)
                    ]).then(function (results) {
                        var rectangle = results[0], greyScore = results[1];
                        return {
                            //Overall strength of signal checks
                            avg: greyScore.avg,
                            median: greyScore.median,
                            //Edge strength
                            horz: (rectangle.HT_horz[0] + rectangle.HT_horz[1]) / w,
                            vert: (rectangle.HT_vert[0] + rectangle.HT_vert[1]) / h,

                            //ratio
                            avg_horz: -Math.log(greyScore.avg / ((rectangle.HT_horz[0] + rectangle.HT_horz[1]) / w)),
                            avg_vert: -Math.log(greyScore.avg / ((rectangle.HT_vert[0] + rectangle.HT_vert[1]) / h)),
                            med_horz: -Math.log(greyScore.median / ((rectangle.HT_horz[0] + rectangle.HT_horz[1]) / w)),
                            med_vert: -Math.log(greyScore.median / ((rectangle.HT_vert[0] + rectangle.HT_vert[1]) / h))
                        };
                    });
                };

                reCalcSixScore = function () {
                    var score = 0, count = 0;
                    for (i = 0; i < lanes.length; i += 1) {
                        lanes[i].bands = lanes[i].bands.sort(sortBands);
                        for (j = 0; j < lanes[i].bands.length - 1; j += 1) {
                            if (lanes[i].bands[j].call < 7) {
                                score += lanes[i].bands[j].distance / lanes[i].bands[j].call;
                                count += 1;
                            }
                        }
                    }
                    return score / count;
                };

                sixScore = reCalcSixScore();

                // console.log('starting band stuff...');

                for (i = 0; i < lanes.length; i += 1) {
                    lanes[i].bands = lanes[i].bands.sort(sortBands);
                    if (lanes[i].bands.length > 1) {
                        for (j = 0; j < lanes[i].bands.length - 1; j += 1) {
                            band1 = lanes[i].bands[j];
                            positives.push(band1.rectangle.greyScore.check2);
                            distanceCall.push([band1.call, band1.distance / lanesObj.rect_height, band1.distance / lanesObj.rect_width, band1.distance / sixScore]);
                            band2 = lanes[i].bands[j + 1];
                            if (band2.call - band1.call > 1) {
                                angle = Math.atan2((band2.rectangle.y0 - band1.rectangle.y0),
                                        (band2.rectangle.x0 - band1.rectangle.x0));
                                pos.x = Math.cos(angle) * lanesObj.rect_height + band1.rectangle.x0;
                                pos.y = Math.sin(angle) * lanesObj.rect_height + band1.rectangle.y0;
                                while (pos.y < band2.rectangle.y0 - Math.sin(angle) * lanesObj.rect_height) {
                                    //Test the position
                                    negativePromises.push(testPosition(pos.x, pos.y, lanesObj.rect_width, lanesObj.rect_height));
                                    myCanvas.fillRect(pos.x - 1, pos.y, 3, 1, '#228b22');

                                    //Adjust the position
                                    pos.x += Math.cos(angle) * lanesObj.rect_height / 1.5;
                                    pos.y += Math.sin(angle) * lanesObj.rect_height / 1.5;

                                }
                            }
                        }
                        //push the last one
                        positives.push(band2.rectangle.greyScore.check2);
                        distanceCall.push([band2.call, band2.distance / lanesObj.rect_height, band2.distance / lanesObj.rect_width, band2.distance / sixScore]);
                    } else {
                        positives.push(lanes[i].bands[0].rectangle.greyScore.check2);
                        distanceCall.push([lanes[i].bands[0].call, lanes[i].bands[0].distance / lanesObj.rect_height, lanes[i].bands[0].distance / lanesObj.rect_width, lanes[i].bands[0].distance / sixScore]);
                    }
                }

                return Promise.all(negativePromises).then(function (x) {
                    var ii, g_scores = [], temp, keys = Object.keys(x[i]),
                            mapRet, posRet;
                    mapRet = function (ind) {
                        return function (cat) {
                            return x[ind][cat];
                        };
                    };
                    posRet = function (ind) {
                        return function (cat) {
                            return positives[ind][cat];
                        };
                    };
                    for (ii = 0; ii < x.length; ii += 1) {
                        temp = [0];
                        g_scores.push(temp.concat(keys.map(mapRet(ii))));
                    }
                    for (ii = 0; ii < positives.length; ii += 1) {
                        temp = [1];
                        g_scores.push(temp.concat(keys.map(posRet(ii))));
                    }
                    return {
                        grey_scores: {
                            data: g_scores,
                            columns: ['band'].concat(keys)
                        },
                        distances: {
                            data: distanceCall,
                            columns: ['call', 'dist_height', 'dist_width', 'dist_sixScore']
                        }
                    };
                });
            });
        };
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
                w, h, 1).then(calcMedianGrey).then(function (grey1) {
            return grey1;
        });
            // return myCanvas.getGrey(xs, ys - h / 2, w, h / 2, 1);
        // }).then(calcMedianGrey).then(function (grey2) {
        //     if (g1 - grey2 > minimumMedianGrey) {
        //         console.log('the greys!', g1, grey2);
        //         acceptedMedians.push([g1, grey2]);
        //     } else {
        //         console.log('no grey?', g1, grey2);
        //     }
        //     if (g1 > 1.1) {
        //         acceptedMedians.push([g1, grey2]);
        //         return g1;
        //     }
        //     return g1 - grey2;
        // });
    };

    calcMedianGrey = function (arr) {
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
        return {median: median, avg: total / count};
    };

    makeCanvasObject = function (canvasElement) {
        //This sets up all the functions on the canvas object
        var retObj = {}, context = canvasElement.getContext('2d'),
                canvasArr = context.getImageData(0, 0,
                canvasElement.width, canvasElement.height).data,
                colorDistMemorize = {}, context2,
                //Local functions
                calculateGausWindow, gausWeight;
        // nest the canvas element
        var div = $('<div>', {id: 'mynewdiv'});
        div.css('position', 'relative');
        div.append($(canvasElement));
        $(canvasElement).attr('id', "mainOne");
        $(canvasElement).css('z-index', 1);
        $(canvasElement).css('position', "absolute");
        $(canvasElement).css('left', "0px");
        $(canvasElement).css('top', "0px");
        $(canvasElement).css('width', "100%");

        //make a second canvas object
        var drawingCanvas = $('<canvas>', {id: 'drawingCanvas'});
        drawingCanvas.appendTo(div);
        drawingCanvas[0].height = canvasElement.height;
        drawingCanvas[0].width = canvasElement.width;
        drawingCanvas.css('z-index', 2);
        drawingCanvas.css('position', "absolute");
        drawingCanvas.css('left', "0px");
        drawingCanvas.css('top', "0px");
        drawingCanvas.css('width', "100%");
        context2 = drawingCanvas[0].getContext('2d');
        // console.log(div);
        // console.log(drawingCanvas);


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
            //depth is used to skip things
            // canvasArr maintains the original color.
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
            context2.fillStyle = x;
        };

        retObj.fillRect = function (x, y, w, h, color) {
            if (color) {
                context2.fillStyle = color;
            }
            context2.fillRect(x, y, w, h);
        };

        retObj.fillRect = function (x, y, w, h, color) {
            if (color) {
                context2.fillStyle = color;
            }
            context2.fillRect(x, y, w, h);
        };

        retObj.fillText = function (text, x, y, font, color) {
            if (color) {
                context2.fillStyle = color;
            }
            if (font) {
                context2.font = font;
            }
            context2.fillText(text, x, y);
        };

        retObj.clearText = function (text, x, y, font) {
            var previousGCO = context2.globalCompositeOperation;
            context2.globalCompositeOperation = "destination-out";
            if (font) {
                context2.font = font;
            }
            // context2.fillStyle = "rgba(255, 255, 255, 0.5)";
            context2.fillStyle = "#ffffff";
            context2.fillText(text, x, y);
            context2.globalCompositeOperation = previousGCO;
        };

        retObj.clearRect = function (x, y, w, h) {
            context2.clearRect(x, y, w, h);
        };

        retObj.canvasHolder = div;
        // console.log(retObj);

        return retObj;
    };

    numericalSort = function (a, b) {
        return b - a;
    };

    pdf2canvas = function (startObj, canvas, context, scaleSet) {
        return function (pdf) {
            return pdf.getPage(startObj.image.pageNumber).then(function (page) {
                var viewport, scale, renderContext;

                //Set scale
                scale = scaleSet || 2;

                scale = 2.2;

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


    //Set up the functions needed to respond to clicks
    setUpClickFuncs = function () {
        var getMousePos, walked = {}, rectangles = {}, checkPosition,
                width = 0, height = 0, rectCount = 1e-50, //fix divide by 0
                popup_band, popup_blank, $modal, createBlankPopup,
                canvasObject, responding = false;
        getMousePos = function ($canvas, evt) {
            var rect = $canvas.getBoundingClientRect(), // abs. size of element
                scaleX = $canvas.width / rect.width,    // relationship bitmap vs. element for X
                scaleY = $canvas.height / rect.height;  // relationship bitmap vs. element for Y

            return {
                x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
                y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
            };
        };

        setUpClickFuncs = function () {
            walked = {};
            rectangles = {};
            width = 0;
            height = 0;
            rectCount = 1e-50;
            responding = false;
        };

        //Stuff to record where things are found
        iWalked = function (x, y, lane) {
            var x0 = Math.round(x), y0 = Math.round(y);
            walked[x0] = walked[x0] || {};
            walked[x0][y0] = [{
                x0: x,
                y0: y,
                lane_number: lane,
                edges: function (ww, hh, x, y) {
                    // var testRegionParams = {
                    //     x0: x,
                    //     y0: y,
                    //     height: hh * 1.25,
                    //     theta: 0,
                    //     width: ww * 1.65
                    // };
                    // outlineRectangle(testRegionParams, '#FFFFCC', canvasObject);
                    return canvasObject.getGaus(
                        canvasObject.getGrey,
                        // The -1/+2 are because sobel edge detection  is the
                        // following step which leaves off the outer boarder of the
                        // array this adjustment will actually create the array we
                        // expect based on the parameters
                        Math.floor(x - ww * 2 / 2) - 1,
                        Math.floor(y - hh * 1.75 / 2) - 1,
                        Math.ceil(ww * 2) + 2,
                        Math.floor(hh * 1.75) + 2
                    ).then(function (gausArr) {
                        return edgeDetectionWorker.submit({
                            array: gausArr,
                            non_maximum_suppression: 0, //this is field size for nms
                            // 95.3005% for 0 vs 94.3716% for 1
                            for_hough: true,
                            roundDigit: roundDigit,
                            minimum_edge: minimum_grey_edge
                        });
                    }).then(function (edges) {
                        return houghTransformWorker.submit(edges);
                    }).then(function (rect) {
                        rect.x0 = Math.floor(x - ww * 2 / 2) + rect.x0;
                        rect.y0 = Math.floor(y - hh * 1.75 / 2) + rect.y0;
                        rect.width = ww;
                        rect.height = hh;
                        return rect;
                    });
                }
            }];

            return;
        };

        checkPosition = function (pos) {
            var x, y, i, found = [], j, x0, y0, dist, minDist = Infinity, ret, rWid, rHig;
            x0 = Math.round(pos.x);
            y0 = Math.round(pos.y);
            rWid = width / rectCount;
            rHig = height / rectCount;

            for (x = Math.floor(x0 - rWid); Math.ceil(x < x0 + rWid + 1); x += 1) {
                for (y = Math.floor(y0 - 2 * rHig); y < Math.ceil(y0 + 2 * rHig + 1); y += 1) {
                    if (rectangles[x] && rectangles[x][y]) {
                        found.push(rectangles[x][y]);
                    } else if (walked[x] && walked[x][y]) {
                        found.push(walked[x][y]);
                    }
                }
            }

            for (i = 0; i < found.length; i += 1) {
                dist = Math.sqrt(
                    Math.pow(pos.x - found[i][0].x0, 2) +
                    Math.pow(pos.y - found[i][0].y0, 2)
                );
                //heavily prioritize found rectangles...
                if (found[i].length === 2) {
                    dist -= (height / rectCount / 1.5);
                    dist /= 2;
                }
                if (dist < minDist) {
                    j = i;
                    minDist = dist;
                }
            }

            if (j !== undefined) {
                ret = found[j];
            } else {
                ret = undefined;
            }
            return ret;
        };

        rectFound = function (band, params, lane) {
            var x, y, rect;

            rect = band.rectangle;
            rect.lane_number = params.lane_number;

            x = Math.round(rect.x0);
            y = Math.round(rect.y0);


            height += rect.height;
            width += rect.width;
            rectCount += 1;

            // console.log(rect, params);

            rectangles[x] = rectangles[x] || {};
            rectangles[x][y] = [rect, band, lane];

            return rectangles[x][y];
        };

        popup_band = function (hit) {

            // console.log(hit);
            $modal.title('Band');
            $modal.body(
                '<p>Lane: ' + (hit[0].lane_number + 1) + '</p>' +
                '<p>Band Call: <span id="band_call_modal">' + hit[1].call +
                '</span>&nbsp;&nbsp;&nbsp;Update Band Call: <input id="update_call_img"></input>' + '</p>' +
                '<p>Genotype: <span id="genotype_call_modal"></span></p>' +
                '<p>Greyness: (median) ' + hit[0].greyScore.median.toFixed(3) +
                ', (average) ' + hit[0].greyScore.avg.toFixed(3) + '</p>' +
                '<p>Horizontal Edge Strength: ' +
                hit[0].greyScore.check2.horz.toFixed(3) + '</p>' +
                '<p>Verticle Edge Strength: ' +
                hit[0].greyScore.check2.vert.toFixed(3) + '</p>' +
                '<p>Ratios (avg/vert, avg/horz, med/vert, med/horz): ' +
                hit[0].greyScore.check2.avg_vert.toFixed(3) + ', ' +
                hit[0].greyScore.check2.avg_horz.toFixed(3) + ', ' +
                hit[0].greyScore.check2.med_vert.toFixed(3) + ', ' +
                hit[0].greyScore.check2.med_horz.toFixed(3) + '</p>'
            );

            $('#genotype_call_modal').text(hit[2].genotype);

            $('#update_call_img').on('change', function (evt) {
                evt.preventDefault();
                var p = hit[1].change_call(evt.currentTarget.value * 1);
                $('#band_call_modal').text(evt.currentTarget.value);
                p.then(function (x) {
                    // console.log(x);
                    $('#genotype_call_modal').text(x);
                });
            });

            $modal.footer().unbind("click").html("Remove Band").click(function () {
                // console.log(hit);
                var p = hit[1].remove();
                $modal.modal('toggle');
                //remove so it will not come up when clicked any longer.
                delete rectangles[Math.round(hit[0].x0)][Math.round(hit[0].y0)];
                p.then(function (x) {
                    // console.log(x);
                    $('#genotype_call_modal').text(x);
                });
            });

            $modal.modal('toggle');
            //We have to let the modal come into full view, once that occurs we
            // can focus on the actual input feild putting the cursor there.
            setTimeout(function () {
                $('#update_call_img').focus();
            }, 500);
            return hit;
        };

        popup_blank = function (hit, pos) {
            var rectangle;
            $modal.title('Add band?');
            $modal.body('<span id="transform_modal">Applying Hough Transform, please wait...</span>');
            $modal.footer().unbind("click").html("Add Band");

            $modal.modal('toggle');


            hit[0].edges(width / rectCount, height / rectCount, pos.x, pos.y).then(function (x) {
                rectangle = x;
                return medianGrey(rectangle, canvasObject);
            }).then(function (greyScore) {
                var checks, check2, rect;
                rect = rectangle;
                //We check distance because if the spot checked is really
                // wrong it will come back and think it is somewhere
                // entirely off the strip.

                check2 = {
                    //Overall strength of signal checks
                    avg: greyScore.avg,
                    median: greyScore.median,
                    //Edge strength
                    horz: (rect.HT_horz[0] + rect.HT_horz[1]) / rect.width,
                    vert: (rect.HT_vert[0] + rect.HT_vert[1]) / rect.height,

                    //ratio
                    avg_horz: -Math.log(greyScore.avg / ((rect.HT_horz[0] + rect.HT_horz[1]) / rectangle.width)),
                    avg_vert: -Math.log(greyScore.avg / ((rect.HT_vert[0] + rect.HT_vert[1]) / rectangle.height)),
                    med_horz: -Math.log(greyScore.median / ((rect.HT_horz[0] + rect.HT_horz[1]) / rectangle.width)),
                    med_vert: -Math.log(greyScore.median / ((rect.HT_vert[0] + rect.HT_vert[1]) / rectangle.height))
                };

                checks = Object.keys(check2).map(function (key) {
                    return check2[key] * checks_const_object[key];
                }).reduce(function (a, b) {
                    return a + b;
                }) + checks_const_object.constant;

                $modal.body('<p>This proposed rectangle for lane ' + (hit[0].lane_number + 1) + ' has a grey score of: ' +
                        checks.toFixed(3) + '. This can be compared to the current minimum: ' +
                        checks_const_object.minimum + '.</p>');

                $modal.footer().click(function (evt) {
                    evt.preventDefault();

                    //Get rid of the click event
                    $modal.footer().off();
                    rect.clear = outlineRectangle(rect, '#FFA500', canvasObject);
                    $modal.modal('toggle');
                    addBand(hit[0].lane_number, rect).then(function (popupBand) {
                        //Set timeout to allow modal to finish transition
                        setTimeout(function () {
                            popup_band(popupBand);
                        }, 500);
                    });
                });
                return rect;
            });
        };

        //createBlankPopup
        createBlankPopup = function () {
            $modal = $('<div>', {
                class: "modal fade",
                tabindex: "-1",
                role: "dialog"
            });
            var $mod_dialog = $('<div>', {
                    class: "modal-dialog",
                    role: "document"
                }),
                $mod_content = $('<div>', {
                    class: "modal-content"
                }),
                $mod_header = $('<div>', {
                    class: "modal-header",
                    html: '<button type="button" class="close" data-dismiss=' +
                            '"modal" aria-label="Close"><span aria-hidden="true">' +
                            '&times;</span></button>'
                }),
                $mod_title = $('<div>', {
                    class: "modal-title"
                }),
                $mod_body = $('<div>', {
                    class: "modal-body",
                    style: "word-break:break-all;"
                }),
                $mod_footer = $('<div>', {
                    class: "modal-footer",
                    html: '<button type="button" class="btn btn-default" ' +
                            'data-dismiss="modal">Close</button>'
                }),
                $mod_footer_extra_button = $('<button>', {
                    class: "btn btn-primary"
                });

            $mod_content.append($mod_header.append($mod_title));
            $mod_content.append($mod_body);
            $mod_content.append($mod_footer.append($mod_footer_extra_button));
            $mod_content.appendTo($mod_dialog.appendTo($modal));

            //It does not matter where this gets put...
            $modal.appendTo($('body'));

            // Add some extra functions
            $modal.title = function (html) {
                $mod_title.html(html);
            };

            $modal.body = function (html) {
                $mod_body.html(html);
            };

            $modal.footer = function () {
                return $mod_footer_extra_button;
            };
            createBlankPopup = function () {
                return;
            };
        };

        //Driver function
        respondToClick = function (canvasElement, canvasObj) {
            return function (evt) {
                var pos, hit;
                evt.preventDefault();
                if (!responding) {
                    responding = true;
                    canvasObject = canvasObj;

                    //create the popup element if it has not already been made
                    createBlankPopup();

                    //This gets the x/y coordinates of the click event
                    pos = getMousePos(canvasElement, evt);

                    //This finds what is the closest neighbor
                    hit = checkPosition(pos);

                    //Make a modal popup for the nearest neighbor
                    if (hit) {
                        if (hit.length > 2) {
                            popup_band(hit);
                        } else {
                            popup_blank(hit, pos);
                        }
                    }

                    //If there is no hit, then do not respond

                    // console.log(hit);

                    setTimeout(function () {
                        responding = false;
                    }, 50);

                    return pos;
                }
            };
        };
    };


    //Truely the main function, this returns to the calling function
    processCanvas = function (canvasElement) {
        var myCanvasObject, greenRegionPromise,
                distancesMatrix;

        //Convert the canvas into an object with a number of functions attached
        myCanvasObject = makeCanvasObject(canvasElement);
        // console.log(canvasElement);

        //Add in the click response stuff
        $(canvasElement).parent().click(respondToClick(canvasElement, myCanvasObject));
        $(canvasElement).parent().children().click(respondToClick(canvasElement, myCanvasObject));

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
            canvas: $(canvasElement).parent(),
            bandingPromise: distancesMatrix,
            canvasObject: myCanvasObject
        };
    };

    round = function (numb) {
        return Math.round(numb * roundDigit) / roundDigit;
    };

    main = function (input_obj) {
        //This should clear the jobs buffer...
        colorDistanceWorker.clear_jobs();
        houghTransformWorker.clear_jobs();
        vertHoughTransformWorker.clear_jobs();
        edgeDetectionWorker.clear_jobs();

        //reset click funcs
        setUpClickFuncs();

        if (input_obj.onchange && typeof input_obj.onchange === 'function') {
            onchange = input_obj.onchange;
        } else {
            onchange = function () {
                // console.log(input_obj, 'called blank change function');
                return;
            };
        }
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