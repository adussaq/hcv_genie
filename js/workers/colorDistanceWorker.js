/*global self*/
(function () {
    'use strict';
    var roundDigit, rgb2xyz, rgb2lab, convertToLABcolorSpace,
            calculateDistances, distLAB;

    rgb2xyz = function (rgb) {
        //https://github.com/MoOx/color-convert/blob/master/conversions.js
        var x, y, z, r = rgb[0] / 255,
                g = rgb[1] / 255,
                b = rgb[2] / 255;

        // assume sRGB
        r = r > 0.04045
            ? Math.pow(((r + 0.055) / 1.055), 2.4)
            : (r / 12.92);
        g = g > 0.04045
            ? Math.pow(((g + 0.055) / 1.055), 2.4)
            : (g / 12.92);
        b = b > 0.04045
            ? Math.pow(((b + 0.055) / 1.055), 2.4)
            : (b / 12.92);

        x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
        y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
        z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

        return [x * 100, y * 100, z * 100];
    };

    rgb2lab = function (rgb) {
       //https://github.com/MoOx/color-convert/blob/master/conversions.js
        var xyz = rgb2xyz(rgb), x = xyz[0], y = xyz[1], z = xyz[2],
                l, a, b;

        x /= 95.047;
        y /= 100;
        z /= 108.883;

        x = x > 0.008856
            ? Math.pow(x, 1 / 3)
            : (7.787 * x) + (16 / 116);
        y = y > 0.008856
            ? Math.pow(y, 1 / 3)
            : (7.787 * y) + (16 / 116);
        z = z > 0.008856
            ? Math.pow(z, 1 / 3)
            : (7.787 * z) + (16 / 116);

        l = (116 * y) - 16;
        a = 500 * (x - y);
        b = 200 * (y - z);

        return [l, a, b];
    };

    convertToLABcolorSpace = function (rgbArr) {
        var x, y, w = rgbArr.length, h = rgbArr[0].length;
        for (x = 0; x < w; x += 1) {
            for (y = 0; y < h; y += 1) {
                if (rgbArr[x][y].length === 3) {
                    rgbArr[x][y] = rgb2lab(rgbArr[x][y]);
                }
            }
        }
        return rgbArr;
    };

    calculateDistances = function (col1Arr, col2) {
        var x, y, w = col1Arr.length, h = col1Arr[0].length;
        for (x = 0; x < w; x += 1) {
            for (y = 0; y < h; y += 1) {
                if (col1Arr[x][y].length === 3) {
                    col1Arr[x][y] = distLAB(col1Arr[x][y], col2);
                }
            }
        }
        return col1Arr;
    };

    distLAB = function (color1, color2) {
        //Delta E adapted from
            //www.brucelindbloom.com/index.html?ColorDifferenceCalcHelp.html
            //http://www.brucelindbloom.com/index.html?Eqn_DeltaE_CIE2000.html
        var dist, L1 = color1[0], L2 = color2[0],
                a1 = color1[1], a2 = color2[1],
                b1 = color1[2], b2 = color2[2],
                LbarP, c1, c2, Cbar, Cbar7, G, a1p, a2p, C1p, C2p, CbarP,
                h1p, h2p, HbarP, T, dhP, dLp, dCp, dHp, L50, S_L, S_C, S_H,
                dTheta, R_C, R_T;

        LbarP = (L1 + L2) / 2;
        c1 = Math.sqrt(Math.pow(a1, 2) + Math.pow(b1, 2));
        c2 = Math.sqrt(Math.pow(a2, 2) + Math.pow(b2, 2));
        Cbar = (c1 + c2) / 2;
        Cbar7 = Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7)
                + Math.pow(25, 7)));
        G = (1 - Cbar7) / 2;
        a1p = a1 * (1 + G);
        a2p = a2 * (1 + G);
        C1p = Math.sqrt(Math.pow(a1p, 2) + Math.pow(b1, 2));
        C2p = Math.sqrt(Math.pow(a2p, 2) + Math.pow(b2, 2));
        CbarP = (C1p + C2p) / 2;
        h1p = Math.atan2(b1, a1p) < 0
            ? Math.atan2(b1, a1p) + 2 * Math.PI
            : Math.atan2(b1, a1p);

        h2p = Math.atan2(b2, a2p) < 0
            ? Math.atan2(b2, a2p) + 2 * Math.PI
            : Math.atan2(b2, a2p);

        //Below, if C1p or C2p are 0 then HbarP is 0
        HbarP = (!C1p || !C2p)
            ? 0
            : Math.abs(h1p - h2p) > Math.PI
                ? (h1p + h2p) / 2 + Math.PI
                : (h1p + h2p) / 2;

        T = 1 - 0.17 * Math.cos(HbarP - Math.PI / 6) +
                0.24 * Math.cos(2 * HbarP) + 0.32 *
                Math.cos(3 * HbarP + Math.PI / 30) - 0.20
                * Math.cos(HbarP * 4 - 63 * Math.PI / 180);

        //Below, if C1p or C2p are 0 then dhP is 0
        dhP = (!C1p || !C2p)
            ? 0
            : h2p - h1p < -Math.PI / 2
                ? h2p - h1p + 2 * Math.PI
                : h2p - h1p > Math.PI / 2
                    ? h2p - h1p - 2 * Math.PI
                    : h2p - h1p;

        dLp = L2 - L1;
        dCp = C2p - C1p;
        dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhP / 2);
        L50 = Math.pow(LbarP - 50, 2);
        S_L = 1 + (0.015 * L50) / Math.sqrt(20 + L50);
        S_C = 1 + 0.045 * CbarP;
        S_H = 1 + 0.015 * CbarP * T;
        dTheta = 30 * Math.exp(-1 * Math.pow((HbarP * 180 / Math.PI - 275) / 25, 2));
        R_C = 2 * Cbar7;
        R_T = -R_C * Math.sin(2 * dTheta);
        dist = Math.sqrt(Math.pow(dLp / S_L, 2) + Math.pow(dCp / S_C, 2) + Math.pow(dHp / S_H, 2) + R_T * (dCp / S_C) * (dHp / S_H));

        //Below was to normalize green distance to exagerate ones < 16
        //normDist = dist / 16 < 1 ? dist / 16 : 2 - 16 / dist;
        //normDist = Math.round(normDist*1000)/1000;

        return Math.round(dist * roundDigit) / roundDigit;
    };

    //The worker recieving a message
    self.onmessage = function (event) {
        var labArr, rgbArr = event.data.arr, labColor = event.data.col;
        roundDigit = event.data.roundDigit;

        labArr = convertToLABcolorSpace(rgbArr);

        self.postMessage(calculateDistances(labArr, labColor));
    };

    return false;
}());