/*global self*/
(function () {
    'use strict';
    var roundDigit, suppresion, convertToEdges, c225, c675;

    c225 = (90 - 22.5) * Math.PI / 180;
    c675 = (90 - 67.5) * Math.PI / 180;

    convertToEdges = function (metricArray, min_edge) {
        var edgeArray = [], gy, gx, eStren, eDirec, x, y, w, h,
                em = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

        w = metricArray.length;
        h = metricArray[0].length;

        // Loop through the array
        for (x = 1; x < w - 1; x += 1) {
            edgeArray[x - 1] = [];
            for (y = 1; y < h - 1; y += 1) {

                //Get the edge region of interest
                em[0][0] = metricArray[x - 1][y - 1];
                em[1][0] = metricArray[x - 0][y - 1];
                em[2][0] = metricArray[x + 1][y - 1];
                em[0][1] = metricArray[x - 1][y + 0];
                em[2][1] = metricArray[x + 1][y + 0];
                em[0][2] = metricArray[x - 1][y + 1];
                em[1][2] = metricArray[x + 0][y + 1];
                em[2][2] = metricArray[x + 1][y + 1];

                // Calculate the x and y gradients
                gx =
                        -1 * em[0][0] + 1 * em[2][0] +
                        -2 * em[0][1] + 2 * em[2][1] +
                        -1 * em[0][2] + 1 * em[2][2];
                gy =
                        -1 * em[0][0] + 1 * em[0][2] +
                        -2 * em[1][0] + 2 * em[1][2] +
                        -1 * em[2][0] + 1 * em[2][2];

                //Calculate edge strength
                eStren = Math.sqrt(gx * gx + gy * gy);
                eStren = Math.round(eStren * roundDigit) / roundDigit;

                //Determine edge direction
                eDirec = Math.atan(gy / gx);

                //Round edge direction
                if (eDirec < -c225 || eDirec > c225) {
                    eDirec = 0;
                } else if (eDirec > -c675 && eDirec < c675) {
                    eDirec = 90;
                } else if (eDirec > c675 && eDirec < c225) {
                    eDirec = 45;
                } else {
                    eDirec = 135;
                }

                //Save results
                eStren = eStren < min_edge
                    ? 0
                    : eStren;

                edgeArray[x - 1][y - 1] = {
                    strength: eStren,
                    direction: eDirec
                };
            }
        }
        return edgeArray;
    };

    suppresion = function (edgeArray, non_max_sup) {
        var fieldSize = non_max_sup, direc, cmpArr = [], resultArr,
                x, y, xp, yp, w, h, k, maxEdge = 0, storeEdge, clearEdge;

        w = edgeArray.length;
        h = edgeArray[0].length;

        resultArr = JSON.parse(JSON.stringify(edgeArray));

        storeEdge = function (x, y, direc) {
            if ((x >= 0 && x < w && y >= 0 && y < h) &&
                    edgeArray[x][y].direction === direc) {
                cmpArr.push({
                    x: x,
                    y: y,
                    strength: edgeArray[x][y].strength
                });
                if (maxEdge < edgeArray[x][y].strength) {
                    maxEdge = edgeArray[x][y].strength;
                }
            }
        };

        clearEdge = function () {
            cmpArr = [];
            maxEdge = 0;
        };

        for (x = 0; x < w; x += 1) {
            for (y = 0; y < h; y += 1) {
                //Get direction
                direc = edgeArray[x][y].direction;
                clearEdge();
                switch (direc) {
                case 0:
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks above and below on y axis
                        xp = x;
                        yp = y + k;
                        storeEdge(xp, yp, direc);
                    }
                    break;
                case 45:
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks on the 45* axis
                        xp = x + k;
                        yp = y + k;
                        storeEdge(xp, yp, direc);
                    }
                    break;
                case 90:
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks on the left to right
                        xp = x + k;
                        yp = y;
                        storeEdge(xp, yp, direc);
                    }
                    break;
                default:
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks on the 135* axis
                        xp = x - k;
                        yp = y + k;
                        storeEdge(xp, yp, direc);
                    }
                }

                for (k = 0; k < cmpArr.length; k += 1) {
                    // If it is not max, accounting for any pos rounding error
                    if (edgeArray[cmpArr[k].x][cmpArr[k].y].strength <
                            maxEdge - 1 / roundDigit * 100) {
                        //Change the results array to 0, not the test array
                        resultArr[cmpArr[k].x][cmpArr[k].y] = {strength: 0, direction: direc};
                    }
                }
            }
        }
        return resultArr;
    };

    //The worker recieving a message
    self.onmessage = function (event) {
        var non_max_sup, metricArray, for_hough, edgeArray, min_edge;

        non_max_sup = event.data.non_maximum_suppression;
        for_hough = event.data.for_hough;
        metricArray = event.data.array;
        roundDigit = event.data.roundDigit;
        min_edge = event.data.minimum_edge;

        edgeArray = convertToEdges(metricArray, min_edge);

        if (non_max_sup) {
            edgeArray = suppresion(edgeArray, non_max_sup);
        }

        if (for_hough) {
            self.postMessage({
                roundDigit: roundDigit,
                array: edgeArray
            });
        } else {
            self.postMessage(edgeArray);
        }
    };

    return false;
}());