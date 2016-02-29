/*global amd_ww, hcvGenie, PDFJS console, document, checkPromises, jQuery*/
var glob, testingObject, answers, ganswers, tests = [], hmScore = 0, hmMax = 0;
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
    for (var page = 1; page + 1 < 11; page += 2) {
        (function (page) {
            var scale = Math.round((Math.random() * 3 + 2) * 100) / 100,
                scale2 = Math.round((Math.random() * 3 + 2) * 100) / 100,
                cPromise1, cPromise2;
                scale = 2.25;
                scale2 = 2.25;
            pchain = pchain.then(function (x) {
                cPromise1 = hcvGenie.findBands({
                    image: {
                        type: 'pdf',
                        pageNumber: page,
                        url: './dataExamples/samples1-20.pdf',
                        scale: scale
                    }
                }).then(function (res) {
                    var a, main;
                    glob = res;

                    answers[page - 1] = res.bandLocationPromise;

                    main = document.createElement('div');
                    a = document.createElement('div');
                    a.innerText = "Page: " + page + '. Scale:' + scale + ".";
                    main.appendChild(a);
                    main.appendChild(res.canvas);

                    return main;
                });
                cPromise2 = hcvGenie.findBands({
                    image: {
                        type: 'pdf',
                        pageNumber: page + 1,
                        url: './dataExamples/samples1-20.pdf',
                        scale: scale2
                    }
                }).then(function (res) {
                    var a, main;
                    glob = res;

                    answers[page] = res.bandLocationPromise;

                    main = document.createElement('div');
                    a = document.createElement('div');
                    a.innerText = "Page: " + (page + 1) + '. Scale:' + scale2 + ".";
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
                        console.log('correct number of lanes detected in page:' + (j + 1));
                        specialScore = 0;
                        count = 0;
                        for (k = 0; k < sols[j].lanes.length; k += 1) {
                            if (sols[j].lanes[k].bands.length === testingObject[j][k].bands.length) {
                                console.log('correct number of bands detected in page: ' + (j + 1) + ", lane: " + (k + 1));
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
                            hmMax += testingObject[j][k].bands.length;
                            scoreArr = testingObject[j][k].bands.concat(sols[j].lanes[k].bands.map(function(x){return x.call;}));
                            scoreArr = scoreArr.sort(function(a, b){return a<b?-1:b<a?1:0});
                            for(l=0; l<scoreArr.length - 1; l+=2){
                                if (scoreArr[l] === Math.floor(scoreArr[l+1])) {
                                    hmScore += 1;
                                } else if ((hmScore[l] * 2) % 2) { //Because 'weak' bands are denoted 4.5, 5.5 etc
                                    hmScore -= 0.25;
                                    l -= 1;
                                } else {
                                    hmScore -= 0.5;
                                    l -= 1;
                                }
                            }
                            if (sols[j].lanes[k].bands.length === testingObject[j][k].bands.length) {
                                for (l = 0; l < sols[j].lanes[k].bands.length; l += 1) {
                                    tests.push([
                                        sols[j].lanes[k].bands[l].distance,
                                        sols[j].lanes[k].bands[l].distance2,
                                        sols[j].lanes[k].rect_height,
                                        sols[j].lanes[k].rect_width,
                                        sols[j].rect_height,
                                        sols[j].rect_width,
                                        testingObject[j][k].bands[l],
                                        sols[j].lanes[k].bands[l].call,
                                        sols[j].six_score,
                                        sols[j].lanes[k].genotype,
                                        testingObject[j][k].call,
                                        j,
                                        k
                                    ]);
                                }
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
    testingObject = [[{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,6,23,25],"call":"1a"},{"bands":[1,2,5,9,10,11],"call":"2a or 2c"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5.5,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,13,14,15.5,23,24],"call":"3a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,5,9,10.5,11.5,23],"call":"2a or 2c"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,9,10,12],"call":"2b"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,6,9,12,23,26],"call":"1b &2b"},{"bands":[1,2,3,4,6,23,24],"call":"genotype 6 subtype c-l"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,5,16,18,23],"call":"4a/4c/4d"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5.5,6,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"?"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,13,14,15,23,24],"call":"3?"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23],"call":"1b cannot rule out 6(c-l)"},{"bands":[1,2,3,4,5,23],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,6,23,26],"call":"1b"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23],"call":"1a cannot rule our 6 (c-l)"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,6,16.5,17.5,18.5,23],"call":"4"},{"bands":[1,2,3,4,5,8.5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5,9,10,11,12,23],"call":"2"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,5,16,17.5,18,23],"call":"4a/4c/4d"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,5,16.5,17.5,18.5,23],"call":"4a/4c/4d"},{"bands":[1,2,3,4,6,23],"call":"1b cannot rule out 6(c-l)"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[null,1.5,2.5,3.5,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,8.5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3.5,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3.5,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,6,23.25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,5.5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,16,23,25],"call":"1a and possibly 4e"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1],"call":"negative"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1],"call":"negative"},{"bands":[1,2,7,13,14,15,23,24],"call":"3"},{"bands":[1],"call":"negative"},{"bands":[1,2,5,9,16,17,18,23],"call":"4"},{"bands":[1],"call":"negative"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5,9,11,23],"call":"2a or 2c"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,8,23,25],"call":"1a"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,8,23,25],"call":"1a"},{"bands":[1,2,14,15,23,24],"call":"3a"},{"bands":[],"call":"negative"}],[{"bands":[1,2,3,4,8,23.5,25.5],"call":"1a"},{"bands":[1,2,3,4,5,23],"call":"1a cannot rule our 6 (c-l)"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,5,9,10,12],"call":"2b"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6.5,8.5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,13,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,15.5,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23],"call":"1a cannot rule our 6 (c-l)"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3.5,4,5.5,9,21],"call":"6a or 6b"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,5,16,17,18],"call":"4a/4c/4d"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25.5],"call":"1a"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,13,23,24],"call":"3"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6,23,25],"call":"1a"},{"bands":[1,2,5,9,10,12,23],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,5,9,10,12],"call":"2b"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1],"call":"negative"}],[{"bands":[1,2,7,14,15,23,24],"call":"3"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5.5,6,23,26],"call":"1b"},{"bands":[1,2,3,4,5.5,6,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,14,15,23,24],"call":"3a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,23,25],"call":"1a"},{"bands":[1,2,3,4,5,6.5,23,25],"call":"1a"},{"bands":[1,2,3,4,6,23,26],"call":"1b"},{"bands":[1,2,3,4,6,23],"call":"1b cannot rule out 6(c-l)"},{"bands":[1,2,3,4,6,23,25],"call":"1a"},{"bands":[1],"call":"negative"},{"bands":[1,2,3,4,5,23,25],"call":"1a"}]];
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