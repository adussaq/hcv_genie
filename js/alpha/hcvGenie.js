var pix = [];
var myCanvas;
var glob;
var glob2;
var glob3;
var makeCanvas = function (elem) {
    var retObj= {}, context = elem.getContext('2d'),
        canvasArr = context.getImageData(0,0,elem.width,elem.height).data,
        greenDist = {};
    retObj.getRBG = function (x,y) {
        pos1 = (x + elem.width*y)*4;
        return [
            canvasArr[pos1],
            canvasArr[pos1 + 1],
            canvasArr[pos1 + 2]
        ];
    };
    retObj.getLAB = function (x,y) {
        return rgb2lab(myCanvas.getRBG(x,y));
    };
    retObj.getGreenDist = function (x,y) {
        //temp, test dist from green
        var ret = 10000, tempLab, dist,
            col1 = [76.28056296, -35.52371953, 23.79405389];
                //baseLab = [70.14204798, -38.19923716, 28.43955885];
                //baseLab = [74.65687694, -38.39793167, 25.95259955];
                //baseLab = [79.2967, -31.7154, 20.3356];
        if(greenDist.hasOwnProperty(x + '_' + y)) {
            return greenDist[x + '_' + y];
        }
        //Delta E from http://www.brucelindbloom.com/index.html?ColorDifferenceCalcHelp.html
        // 0 - L; 1 - a; 2 - b
        col2 = retObj.getLAB(x,y);
        var L1 = col1[0], L2 = col2[0],
            a1 = col1[1], a2 = col2[1],
            b1 = col1[2], b2 = col2[2],
            LbarP = (L1 + L2) / 2,
            c1 = Math.sqrt(Math.pow(a1,2) + Math.pow(b1,2)),
            c2 = Math.sqrt(Math.pow(a2,2) + Math.pow(b2,2)),
            Cbar = (c1 + c2) / 2,
            Cbar7 = Math.sqrt((Math.pow(Cbar,7) / (Math.pow(Cbar,7) + Math.pow(25,7)))),
            G = (1 - Cbar7) / 2,
            a1p = a1 * (1 + G),
            a2p = a2 * (1 + G),
            C1p = Math.sqrt(Math.pow(a1p,2) + Math.pow(b1,2)),
            C2p = Math.sqrt(Math.pow(a2p,2) + Math.pow(b2,2)),
            CbarP = (C1p + C2p) / 2,
            h1p = Math.atan2(b1, a1p) < 0 ? Math.atan2(b1, a1p) + 2 * Math.PI : Math.atan2(b1, a1p),
            h2p = Math.atan2(b2, a2p) < 0 ? Math.atan2(b2, a2p) + 2 * Math.PI : Math.atan2(b2, a2p),
            //Below, if C1p or C2p are 0 then HbarP is 0
            HbarP = !C1p || !C2p ? 0 : Math.abs(h1p - h2p) > Math.PI ? (h1p + h2p) / 2 + Math.PI : (h1p + h2p) / 2,
            T = 1 - 0.17 * Math.cos(HbarP - Math.PI / 6) + 0.24 * Math.cos(2 * HbarP) + 0.32 * Math.cos(3 * HbarP + Math.PI / 30) - 0.20 * Math.cos(HbarP * 4 - 63 * Math.PI / 180),
            //Below, if C1p or C2p are 0 then dhP is 0
            dhP = !C1p || !C2p ? 0 : h2p - h1p < -Math.PI / 2 ? h2p-h1p + 2 * Math.PI : h2p - h1p > Math.PI / 2 ? h2p - h1p - 2 * Math.PI : h2p - h1p,
            dLp = L2-L1,
            dCp = C2p - C1p,
            dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhP / 2),
            L50 = Math.pow(LbarP - 50, 2),
            S_L = 1 + (0.015 * L50)/Math.sqrt(20 + L50),
            S_C = 1 + 0.045 * CbarP,
            S_H = 1 + 0.015 * CbarP * T,
            dTheta = 30 * Math.exp(-1 * Math.pow((HbarP * 180 / Math.PI - 275) / 25, 2)),
            R_C = 2 * Cbar7,
            R_T = -R_C * Math.sin(2 * dTheta);
        dist = Math.sqrt(Math.pow(dLp / S_L, 2) + Math.pow(dCp / S_C, 2) + Math.pow(dHp / S_H, 2) + R_T * (dCp / S_C) * (dHp / S_H));
        //var col = retObj.getRBG(x,y);
        //return col[0]*0.2989 + col[1]*0.5870 + col[2]*0.1140;
        // Distance is between 0 and 1 = 'green', 1 and 2 is other
        var normDist = dist / 16 < 1 ? dist / 16 : 2 - 16 / dist;
        normDist = Math.round(normDist*1000)/1000;
        greenDist[x + '_' + y] = normDist;
        return normDist;
    };
    retObj.getGreenDistGaus = function (x,y) {
        return 1 / 115 * ( retObj.getGreenDist(x,y) * 15 +
                12 * (retObj.getGreenDist(x-1,y)+retObj.getGreenDist(x+1,y)+retObj.getGreenDist(x,y-1)+retObj.getGreenDist(x,y+1)) +
                9 * (retObj.getGreenDist(x-1,y-1)+retObj.getGreenDist(x+1,y-1)+retObj.getGreenDist(x+1,y+1)+retObj.getGreenDist(x-1,y+1)) +
                5 * (retObj.getGreenDist(x,y-2)+retObj.getGreenDist(x,y+2)+retObj.getGreenDist(x+2,y)+retObj.getGreenDist(x-2,y)) +
                4 * (retObj.getGreenDist(x-1,y-2)+retObj.getGreenDist(x+1,y-2)+retObj.getGreenDist(x+1,y+2)+retObj.getGreenDist(x-1,y+2)) +
                4 * (retObj.getGreenDist(x-2,y-1)+retObj.getGreenDist(x+2,y-1)+retObj.getGreenDist(x+2,y+1)+retObj.getGreenDist(x-2,y+1)) +
                2 * (retObj.getGreenDist(x-2,y-2)+retObj.getGreenDist(x+2,y-2)+retObj.getGreenDist(x+2,y+2)+retObj.getGreenDist(x-2,y+2)));
    };
    retObj.getGrey = function (x,y) {
        var col = retObj.getRBG(x,y);
        // return 255* ((1-col[0]/255)*0.2989 + (1-col[1]/255)*0.5870 + (1-col[2]/255)*0.1140);
        return 255* ((1-col[0]/255)*0.21 + (1-col[1]/255)*0.72 + (1-col[2]/255)*0.07);
    }
    retObj.getGreyGaus = function(x,y) {
        return 1 / 115 * ( retObj.getGrey(x,y) * 15 +
                12 * (retObj.getGrey(x-1,y)+retObj.getGrey(x+1,y)+retObj.getGrey(x,y-1)+retObj.getGrey(x,y+1)) +
                9 * (retObj.getGrey(x-1,y-1)+retObj.getGrey(x+1,y-1)+retObj.getGrey(x+1,y+1)+retObj.getGrey(x-1,y+1)) +
                5 * (retObj.getGrey(x,y-2)+retObj.getGrey(x,y+2)+retObj.getGrey(x+2,y)+retObj.getGrey(x-2,y)) +
                4 * (retObj.getGrey(x-1,y-2)+retObj.getGrey(x+1,y-2)+retObj.getGrey(x+1,y+2)+retObj.getGrey(x-1,y+2)) +
                4 * (retObj.getGrey(x-2,y-1)+retObj.getGrey(x+2,y-1)+retObj.getGrey(x+2,y+1)+retObj.getGrey(x-2,y+1)) +
                2 * (retObj.getGrey(x-2,y-2)+retObj.getGrey(x+2,y-2)+retObj.getGrey(x+2,y+2)+retObj.getGrey(x-2,y+2)));
    }
    retObj.height = elem.height;
    retObj.width = elem.width;
    retObj.fillStyle = function (x) {
        context.fillStyle = x;
    };
    retObj.fillRect = function (x,y,w,h) {
        //console.log(x,y);
        context.fillRect(x,y,w,h);
    };
    return retObj;
};

var rgb2xyz = function(rgb) {
    //https://github.com/MoOx/color-convert/blob/master/conversions.js

    var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255;

    // assume sRGB
    r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
    g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
    b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

    var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
    var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

    return [x * 100, y *100, z * 100];
};

var rgb2lab = function(rgb) {
    //https://github.com/MoOx/color-convert/blob/master/conversions.js
  var xyz = rgb2xyz(rgb),
        x = xyz[0],
        y = xyz[1],
        z = xyz[2],
        l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);

  return [l, a, b];
};

var findGreen = function(canvas, minX, maxX, minY, maxY) {
    //var colorNorm = {X:[], Y:[]}; 
    var colorRegion = [[maxX, maxY], [minX, minY]], yn, xn;
    //Really only need to find approximate max/min for these
        // So I skip every 2
    for (yn = minY; yn < maxY; yn += 2 ) {
        for(xn = minX; xn < maxX; xn +=2 ){
            if(canvas.getGreenDist(xn,yn) < 1) {
                colorRegion[0][0] = Math.min(colorRegion[0][0], xn); //x min
                colorRegion[1][0] = Math.max(colorRegion[1][0], xn); //x max
                colorRegion[0][1] = Math.min(colorRegion[0][1], yn); //y min
                colorRegion[1][1] = Math.max(colorRegion[1][1], yn); //y max
            }
        }
    }

    colorRegion[0][0] -= 5;
    colorRegion[0][1] -= 5;
    colorRegion[1][0] += 5;
    colorRegion[1][1] += 5;

    colorRegion[0][0] = Math.max(colorRegion[0][0], minX);
    colorRegion[0][1] = Math.max(colorRegion[0][1], minY);
    colorRegion[1][0] = Math.min(colorRegion[1][0], maxX);
    colorRegion[1][1] = Math.min(colorRegion[1][1], maxY);

    return colorRegion;
};

var findEdges = function (colorFunction, minEdge, minX, maxX, minY, maxY, verbose) {
    var greyArr = [], direcArr = [], trueDirecArr = [], gy, gx, eStren,
        eDirec, c225 = (90 - 22.5) * Math.PI / 180,
        c675 = (90 - 67.5) * Math.PI / 180, j, i,
        greyEdgeArr = [];
    var direcObj = {"0": {}, "45": {}, "90": {}, "135": {}};
    var em = [[0,0,0],[0,0,0],[0,0,0]]
    // if(verbose) {console.log("starting edge detection")}
    //get grey map
    for (j = minY; j < maxY; j += 1) {
        greyArr[j-minY] = [];
        greyEdgeArr[j-minY] = [];
        direcArr[j-minY] = [];
        trueDirecArr[j-minY] = [];
        for (i = minX; i < maxX; i += 1) {
            if(verbose) {console.log("EM array i, j", i, j)}
            //greyArr[j-minY][i-minX] = canvas.getGrey(i,j);
            em[0][0] = colorFunction(i-1,j-1);
            em[1][0] = colorFunction(i-0,j-1);
            em[2][0] = colorFunction(i+1,j-1);
            em[0][1] = colorFunction(i-1,j+0);
            //em[1][1] = canvas.getGrey(i-0,j+0);
            em[2][1] = colorFunction(i+1,j+0);
            em[0][2] = colorFunction(i-1,j+1);
            em[1][2] = colorFunction(i+0,j+1);
            em[2][2] = colorFunction(i+1,j+1);
            // if(verbose) {console.log("EM array", em)}
            gx = em[0][0]*-1 + em[2][0] 
                + -2 * em[0][1] + 2 * em[2][1] 
                + -1 * em[2][0] + em[2][0]; 
            gy =  em[0][0]*-1 - 2 * em[1][0] - em[2][0]
                + em[0][2] + 2 * em[1][2] + em[2][2];
            // if(verbose) {console.log("(gx, gy) -> (", gx, gy, ")")}
            eStren = Math.sqrt(gx * gx + gy * gy);
            eStren = Math.round(eStren * 1000) / 1000;
            eDirec = Math.atan(gy / gx);
            

            if (eDirec < -c225 || eDirec > c225) {
                eDirec = 0;
            }
            else if (eDirec > -c675 && eDirec < c675 ) {
                eDirec = 90;
            }
            else if (eDirec > c675 && eDirec < c225) {
                eDirec = 45;
            }
            else {
                eDirec = 135;
            }
            // direcObj[eDirec][i] = direcObj[eDirec][i] || {};
            // direcObj[eDirec][i][j] = [eStren, eDirec];
            direcArr[j-minY][i-minX] = eDirec;
            greyArr[j-minY][i-minX] = eStren;
            trueDirecArr[j-minY][i-minX] = Math.atan2(gy, gx);;
        }
    }

    //Nonmax Suppression
    var fieldSize = 1, direc, cmpArr, posArr, xp, yp, k, maxGrey;
    for (j = minY; j < maxY; j += 1) {
        for (i = minX; i < maxX; i += 1) {
            //Get direction
            direc = direcArr[j-minY][i-minX];
            cmpArr = [];
            posArr = [];
            switch (direc) {
                case 0 :
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks above and below on y axis
                        xp = i-minX; yp = j-minY+k;
                        if ((xp >= 0 && xp < greyArr[0].length && yp >= 0 && yp < greyArr.length) && (direcArr[yp][xp] === direc)) {
                            cmpArr.push(greyArr[yp][xp]);
                            posArr.push([yp, xp]);
                        }
                    }
                    break;
                case 45 :
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks on the 45* axis
                        xp = i-minX+k; yp = j-minY+k;
                        if ((xp >= 0 && xp < greyArr[0].length && yp >= 0 && yp < greyArr.length) && direcArr[yp][xp] === direc) {
                            cmpArr.push(greyArr[yp][xp]);
                            posArr.push([yp, xp]);
                        }
                    }
                    break;
                case 90 :
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks on the left to right
                        xp = i-minX+k; yp = j-minY;
                        if ((xp >= 0 && xp < greyArr[0].length && yp >= 0 && yp < greyArr.length) && direcArr[yp][xp] === direc) {
                            cmpArr.push(greyArr[yp][xp]);
                            posArr.push([yp, xp]);
                        }
                    }
                    break;
                default :
                    for (k = -fieldSize; k <= fieldSize; k += 1) {
                        //This looks on the 135* axis
                        xp = i-minX-k; yp = j-minY+k;
                        if ((xp >= 0 && xp < greyArr[0].length && yp >= 0 && yp < greyArr.length) && direcArr[yp][xp] === direc) {
                            cmpArr.push(greyArr[yp][xp]);
                            posArr.push([yp, xp]);
                        }
                    }
            } 
            maxGrey = Math.max.apply(null,cmpArr);
            for (k = 0; k < posArr.length; k += 1) {
                xp = posArr[k][1]; yp = posArr[k][0];
                //console.log(posArr,xp,yp);
                if (greyArr[yp][xp] < maxGrey - 0.001) { //Rounding error
                    greyArr[yp][xp] = 0;
                    greyEdgeArr[yp][xp] = 0;
                } else if (greyArr[yp][xp] > minEdge){
                    greyEdgeArr[yp][xp] = [greyArr[yp][xp], direcArr[yp][xp]]
                } else {
                    greyEdgeArr[yp][xp] = 0;
                }
            }
        }
    }

    return greyEdgeArr;
};

var findRectangles = function (colorMat, edgeMat, regionOfInterest) {
    // Note: ColorMat should be designed so < 1 is the color of interest
    // and greater than 1 is not of interest (Distance Proxy)
    // EdgeMat should be 0 if no edge, and a value for edge strength if there is

    //First we find contigous shapes within a 2px circle
    var myShapes = [], y, x, myRects = [], avgH = 0, avgW = 0;
    var shapeMat = grabGreenMatrix(regionOfInterest);
    var area, areas = [], medianArea, sortAreas = [];
    //myShapes=  [findPositiveNeighbors(shapeMat, 10, 30)];

    //Find groups of green pixels
    for(y = 0; y < shapeMat.length; y += 1) {
        for(x = 0; x < shapeMat[y].length; x += 1) {
            if (shapeMat[y][x] < 1) {
                //Note this sets all shapeMat Values to 10 once id'd as a neighbor
                myShapes.push(findPositiveNeighbors(shapeMat, y, x));
                // return myShapes;
            }
        }
    }

    //calculate median region area to exclude really small accidental regions.
    for (x = 0; x < myShapes.length; x += 1) {
        area = (Math.max.apply(null,myShapes[x].xs) - 
            Math.min.apply(null,myShapes[x].xs)) * 
            (Math.max.apply(null,myShapes[x].ys) - 
            Math.min.apply(null,myShapes[x].ys));
        areas.push(area);
        sortAreas.push(area);
    }

    sortAreas = sortAreas.sort(function(a,b) {
        return a < b ? -1 : a > b ? 1 : 0;
    });

    medianArea = 0.5 * (sortAreas[Math.floor(sortAreas.length/2)] 
            + sortAreas[Math.ceil(sortAreas.length/2)]);

    console.log('areas', medianArea, areas, sortAreas);

    //Utilize a hough transform to determine rectangle coordinates
    for (x = 0; x < myShapes.length; x += 1) {
        if (areas[x] > medianArea * 0.25) {
            myRects.push(minimizeRectangle(myShapes[x], edgeMat, regionOfInterest));
        }
        //return;
    }

    //Find average width and height
    for (x = 0; x < myRects.length; x += 1) {
        avgW += myRects[x][2];
        avgH += myRects[x][3];
    }
    avgW /= myRects.length;
    avgH /= myRects.length;
    glob = JSON.parse(JSON.stringify(myRects));
    //Draw green rectangles
    for (x = 0; x < myRects.length; x += 1) {    
        myRects[x][2] = avgW;
        myRects[x][3] = avgH;
        myRects[x][0] += regionOfInterest[0][0];
        myRects[x][1] += regionOfInterest[0][1];
        drawRectangle(myRects[x], "#52BE80");
    }
    glob2 = JSON.parse(JSON.stringify(myRects));

    console.log(myRects, regionOfInterest, shapeMat, myShapes);

    return myRects;
};
var minimizeRectangle = function (rect, edges, regionOfInterest) {
    var rectP, maxX, minX, maxY, minY, rect;
    maxX = Math.max.apply(null,rect.xs);
    minX = Math.min.apply(null,rect.xs);
    maxY = Math.max.apply(null,rect.ys);
    minY = Math.min.apply(null,rect.ys);
    //starting point:
    // rectS = [
    //     (maxX - minX) / 2 + minX, //center x
    //     (maxY - minY) / 2 + minY, //center y
    //     (maxX - minX) / 2,        //width / 2
    //     (maxY - minY) / 2,        //height / 2
    //     0                         // angle
    // ];
    rectP = [
        minX-2,
        minY-2,
        maxX+2,
        maxY+2,
        (maxX - minX) / 2 + minX,
        (maxY - minY) / 2 + minY
    ]
    // console.log("rectScore", houghTrans(rect, edges, rectP));
    rect = houghTrans(rect, edges, rectP, false, regionOfInterest[0][0], regionOfInterest[0][1]);
    return rect;
    //drawRectangle(rectS);
};
var findPositiveNeighbors = function (shapeMat, yi, xi) {
    var wind, mwind=2, i, xp, yp, res = {ys:[yi], xs:[xi]},
        edges, found, xm, yB ={}, xB = {},
        yStart, xStart, yFin, xFin,
        x_min_bound, y_min_bound,
        x_max_bound, y_max_bound;
    shapeMat[yi][xi] = 10;
    yB[yi]=[xi,xi];
    xB[xi]=[yi,yi];
   // console.log(JSON.stringify(yB));
    //for (i = 0; i < res.ys.length; i += 1) {
    for (i = 0; i < res.ys.length; i += 1) {
        //Get x,y point
        y = res.ys[i];
        x = res.xs[i];
        //console.log('test point',x,y, JSON.parse(JSON.stringify(xB)), JSON.parse(JSON.stringify(yB)));
        x_min_bound = yB[y][0] === x ? 1 : 0;
        y_min_bound = xB[x][0] === y ? 1 : 0;
        x_max_bound = yB[y][1] === x ? 1 : 0;
        y_max_bound = xB[x][1] === y ? 1 : 0;

        wind = mwind;
        while(wind > 0 && (x_min_bound + y_min_bound + x_max_bound + y_max_bound )) {
            //Based on the point's edge status determine the 
            // start/finish points for the search window
            xStart = x - wind * x_min_bound;
            xFin = x + wind * x_max_bound;
            yStart = y - wind * y_min_bound;
            yFin = y + wind * y_max_bound;

            // console.log(y,x, 'is a boundry:', yStart, yFin, xStart, xFin);

            for(yp = yStart; yp < yFin + 1; yp += 1) {
                //So we only search the outer box ring
                if(yp === y - wind || yp === y + wind) {
                    xm = 1;
                } else {
                    //TODO: test if this actually helps with efficiency 
                    if (xStart === x || xFin === x) {
                        xm = wind;
                    } else {
                        xm = wind * 2;
                    }
                }
                for(xp = xStart; xp < xFin + 1; xp += xm) {
                    if (yp>0 && xp>0 && yp < shapeMat.length && xp < shapeMat[yp].length) {
                        if (shapeMat[yp][xp] < 1) {
                            // console.log('green', yp, xp);
                            res.ys.push(yp);
                            res.xs.push(xp);
                            shapeMat[yp][xp] = 10;
                            xB[xp] = xB[xp] || [yp, yp];
                            yB[yp] = yB[yp] || [xp, xp];
                            xB[xp][0] = yp < xB[xp][0] ? yp : xB[xp][0];
                            xB[xp][1] = yp > xB[xp][1] ? yp : xB[xp][1];
                            yB[yp][0] = xp < yB[yp][0] ? xp : yB[yp][0];
                            yB[yp][1] = xp > yB[yp][1] ? xp : yB[yp][1];
                        } else {
                            // console.log('not green', yp, xp, xm);
                        }
                    }
                }
            }
            wind -= 1;
        }
    }
    // console.log(JSON.parse(JSON.stringify(yB)));
    // console.log(JSON.parse(JSON.stringify(xB)));
    return res;
};
var houghTrans = function (rect, edges, params, testing, shiftX, shiftY) {
    var x, y, x0, y0, d0, theta0, lines, ind, theta, mtheta, mdist,
        maxDist, peaks, peakParams, thetaMid, findRhoBin, findXBin,
        addCount, maxes, thetaBin, calculatedRho, calculatedTheta, ninetyStart;
    x0 = params[4];
    y0 = params[5];
    peakParams = {
        rho: [],
        theta: []
    };
    peaks = {vert: {distPos: [0,0,0], distNeg: [0,0,0]},
        horz: {distPos: [0,0,0], distNeg: [0,0,0]}
    };
    maxes = {};
    shiftX = shiftX || 0;
    shiftY = shiftY || 0;
    maxDist = Math.sqrt(Math.pow(params[3] 
            - params[1],2) + Math.pow(params[2] - params[0],2))/2;
    bins = Math.ceil(8 * maxDist / 3);
    radBins = Math.ceil(10 * Math.PI * maxDist / 4);

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
    }

    // console.log(peaks);
    // //perform a hough transform
    //For each edge point (non-zero) draw lines
    // and calculate the distance from the center to that line.
    var lines = [];
    for(y = params[1]; y <= params[3]; y += 1) {
        for(x = params[0]; x <= params[2]; x += 1) {
            if(edges[y] && edges[y][x]) {
                //If we find an edge vary the angle and 
                //compute hough transform curve of angle
                //by mid distance
                // console.log(edges[y][x]);
                // d0 = Math.sqrt(Math.pow(x-x0,2)+Math.pow(y-y0,2));
                // theta0 = Math.atan2(y-y0,x-x0);
                lines.push([]);
                ind = lines.length - 1;
                // thetaBin = 0;
                // thetaMid = edges[y][x][1] > 90 ? edges[y][x][1] - 180 : edges[y][x][1];
                // thetaMid *= Math.PI / 180;
                // for(theta = thetaMid - Math.PI/8; theta < thetaMid + Math.PI/8; theta += Math.PI / 24 ) {
                if( edges[y][x][1] === 0 || edges[y][x][1] === 45 || edges[y][x][1] === 135 ) {
                // if( edges[y][x][1] === 0 ) { // Since these lines are stronger and longer we will use only the 0*
                    //Look at the 90* region
                    //Note to start and stop at the right place we calculate a strange starting location
                        // Start around 5 PI / 6, caclulate the bin # ->
                        //      BIN = floor((5 PI / 12 + PI / 12) / (5 PI / 6) * bins) = floor(3 / 5 * bins) 
                        //      BIN * (5 PI / 6) / bins - PI / 12 =  PI /6 (5 * BIN / bins -1/2)
                    //ninetyStart = Math.PI / 6 * (5 * Math.floor(3/5 * bins) / bins - 0.5);
                    for(theta = 5 * Math.PI / 12; theta < 7 * Math.PI / 12; theta += (5 * Math.PI/6) / radBins ) {
                        mdist = (x-x0) * Math.cos(theta) + (y-y0) * Math.sin(theta);
                        lines[ind].push([theta, mdist]);
                        addCount(theta, mdist, edges[y][x][0], 'horz');
                    }
                }
                if (edges[y][x][1] === 90 || edges[y][x][1] === 45 || edges[y][x][1] === 135) {
                    //Look at the 0* region
                    for(theta = -Math.PI / 12; theta < Math.PI / 12; theta += (5 * Math.PI/6) / radBins ) {
                        mdist = (x-x0) * Math.cos(theta) + (y-y0) * Math.sin(theta);
                        lines[ind].push([theta, mdist]);
                        addCount(theta, mdist, edges[y][x][0], 'vert');
                    }
                }
            }
        }
    }
    glob2 = peaks;
    // peaks.vert.distPos[0] /= peaks.vert.distPos[2]; // theta
    // peaks.vert.distPos[1] /= peaks.vert.distPos[2]; // rho
    
    // peaks.vert.distNeg[0] /= peaks.vert.distNeg[2]; // theta
    // peaks.vert.distNeg[1] /= peaks.vert.distNeg[2]; // rho
    
    // peaks.horz.distPos[0] /= peaks.horz.distPos[2]; // theta
    // peaks.horz.distPos[1] /= peaks.horz.distPos[2]; // rho

    // peaks.horz.distNeg[0] /= peaks.horz.distNeg[2]; // theta
    // peaks.horz.distNeg[1] /= peaks.horz.distNeg[2]; // rho

    //To ensure nothing is /0 or weighted way too high...
        // This says assume our original guess was correct
        // If there is no evidence to suggest otherwise
    // if (!peaks.horz.distPos[2] || ! peaks.horz.distNeg[2]) {
    //     peaks.horz.distPos[2] = Math.max(peaks.horz.distNeg[2], peaks.horz.distPos[2]);
    //     peaks.horz.distPos[1] = Math.max(peaks.horz.distNeg[1], peaks.horz.distPos[1]);
    //     peaks.horz.distPos[0] = Math.max(peaks.horz.distNeg[0], peaks.horz.distPos[0]);
    //     peaks.horz.distNeg[0] = peaks.horz.distPos[0];
    //     peaks.horz.distNeg[1] = peaks.horz.distPos[1];
    //     peaks.horz.distNeg[2] = peaks.horz.distPos[2];
    // }
    // peaks.horz.distPos[2] = peaks.horz.distPos[2] || 1;
    // peaks.horz.distNeg[2] = peaks.horz.distNeg[2] || 1;
    // peaks.vert.distPos[2] = peaks.vert.distPos[2] || 1;
    // peaks.vert.distNeg[2] = peaks.vert.distNeg[2] || 1;

    var finalTheta = 
        (peaks.vert.distPos[0] + peaks.vert.distNeg[0] - 
        Math.PI / 2 * (peaks.horz.distPos[2] + peaks.horz.distNeg[2]) +
        peaks.horz.distPos[0] + peaks.horz.distNeg[0]) /
        (peaks.vert.distPos[2] + peaks.vert.distNeg[2] +
        peaks.horz.distPos[2] + peaks.horz.distNeg[2]);

    var finalYi = 
        y0 + peaks.horz.distPos[1] / peaks.horz.distPos[2] +
        peaks.horz.distNeg[1] / peaks.horz.distNeg[2];

    var finalXi = 
        x0 + peaks.vert.distPos[1] / peaks.vert.distPos[2] +
        peaks.vert.distNeg[1] / peaks.vert.distNeg[2];

    var finalH = 
        peaks.horz.distPos[1] / peaks.horz.distPos[2] -
        peaks.horz.distNeg[1] / peaks.horz.distNeg[2];

    var finalL = 
        peaks.vert.distPos[1] / peaks.vert.distPos[2] -
        peaks.vert.distNeg[1] / peaks.vert.distNeg[2];

    //Below is just so I can understand the angles determined when console.logged
    peaks.vert.distPos[0] /= peaks.vert.distPos[2] / 180 * Math.PI; // theta
    peaks.vert.distPos[1] /= peaks.vert.distPos[2]; // rho
    
    peaks.vert.distNeg[0] /= peaks.vert.distNeg[2] / 180 * Math.PI; // theta
    peaks.vert.distNeg[1] /= peaks.vert.distNeg[2]; // rho
    
    peaks.horz.distPos[0] /= peaks.horz.distPos[2] / 180 * Math.PI; // theta
    peaks.horz.distPos[1] /= peaks.horz.distPos[2]; // rho

    peaks.horz.distNeg[0] /= peaks.horz.distNeg[2] / 180 * Math.PI; // theta
    peaks.horz.distNeg[1] /= peaks.horz.distNeg[2]; // rho
    if(testing) {console.log(
        // 'lines', 
            // lines.map(function(x,i){return x.map(function(y) {return i + "\t" + y.map(function(z){return Math.round(z*1000)/1000;}).join('\t')}).join('\n')}).join('\n'),
        '\nparameters',
            params,
        '\ndenDiffX',
            Math.abs(peaks.vert.distPos[2] - peaks.vert.distNeg[2]),
        '\ndenDiffY',
            Math.abs(peaks.horz.distPos[2] - peaks.horz.distNeg[2])
    );};

    // // var maxKeys = Object.keys(maxes);
    //  maxKeys = maxKeys.sort(function(a,b) {
    //     if (maxes[a][0] < maxes[b][0]) {
    //         return 1;
    //     } else if (maxes[a][0] > maxes[b][0]) {
    //         return -1;
    //     }
    //     return 0;
    // })
    // for(x = 0; x < maxKeys.length; x += 1) {
    //     console.log(maxKeys[x], maxes[maxKeys[x]]);
    // }
    // console.log(maxes, peaks)
    // console.log(finalTheta * 180 / Math.PI, finalXi, finalYi, finalL, finalH);

    //Draw rectange for region investigated
    drawRectangle([x0 + shiftX,y0+shiftY,params[2] 
            - params[0], params[3] 
            - params[1], 0], "#FF3300"); //pale yellow: FFFFCC

    return [finalXi, finalYi, finalL, finalH, finalTheta];
};
var grabGreenMatrix = function (regionOfInterest) {
    var ret = [], xp, yp;
    for(yp = regionOfInterest[0][1]; yp < regionOfInterest[1][1]; yp += 1) {
        ret.push([]);
        for(xp = regionOfInterest[0][0]; xp < regionOfInterest[1][0]; xp += 1) {
            ret[ret.length - 1].push(myCanvas.getGreenDist(xp,yp));
        }
    }
    return ret;
};
var drawRectangle = function (rectParams, color) {
    var phi, thetaA, r, inc = 0, cosPhi, sinPhi, tempPhi, aShift,
        x0 = rectParams[0], y0 = rectParams[1], w = rectParams[2],
        h = rectParams[3], theta0 = rectParams[4];
    thetaA = Math.atan2(h, w);
    //theta0 = 0;
    thetaS = thetaA + theta0;
    // console.log('thetas for drawing', theta0, thetaA, thetaS);
    //It is easier to draw this as a parametric equation
    myCanvas.fillStyle(color);
    for(phi = 0; phi < 2* Math.PI; phi += inc) {
    // for(phi = 0; phi < 2 * Math.PI; phi += Math.PI/(w+h)/4) {
        cosPhi = Math.cos(phi);
        sinPhi = Math.sin(phi);
        //Calculate R, this is a simple parametric equation
        if ((phi > thetaS && phi <= Math.PI - thetaS) || 
            (phi > Math.PI + thetaS && phi <= 2* Math.PI - thetaS)) {
            r = Math.abs(h / (2 * sinPhi));
            // inc = (Math.PI - 2 * thetaA) / w / 2;
            tempPhi = phi < Math.PI ? phi : phi - Math.PI;
            aShift = phi < Math.PI ? 0 : Math.PI;
            inc = Math.abs(Math.acos(Math.cos(tempPhi + .3/r)) + aShift - phi);
            //inc = Math.abs(Math.acos(cosPhi - 0.1/r) - phi);
            // console.log('here top/bottom next inc', inc, Math.round(r * Math.cos(phi)+ x0), Math.round(r*Math.sin(phi)+ y0));
        } else {
            r = Math.abs(w / (2 * cosPhi));
            if (phi < Math.PI / 2) {
                tempPhi = phi;
                aShift = 0;
            } else if( phi < Math.PI) {
                tempPhi = phi - Math.PI / 2;
                aShift = Math.PI / 2;
            } else if ( phi < 1.5 * Math.PI ) {
                tempPhi = phi - Math.PI;
                aShift = Math.PI;
            } else {
                tempPhi = phi - 1.5 * Math.PI;
                aShift = 1.5 * Math.PI;      
            }
            inc = Math.abs(Math.asin(Math.sin(tempPhi + .3/r)) + aShift - phi);
            // console.log('here left/right next inc', inc, Math.round(r * Math.cos(phi)+ x0), Math.round(r*Math.sin(phi)+ y0));
        }
        // console.log(Math.round(r * Math.cos(phi)+ x0), Math.round(r*Math.sin(phi)+ y0));
        // console.log(r, phi);
        //Using x = r cos phi and y = r sin(phi) plot a point
        myCanvas.fillRect(Math.floor(r * Math.cos(phi)+ x0 + 0.1), Math.floor(r*Math.sin(phi)+ y0 + 0.1), 1, 1);
    }
    //plot center as cross
    myCanvas.fillRect(Math.round(x0),Math.round(y0)-1,1,3);
    myCanvas.fillRect(Math.round(x0)-1,Math.round(y0),3,1);
};

var findBandLocations = function (rectangles) {
    //Cycle through each main band location
    var i, j, edges, height, theta, x0, y0, width, center, rectagleCount, divisor,
        rightEdge, topEdge, leftEdge, bottomEdge = 0, testX, testY, xBuffer,
        testing = false, distances = [], distanceMeasure, roundedHypot, bandNumber;
    for (i = 0; i < rectangles.length; i += 1) {
    // for (i = 10; i < 11; i += 1) {
        console.log('Testing lane ' + (i + 1) + ".");
        rectagleCount = 1;
        distances[i] = [];

        //Remeber rectange is stored as:
        //  [x0, y0, width, height, theta]
        theta = rectangles[i][4];
        x0 = rectangles[i][0];
        y0 = rectangles[i][1];
        width = rectangles[i][2];
        height = rectangles[i][3];
        roundedHypot = Math.ceil(0.63 * 27 * width * 100) / 100;

        topEdge = Math.floor(height + y0); //To be sure that the height clears
        bottomEdge = Math.ceil(roundedHypot * Math.cos(Math.min(Math.abs(theta), Math.abs(Math.abs(theta) - Math.PI/180))) + y0 + 2);

        xBuffer = Math.sin(Math.PI/180 + Math.abs(theta)) * roundedHypot;
        rightEdge = Math.ceil(x0 + width / 2 + xBuffer) + 2;
        leftEdge = Math.ceil(x0 - width / 2 - xBuffer) - 2;
        
        rightEdge = Math.min(rightEdge, myCanvas.width);
        leftEdge = Math.max(leftEdge, 0);
        edges = findEdges(myCanvas.getGreyGaus, 5, leftEdge, rightEdge, topEdge, bottomEdge, false);
        console.log(width, height, leftEdge, rightEdge, topEdge, bottomEdge);
        for(j = 1; j < edges.length; j += 1) {
            testX = Math.round((j+topEdge-y0) * Math.tan(theta) + (x0-leftEdge));
            testY = j;

            //Show the path traced
            myCanvas.fillStyle('#BE5A52');
            myCanvas.fillRect(Math.round(testX+leftEdge), Math.round(testY+topEdge), 1, 1);

            //Test for edge
            if( edges[testY][testX] && edges[testY][testX][1] === 0 && edges[testY][testX][0] > 25) {
                //hough Transform params: minX, minY, maxX, maxY, centerX, centerY;
                //redefine testX, testY as the new center
                testY = j + .5 * height;
                testX = testY  * Math.tan(theta) + (x0-leftEdge);
                rect = houghTrans([], edges, [
                        Math.max(Math.floor(testX - width * .7),0), 
                        Math.max(Math.floor(j-(.25*height)),0), 
                        Math.min(Math.ceil(testX + width * .7), rightEdge - leftEdge),
                        Math.min(Math.ceil(j+(1.5*height)), edges.length), 
                        testX, testY]
                    , false, leftEdge, topEdge);
                // console.log('band?', rect);
                rect[0] += leftEdge; //  [x0, y0, width, height, theta]
                rect[1] += topEdge;

                //While weighting the previous height/width much higher calculate a new ref
                    // height/width. The higher weight for a previous rectangle is due to
                    // trusting the green rectangle detection substantially more than the grey
                rect[2] = (width * (4+rectagleCount+rectangles.length) + rect[2]) / (5 + rectagleCount+rectangles.length);
                rect[3] = (height * (4+rectagleCount+rectangles.length) + rect[3]) / (5 + rectagleCount+rectangles.length);

                //Recalculate theta
                var centerTheta = Math.atan2(rect[0]-x0, rect[1]-y0);
                rect[4] = rectagleCount * theta / (rectagleCount + 1) + (4 * rect[4] + centerTheta)/(rectagleCount+1) / 5;
                //While centerTheta is not that useful for actual theta calc due to a lack of granularity,
                    // If the signs are different it can be used to decrease the theta of the actual line
                if(theta * centerTheta < 0) {
                    rect[4] /= 2;
                }

                //Calculate median greyness to determine if a rectange is actually present
                if(isGrey(rect, testing)) {
                    //adjust the old theta, width and height
                    width = rect[2];
                    height = rect[3];
                    theta = rect[4];                   

                    //Adjust the center reference, this keeps shifts in location by 1-2 pixels
                    // from making a large effect on the downstream centering
                    x0 = (rectagleCount * rect[0] + x0) / (rectagleCount + 1);

                    //Draw the rectange so it is visible
                    drawRectangle(rect, "#4DCBCA");

                    //Save distance between start point and this rectangle
                    //Note we use the original rectangle center here
                    distanceMeasure = Math.sqrt(0.95 * Math.pow(rectangles[i][0] - rect[0], 2) + 1.05 * Math.pow(y0 - rect[1], 2));
                    distances[i].push(distanceMeasure);
                    
                    //Move down on j enough to not have the same rectangle found twice
                    j += Math.ceil(height * 1.5); 

                    //Increment the rectangle count for avg calcs
                    rectagleCount += 1;
                }
            }

        }
        divisor =  0.634;

        for(j = 0; j < distances[i].length; j+= 1) {
            bandNumber = Math.round(distances[i][j] / width / divisor * 10) / 10;
            if (bandNumber > 26.5) {
                distances[i].splice(j,1);
                j -= 1;
            } else {
                // divisor = (divisor * (j + 5) + distances[i][j] / bandNumber / width )  / (j + 6);
                // if(bandNumber > 20 && bandNumber < 24) {
                    // distances[i][j] = [width, height, distances[i][j]].join(',') + '\t';  
                // } else {
                    distances[i][j] = bandNumber;
                // }
                //distances[i][j] = [width, height, distances[i][j]].join(',') + '\t';
            }
        }

        // console.log(edges, edges.map(function(x){return x.map(function(y){return y[0] || 0}).join('\t')}).join('\n'));
    }

    console.log(distances);
    glob3 = distances;
    return distances;
};

var isGrey = function (rectParams, testing) {
    var phi, thetaA, r, inc = 0, cosPhi, sinPhi, tempPhi, aShift,
        x0 = rectParams[0], y0 = rectParams[1], w = rectParams[2],
        h = rectParams[3], theta0 = rectParams[4], x, y, xs, ys,
        xf, yf, medianGrey, count, greys = [];
    thetaA = Math.atan2(h, w);
    //theta0 = 0;
    thetaS = thetaA + theta0;
    r = Math.sqrt(w * w + h * h)/2;

    //Top left
    xs = Math.ceil(r * Math.cos(Math.PI+thetaS) + x0);
    ys = Math.ceil(r * Math.sin(Math.PI+thetaS) + y0);

    //Bottom right
    xf = Math.floor(r * Math.cos(thetaS) + x0);
    yf = Math.floor(r * Math.sin(thetaS) + y0);

    if(testing) {
        myCanvas.fillStyle("#FFCCFF");
        myCanvas.fillRect(xs,ys-1,1,3);
        myCanvas.fillRect(xs-1,ys,3,1);
        myCanvas.fillStyle("#CCFFCC");
        myCanvas.fillRect(xf,yf-1,1,3);
        myCanvas.fillRect(xf-1,yf,3,1);
    }
    medianGrey = 0;
    for(x = xs; x <= xf; x += 1) {
        for(y = ys; y <= yf; y += 1) {
            greys.push(myCanvas.getGrey(x,y));
        }
    }
    greys = greys.sort(function(a,b) {
        return a < b ? -1 : a > b ? 1 : 0;
    });
    
    medianGrey = greys[Math.floor(greys.length/2)]/2 + greys[Math.ceil(greys.length/2)]/2;
    
    if(testing) {
        console.log('median grey', medianGrey);
    }

    return medianGrey < 5 ? false : true;
};

//Main function ****
var processCanvas = function (canvas) {
    myCanvas = makeCanvas(canvas);
    var minY = 0, minX = 0, maxY = myCanvas.height, maxX = myCanvas.width;
    // var minY = 0, minX = 0, maxY = 60, maxX = 680;
    console.log('Finding Green');
    myGreen = findGreen(myCanvas, minX, maxX, minY, maxY);
    console.log('Finding Green Edges');
    myGreenEdges = findEdges(myCanvas.getGreenDistGaus, 1.5, myGreen[0][0], myGreen[1][0], myGreen[0][1], myGreen[1][1]);
    console.log('Finding Green Rectangles');
    rects = findRectangles(myGreen, myGreenEdges, myGreen);
    rects = rects.sort(function(a,b) {
        return a[0] < b[0] ? -1 : b[0] < a[0] ? 1 : 0;
    });
    console.log('finding experiments');
    var distances = findBandLocations(rects);
    return distances;
};

var convertPDF2Canvas = function (startObj) {
    return function(pdf) {
        return pdf.getPage(startObj.image.pageNumber).then(function (page) {
            var scale = 2, viewport, canvas, context, renderContext;

            //Get page image object
            viewport = page.getViewport(scale);

            // Prepare canvas using PDF page dimensions
            canvas = document.getElementById(startObj.canvas);
            context = canvas.getContext('2d');
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

var hcvGenie = {};
hcvGenie.findBands = function (startObj) {
    var canvas, context, img;

    //Things we need on startObj:
        // File type
            // If pdf, page number
        // File URL if applicable
        // File Blob if applicable
        // Canvas object id
        
    canvas = document.getElementById(startObj.canvas);
    context = canvas.getContext('2d');

    if(startObj.image.type !== 'pdf') {
        var promise = new Promise(function(resolve, reject) {
            img = new Image();
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0, img.width, img.height)
                resolve(processCanvas(canvas));
            };
            img.src = startObj.image.url;
        });
    } else {
        return PDFJS.getDocument(startObj.image.url).then(convertPDF2Canvas(startObj)).then(processCanvas);
    }
};











