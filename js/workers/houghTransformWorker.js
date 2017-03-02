/*global self*/
(function () {
    'use strict';

    var houghTrans, roundDigit, verifyPeaks;

    houghTrans = function (edges) {
        var x, y, x0, y0, w, h, peaks, maxDist, deltaRad, addCount, theta,
                mdist, finalTheta, finalYi, finalXi, finalH, finalW,
                PI_5_12 = 5 * Math.PI / 12,
                PI_7_12 = 7 * Math.PI / 12,
                PI_1_12 = 1 * Math.PI / 12;

        w = edges.length;
        h = edges[0].length;
        x0 = (w - 1) / 2;
        y0 = (h - 1) / 2;

        peaks = {
            vert: {distPos: [0, 0, 0], distNeg: [0, 0, 0]},
            horz: {distPos: [0, 0, 0], distNeg: [0, 0, 0]}
        };

        maxDist = Math.sqrt(x0 * x0 + y0 * y0); // since x0, y0 is the center
        deltaRad = 3 * Math.PI / maxDist / 10;

        addCount = function (theta, rho, edgeStrength, partition) {
            if (rho >= 0) {
                peaks[partition].distPos[0] += theta * edgeStrength;
                peaks[partition].distPos[1] += rho * edgeStrength;
                peaks[partition].distPos[2] += edgeStrength;
            }
            if (rho <= 0) {
                peaks[partition].distNeg[0] += theta * edgeStrength;
                peaks[partition].distNeg[1] += rho * edgeStrength;
                peaks[partition].distNeg[2] += edgeStrength;
            }
        };


        //perform a hough transform
            //For each edge point (non-zero) draw lines
            // and calculate the distance from the center to that line.
        for (x = 0; x < w; x += 1) {
            for (y = 0; y < h; y += 1) {
                if (edges[x] && edges[x][y] && edges[x][y].strength) {
                    //If we find an edge vary the angle and
                    //compute hough transform curve of angle
                    //by mid distance
                    if (
                        edges[x][y].direction === 0 ||
                        edges[x][y].direction === 45 ||
                        edges[x][y].direction === 135
                    ) {
                        //Look at the 90* region
                        for (theta = PI_5_12; theta < PI_7_12;
                                theta += deltaRad) {
                            mdist = (x - x0) * Math.cos(theta) +
                                    (y - y0) * Math.sin(theta);
                            addCount(theta, mdist, edges[x][y].strength, 'horz');
                        }
                    }
                    if (
                        edges[x][y].direction === 90 ||
                        edges[x][y].direction === 45 ||
                        edges[x][y].direction === 135
                    ) {
                        //Look at the 0* region
                        for (theta = -PI_1_12; theta < PI_1_12;
                                theta += deltaRad) {
                            mdist = (x - x0) * Math.cos(theta) +
                                    (y - y0) * Math.sin(theta);
                            addCount(theta, mdist, edges[x][y].strength, 'vert');
                        }
                    }
                }
            }
        }

        peaks = verifyPeaks(peaks, w, h);

        finalTheta = Math.round(roundDigit * (
            (peaks.vert.distPos[0] + peaks.vert.distNeg[0] -
                    Math.PI / 2 *
                    (peaks.horz.distPos[2] + peaks.horz.distNeg[2]) +
                    peaks.horz.distPos[0] + peaks.horz.distNeg[0]) /
            (peaks.vert.distPos[2] + peaks.vert.distNeg[2] +
                    peaks.horz.distPos[2] + peaks.horz.distNeg[2])
        )) / roundDigit;

        finalYi = Math.round(roundDigit * (
            y0 + peaks.horz.distPos[1] / peaks.horz.distPos[2] +
            peaks.horz.distNeg[1] / peaks.horz.distNeg[2]
        )) / roundDigit;

        finalXi = Math.round(roundDigit * (
            x0 + peaks.vert.distPos[1] / peaks.vert.distPos[2] +
            peaks.vert.distNeg[1] / peaks.vert.distNeg[2]
        )) / roundDigit;

        finalH = Math.round(roundDigit * (
            peaks.horz.distPos[1] / peaks.horz.distPos[2] -
            peaks.horz.distNeg[1] / peaks.horz.distNeg[2]
        )) / roundDigit;

        finalW = Math.round(roundDigit * (
            peaks.vert.distPos[1] / peaks.vert.distPos[2] -
            peaks.vert.distNeg[1] / peaks.vert.distNeg[2]
        )) / roundDigit;


        return {
            x0: finalXi,
            y0: finalYi,
            width: finalW,
            height: finalH,
            theta: finalTheta,
            HTscore: peaks.vert.distPos[2] + peaks.vert.distNeg[2] +
                    peaks.horz.distPos[2] + peaks.horz.distNeg[2],
            HT_vert: [peaks.vert.distPos[2], peaks.vert.distNeg[2]],
            HT_horz: [peaks.horz.distPos[2], peaks.horz.distNeg[2]],
            bool: true
        };
    };

    verifyPeaks = function (peaks, w, h) {
        var result;
        //form of peaks is:
        // peaks = {
        //     vert: {distPos: [0, 0, 0], distNeg: [0, 0, 0]},
        //     horz: {distPos: [0, 0, 0], distNeg: [0, 0, 0]}
        // };
                // totalTheta, totalLength, totalCount

        //Large problems occur down stream when the detected object has no
        // sides or top/bottom based on edge detection, to deal with this
        // we will makes some 'bad' assumptions these are only saved by the
        // fact that the point of this algorithm is not to correctly identify
        // rectangles, but instead attempt to calculate parameters for one that
        // may or may not exist. It is the responsibility of the downstream
        // analysis to determine if one does.

        result = JSON.parse(JSON.stringify(peaks));

        //Fix vert
        if (result.vert.distPos[2] === 0) {
            if (result.vert.distNeg[2] === 0) {
                //Set to the initial parameters
                peaks.vert.distPos[1] = w / 2;
                peaks.vert.distNeg[1] = -w / 2;
                result.vert.distPos[2] = 0.0001;
                result.vert.distNeg[2] = 0.0001;
            } else {
                //More complicated, decrease weight of both and
                // set them equal to each other
                result.vert.distNeg[2] /= 100;
                result.vert.distPos[2] = result.vert.distNeg[2];
                result.vert.distNeg[1] = -w / 4 + result.vert.distNeg[1] / 2;
                peaks.vert.distPos[1] = result.vert.distNeg[1];
            }
        } else if (result.vert.distNeg[2] === 0) {
            result.vert.distPos[2] /= 100;
            result.vert.distNeg[2] = result.vert.distPos[2];
            result.vert.distPos[1] = -w / 4 + result.vert.distPos[1] / 2;
            peaks.vert.distNeg[1] = result.vert.distPos[1];
        }

        //Fix horz
        if (result.horz.distPos[2] === 0) {
            if (result.horz.distNeg[2] === 0) {
                //Set to the initial parameters
                peaks.horz.distPos[1] = h / 2;
                peaks.horz.distNeg[1] = -h / 2;
                result.horz.distPos[2] = 0.0001;
                result.horz.distNeg[2] = 0.0001;
            } else {
                //More complicated, decrease weight of both and
                // set them equal to each other
                result.horz.distNeg[2] /= 100;
                result.horz.distPos[2] = result.horz.distNeg[2];
                result.horz.distNeg[1] = -h / 4 + result.horz.distNeg[1] / 2;
                peaks.horz.distPos[1] = result.horz.distNeg[1];
            }
        } else if (result.horz.distNeg[2] === 0) {
            result.horz.distPos[2] /= 100;
            result.horz.distNeg[2] = result.horz.distPos[2];
            result.horz.distPos[1] = -h / 4 + result.horz.distPos[1] / 2;
            peaks.horz.distNeg[1] = result.horz.distPos[1];
        }

        return result;
    };

    //The worker recieving a message
    self.onmessage = function (event) {
        var result;
        roundDigit = event.data.roundDigit;
        result = houghTrans(event.data.array);
        self.postMessage(result);
    };

    return false;
}());