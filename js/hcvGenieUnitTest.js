/*global amd_ww, hcvGenie, PDFJS console, document, checkPromises, jQuery*/
var glob, testingObject, answers, ganswers, tests = [], hmScore = 0, hmMax = 0,
falses = {falsePos: 0, falseNeg: 0, truePos: 0, totalCalls:0};
(function () {
    'use strict';
    var page, canvases;
    // hcvGenie.findBands({
    //     image: {
    //         type: 'png',
    //         url: './dataExamples/example2.png'
    //     }
    //     // canvas: 'the-canvas'
    // }).then(function (res) {
    //     console.log(res);
    //     glob = res;
    // });
    answers = [];
    canvases = [];
    var pchain = Promise.resolve();
    for (var page = 1; page + 1 < 49; page += 2) {
        (function (page) {
            var scale = Math.round((Math.random() * 3 + 2) * 100) / 100,
                scale2 = Math.round((Math.random() * 3 + 2) * 100) / 100,
                cPromise1, cPromise2, url, pageReq, pg1, pg2;
                scale = 2.25;
                scale2 = 2.25;
            pchain = pchain.then(function (x) {
                if(page < 21) {
                    url = './dataExamples/samples1_1-20.pdf';
                    pageReq = page;
                } else if(page < 34) {
                    url = './dataExamples/samples1_21-33.pdf';
                    pageReq = page - 20;
                } else {
                    url = './dataExamples/samples1_34-48.pdf';
                    pageReq = page - 33;
                }
                pg1 = pageReq;
                
                cPromise1 = hcvGenie.findBands({
                    image: {
                        type: 'pdf',
                        pageNumber: pageReq,
                        url: url,
                        scale: scale
                    }
                }).then(function (res) {
                    var a, main;
                    glob = res;

                    answers[page - 1] = res.bandLocationPromise;

                    main = document.createElement('div');
                    a = document.createElement('div');
                    a.innerText = "Page: " + page + '(' + pg1 + '). Scale:' + scale + ".";
                    main.appendChild(a);
                    main.appendChild(res.canvas);

                    return main;
                });
                if(page + 1 < 21) {
                    url = './dataExamples/samples1_1-20.pdf';
                    pageReq = page + 1;
                } else if(page + 1 < 34) {
                    url = './dataExamples/samples1_21-33.pdf';
                    pageReq = page + 1 - 20;
                } else {
                    url = './dataExamples/samples1_34-48.pdf';
                    pageReq = page + 1 - 33;
                }
                pg2 = pageReq;
                
                cPromise2 = hcvGenie.findBands({
                    image: {
                        type: 'pdf',
                        pageNumber: pageReq,
                        url: url,
                        scale: scale2
                    }
                }).then(function (res) {
                    var a, main;
                    glob = res;

                    answers[page] = res.bandLocationPromise;
                    console.log(res);
                    res.bandLocationPromise.then(function(sol) {
                        console.log('I think I am done?', sol);
                    });

                    main = document.createElement('div');
                    a = document.createElement('div');
                    a.innerText = "Page: " + (page + 1) + '(' + pg2 + '). Scale:' + scale2 + ".";
                    main.appendChild(a);
                    main.appendChild(res.canvas);

                    return main;
                });
                canvases.push(cPromise1);
                canvases.push(cPromise2);
                return Promise.all([cPromise1, cPromise2]).then(function(cavArr){
                    var i;
                    for (i = 0; i < cavArr.length; i += 1) {
                        document.body.appendChild(cavArr[i]);
                    }
                    return Promise.all(answers);
                });
            });
            
        }(page));
    }
    pchain.then(function () {
        Promise.all(canvases).then(function (cavArr) {
            var i;
            for (i = 0; i < cavArr.length; i += 1) {
                document.body.appendChild(cavArr[i]);
            }
            Promise.all(answers).then(function (sols) {
                var j, k, l, testStr, specialScore, count, sols, scoreArr;
                ganswers = sols;
                for (j = 0; j < sols.length; j+= 1) {
                    if(sols[j].lanes.length === testingObject[j].length) {
                        //console.log('correct number of lanes detected in page:' + (j + 1));
                        specialScore = 0;
                        count = 0;
                        for (k = 0; k < sols[j].lanes.length; k += 1) {
                            if (sols[j].lanes[k].bands.length === testingObject[j][k].bands.length) {
                                //console.log('correct number of bands detected in page: ' + (j + 1) + ", lane: " + (k + 1));
                                //Everything is as 'hunky dory' as I can test for at this point, so collect the distances
                                // for (l = 0; l < sols[j].lanes[k].bands.length; l += 1) {
                                //     if (testingObject[j][k].bands[0] < 6) {
                                //         specialScore += sols[j].lanes[k].bands[0].distance / Math.floor(testingObject[j][k].bands[0]);
                                //         count += 1;
                                //     }
                                // }
                            } else {
                                console.warn('wrong number of bands detected in page: ' + (j + 1) + ", lane: " + (k + 1) +
                                    ". Found " + sols[j].lanes[k].bands.length + ", but should be " + testingObject[j][k].bands.length);
                            }
                        }
                        specialScore /= count;
                        for (k = 0; k < sols[j].lanes.length; k += 1) {
                            // for(l=0; l<scoreArr.length - 1; l+=2){
                            //     if (scoreArr[l] === Math.floor(scoreArr[l+1])) {
                            //         hmScore += 1;
                            //     } else if ((hmScore[l] * 2) % 2) { //Because 'weak' bands are denoted 4.5, 5.5 etc
                            //         hmScore -= 0.25;
                            //         l -= 1;
                            //     } else {
                            //         hmScore -= 0.5;
                            //         l -= 1;
                            //     }
                            // }
                            // if (sols[j].lanes[k].bands.length === testingObject[j][k].bands.length) {
                            //     for (l = 0; l < sols[j].lanes[k].bands.length; l += 1) {
                            //         tests.push([
                            //             sols[j].lanes[k].bands[l].distance,
                            //             sols[j].lanes[k].bands[l].distance2,
                            //             sols[j].lanes[k].rect_height,
                            //             sols[j].lanes[k].rect_width,
                            //             sols[j].rect_height,
                            //             sols[j].rect_width,
                            //             testingObject[j][k].bands[l],
                            //             sols[j].lanes[k].bands[l].call,
                            //             sols[j].six_score,
                            //             sols[j].lanes[k].genotype,
                            //             testingObject[j][k].call,
                            //             sols[j].lanes[k].bands.map(function(x){return x.call;}).join(','),
                            //             testingObject[j][k].bands.join(','),
                            //             j,
                            //             k
                            //         ]);
                            //     }
                            // } else {
                            //     for (l = 0; l < sols[j].lanes[k].bands.length; l += 1) {
                            //         tests.push([
                            //             sols[j].lanes[k].bands[l].distance,
                            //             sols[j].lanes[k].bands[l].distance2,
                            //             sols[j].lanes[k].rect_height,
                            //             sols[j].lanes[k].rect_width,
                            //             sols[j].rect_height,
                            //             sols[j].rect_width,
                            //             testingObject[j][k].bands[l],
                            //             sols[j].lanes[k].bands[l].call,
                            //             sols[j].six_score,
                            //             sols[j].lanes[k].genotype,
                            //             testingObject[j][k].call,
                            //             sols[j].lanes[k].bands.map(function(x){return x.call;}).join(','),
                            //             testingObject[j][k].bands.join(','),
                            //             j,
                            //             k
                            //         ]);
                            //     }
                            // }
                            tests.push([
                                testingObject[j][k].bands.join(','),
                                sols[j].rect_height,
                                sols[j].rect_width,
                                sols[j].six_score,
                                sols[j].lanes[k].genotype,
                                testingObject[j][k].call,
                                sols[j].lanes[k].bands.map(function(x){return x.call;}).join(','),
                                testingObject[j][k].bands.map(function(x){return Math.floor(x);}).join(','),
                                j + 1,
                                k + 1
                            ]);
                            //calculate a score
                            var algorithmStr = sols[j].lanes[k].bands.map(function(x){return x.call;}).join(',');
                            var humanStr = testingObject[j][k].bands.map(function(x){return Math.floor(x);}).join(',');
                            hmMax += testingObject[j][k].bands.length;
                            falses.truePos += testingObject[j][k].bands.length;
                            falses.totalCalls += testingObject[j][k].bands.length;
                            if (algorithmStr !== humanStr) {
                                var aArr = algorithmStr.split(',');
                                var hArr = humanStr.split(',');
                                var hInd = 0;
                                console.log('miss', humanStr, algorithmStr, j + 1, k + 1);
                                for (var aInd = 0; aInd < aArr.length; aInd += 1) {
                                    var found = false;
                                    for (hInd = 0; hInd < hArr.length && !found; hInd += 1) {
                                        if (hArr[hInd] === aArr[aInd]) {
                                            found = true;
                                            hArr.splice(hInd,1);
                                            aArr.splice(aInd,1);
                                        }
                                        if (found) {
                                            aInd -= 1;
                                        }
                                    }
                                }
                                console.log('left', hArr, aArr);
                                falses.falsePos += aArr.length;
                                falses.falseNeg += hArr.length;
                                falses.truePos -= (hArr.length + aArr.length);
                                falses.totalCalls += aArr.length;
                            }
                        }
                    } else {
                        console.error('Wrong number of lanes detected in page:' + (j + 1) + 
                            ". Found " + sols[j].lanes.length + ", but should be " + testingObject[j].length);
                    }
                }
                testStr = tests.map(function(x){return x.join('\t');}).join('\n');
                //saveData(testStr, 'distanceMatrix7.txt');
            });
        });
    });
    testingObject = [[{bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,11],call:'2a or 2c'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,59,10,12,23],call:'2b'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,11,23],call:'2a or 2c'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,24],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,9,12,23,26],call:'1b &2b'}, {bands:[1,2,3,4,6,23,24],call:'genotype 6 subtype c-l'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,4,13,14,15,23,24,25],call:'?'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,4,13,14,15,23,24,25],call:'3?'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1b cannot rule out 6(c-l)'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,23],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,6,16,17,18,23],call:'4'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,3,4,6,23],call:'1b cannot rule out 6(c-l)'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23.25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,26],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,26],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,16,23,25],call:'1a and possibly 4e'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1],call:'negative'}, {bands:[1,2,7,13,14,15,23,24],call:'3'}, {bands:[1],call:'negative'}, {bands:[1,2,5,9,16,17,18,23],call:'4'}, {bands:[1],call:'negative'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,11,23],call:'2a or 2c'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,9,21],call:'6a or 6b'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18],call:'4a/4c/4d'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,13,23,24],call:'3'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,7,14,15,23,24],call:'3'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23],call:'1b cannot rule out 6(c-l)'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, ],[{bands:[1,2,7,13,14,15,23,24],call:'3'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,5,9,10,12,23],call:'2b'}, {bands:[1],call:'negative'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,26],call:'3a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a '}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,7,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23],call:'1b'}, {bands:[1],call:'negative'}, {bands:[1,2,3,4,5,23,25],call:'negative'}, ],[{bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,4,5,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,8,23,24,25],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,4,5,9,10,12,23],call:'2b and 1a cannot rule out 6(c-l)'}, {bands:[1,2,3,4,6,7,23,26],call:'1b'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,7,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,3,4,5,16,23,25],call:'1a and possibly 4e'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,7,14,15,23,24],call:'3'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23,25,26],call:'1'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, {bands:[1,2,5,9,11],call:'2a/2c'}, {bands:[1],call:'negative'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, {bands:[1,2,5,9,16,17,18,23],call:'4a/4c/4d'}, {bands:[1],call:'negative'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,8,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18],call:'4a/4c/4d'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23],call:'1b cannot rule out 6(c-l)'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,5,16,17,18,23],call:'4'}, {bands:[1,2,7,13,14,15,23,24],call:'3'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,7,23,25],call:'1a'}, {bands:[1,2,3,4,6,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,16,17,18,23],call:'4a/4c/4d'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23,24],call:'2b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23],call:'1b cannot rule out 6(c-l)'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,24,25],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,7,14,15,23,24],call:'3'}, {bands:[1,2,3,4,5,23,24,25],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,16,17,18],call:'4a/4c/4d'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,623,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,16,23,25],call:'1a and 4'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1],call:'negative'}, {bands:[1],call:'negative'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,7,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,6,8,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,623,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[],call:'N/A repeat'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[],call:'N/A repeat'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1],call:'negative'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,16,23,25],call:'1a & 4'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,23,24],call:'negative'}, {bands:[1,2,13,14,15,23,24],call:'3a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,9,21,23,24],call:'6a or 6b'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,13,14,23,24],call:'3a'}, {bands:[1,2,4,5,9,10,12,23,25],call:'1a/2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1],call:'negative'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23],call:'1a cannot rule our 6 (c-l)'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1],call:'negative'}, ],[{bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,5,9,10,12],call:'2b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,5,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,3,4,6,23,26],call:'1b'}, {bands:[1,2,3,4,6,23,25],call:'1a'}, {bands:[1,2,5,9,10,12,23],call:'2b'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,8,23],call:'1 cannot rule out 6 (c-l)'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1,2,3,4,5,6,23,25],call:'1a'}, {bands:[1],call:'negative'}]];
    //Correct errors that have been identified
    testingObject[1][17].bands.splice(2,1,5,9);
    testingObject[1][8].bands.splice(6,0,23)
    testingObject[3][6].bands[6] = 25;
    testingObject[6][5].bands.splice(4,0,5);
    testingObject[8][7].bands[6]=26;
    testingObject[8][11].bands.splice(5,0,11);
    testingObject[10][8].bands[6] = 26;
    testingObject[11][5].bands.splice(6,1,23,25);
    testingObject[14][4].bands[6] = 25;
    testingObject[14][6].bands[6] = 25;
    testingObject[14][8].bands[6] = 25;
}());

var saveData = (function () {
    'use strict';
    var a = document.createElement("a");
    document.body.appendChild(a);
    //a.style = "display: none";
    return function (data, fileName) {
        //var json = JSON.stringify(data),
        var blob = new Blob([data], {type: "octet/stream"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());