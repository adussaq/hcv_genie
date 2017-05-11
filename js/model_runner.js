/*global console, Blob, alert, $, jQuery, window, FileReader, hcvGenie, globModel, LINEARFIT*/
(function () {
    'use strict';

    var globModel = [], saveData, constants_object, $ = jQuery, startAnalysis, getFile, displayResults, scaleCanvas, proccessedImg, startFitting, dropRegion, fromComputerButton, sampleButtonClicked = false;

    //get the file for analysis
    window.onload = function () {
        var constantURL;
        window.scrollTo(0, 0);
        if (window.location.hash) {
            $('a[href="' + window.location.hash + '"]').click();
        }
        if (window.location.search && window.location.search.match(/[?&]data=[^&?#]+/)) {
            constantURL = window.location.search.match(/([?&]data=)([^&?#]+)/)[2];
        } else {
            constantURL = './json/default_params.json';
        }
        $.get(constantURL, function (x) {
            constants_object = x;

        }).fail(function () {
            $('#home').children().hide();
            $('#home').append('<div class="container well">Failed to load constants object, this tool does not work without that. Please provide it in the url using a data= tag, or remove the data= tag to utilize the defaults.</div>');
            alert("Failed to get constants object, make sure your '?data=...' URL is correct and CORS enabled.");
        });
    };

    getFile = function (file) {
        // console.log(file);
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            //this function is called when the input loads an image
            var url, reader = new FileReader();
            reader.onload = function (event) {
                url = event.target.result;
                startAnalysis(file, url, 2.0); //Start at 2.0
            };

            //when the file is read it triggers the onload event above.
            reader.readAsDataURL(file);
        } else {
            window.alert('The File APIs are not fully supported in this browser.');
        }
    };

    startAnalysis = function (file, url, scale) {
        console.log('starting scale:' + scale);
        proccessedImg.empty();
        proccessedImg.height("");
        if (file.name.match(/\.pdf$/)) {
            hcvGenie.findBands({
                image: {
                    type: 'pdf',
                    pageNumber: 1,
                    url: url,
                    scale: scale,
                    parameters: constants_object
                }
            }).then(displayResults(file, url, scale));
        } else {
            hcvGenie.findBands({
                image: {
                    type: 'png',
                    url: url,
                    parameters: constants_object
                }
            }).then(displayResults(file, url, scale));
        }
    };

    startFitting = function (data, file, url, scale) {
        // console.log('start fitting', data);
        var inc = 0.249;
        globModel.push(data);

        if (scale + inc < 2.5) {
            startAnalysis(file, url, scale + inc);
            proccessedImg.empty();
            proccessedImg.height("");
            $('#model').empty();
            $('#download_params').addClass('hidden');
        } else {
            sampleButtonClicked = false;
            fromComputerButton.toggleClass('disabled');
            dropRegion.show();
            $('#download_params').removeClass('hidden');
        }

        //Now we need to fit these two models
    };

    displayResults = function (file, url, scale) {
        return function (hcvG_results) {
            hcvG_results.bandingPromise.then(function (banding_obj) {
                // console.log('bands', banding_obj);

                //clear part of the page
                banding_obj.lanePromise.then(function (thisObj) {
                    // console.log('all banded...', thisObj);
                    scaleCanvas({
                        canvas: $(hcvG_results.canvasObject.canvasHolder),
                        all: false,
                        region: thisObj.region
                    });
                });

                $('#model').append($('<div>', {
                    class: 'col-xs-12 col-sm-4 col-sm-offset-4 col',
                    style: 'margin-top:15px'
                }).append($('<button>', {
                    text: 'Done editing',
                    class: 'btn btn-lg btn-primary text-center center-block bottom-buffer'
                }).click(function (evt) {
                    evt.preventDefault();
                    // console.log(hcvG_results.bandingPromise);
                    $('#model').empty();
                    banding_obj.model_fit_data().then(function (dataObj) {
                        startFitting(dataObj, file, url, scale);
                    });
                })).append('<p>Correct any errors before continuing. This will run 3 times on each image at different zoom levels, then it will generate an object for you to download. Or you will be able to add another image to create a more stable soultion.</p>'));
            });
            proccessedImg.append(hcvG_results.canvasObject.canvasHolder);
            //We have to set the height of the parent div to that of the children...
            hcvG_results.canvasObject.canvasHolder.height(hcvG_results.canvasObject.canvasHolder.children().height());
        };
    };

    scaleCanvas = function (obj) {
        var resize;
        // console.log('resizing?', obj);
        if (obj.all) {
            resize = function () {
                //Resets for a new image coming in...
                proccessedImg.empty();
                proccessedImg.css("overflow", "");
                proccessedImg.css("height", "");
                proccessedImg.append(
                    obj.canvas.width(proccessedImg.width())
                );
                // console.log('resizing all');
            };
        } else {
            resize = function () {
                var width, widthRat, imgBuff, imgWidth, top, height;
                // proccessedImg.empty();
                width = proccessedImg.width();
                imgBuff = Math.min(
                    obj.region.min[0],
                    obj.region.width - obj.region.max[0]
                );

                imgWidth = obj.region.width - 2 * imgBuff;
                widthRat = width / imgWidth;
                top = -1 * obj.region.min[1] * widthRat;
                height = (obj.region.max[1] - obj.region.min[1]) *
                        widthRat;
                proccessedImg.css("overflow", "hidden");
                proccessedImg.css("position", "relative");
                proccessedImg.css("height", height);
                proccessedImg.attr("class", "my-img-thumbnail");
                proccessedImg.append(
                    obj.canvas.width(width + 2 * imgBuff * widthRat)
                );
                obj.canvas.css("margin-top", top);
                obj.canvas.css("margin-left", -imgBuff * widthRat);
                // console.log('resizing part', width, imgWidth);
            };
        }
        resize();
        $(window).unbind("resize");
        $(window).resize(resize);
    };

    //set up buttons
    (function () {
        var hover = false, checkDrag, fromComputer;

        fromComputer = $('.computerFile');
        fromComputerButton = $('.computerFileButton');
        dropRegion = $('#drop_model');
        proccessedImg = $('#model_img');

        //check for drag features
        checkDrag = document.createElement('span');

        if (
            checkDrag.draggable === undefined ||
            (checkDrag.ondragleave === undefined &&
                    checkDrag.ondragover === undefined &&
                    checkDrag.ondrop === undefined)
        ) {
            dropRegion.parent().empty();
        }

        //test for mobile devices
        if (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera\ Mini/i.test(navigator.userAgent)
        ) {
            dropRegion.parent().empty();
        }

        fromComputer.change(function (evt) {
            if (!sampleButtonClicked) {
                sampleButtonClicked = true;
                dropRegion.hide();
                getFile(evt.target.files[0]);
                fromComputerButton.toggleClass('disabled');
            } else {
                evt.preventDefault();
            }
        });

        dropRegion.on('dragover', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            if (!hover && !sampleButtonClicked) {
                dropRegion.addClass("hover");
                hover = true;
            }
            return false;
        });
        dropRegion.on('dragleave', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            dropRegion.removeClass("hover");
            hover = false;
            return false;
        });
        dropRegion.on('drop', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            dropRegion.removeClass("hover");
            hover = false;
            if (!sampleButtonClicked) {
                fromComputerButton.toggleClass('disabled');
                sampleButtonClicked = true;
                dropRegion.hide();
                getFile(evt.originalEvent.dataTransfer.files[0]);
            }
        });

        //Set up the download parameters button
        $('#download_params').click(function (evt) {
            var today, distances, distances6, distancesA, distModel6s, distModelAs, greys, greyModel, nonGreyMax, paramObj;

            evt.preventDefault();
            //do this to allow the modal to open
            setTimeout(function () {
                paramObj = {
                    grey: {},
                    distance: {},
                    distance2: {}
                };

                today = new Date();
                today = today.toLocaleDateString().replace(/\//g, '_') + '_' +
                        today.getHours().toString() + '_' +
                        today.getMinutes().toString();

                //grey values
                greys = globModel.map(function (x) {
                    return x.grey_scores.data;
                }).reduce(function (a, b) {
                    return a.concat(b);
                });

                //Grey Linear Fit
                greyModel = LINEARFIT(greys.map(function (x) {
                    return x.slice(1, x.length);
                }), greys.map(function (x) {
                    return x[0];
                }), 1);

                //Save grey parameters
                greyModel.params.map(function (x, i) {
                    var key = globModel[0].grey_scores.columns[i + 1] || 'constant';
                    paramObj.grey[key] = x;
                });

                //Add in minimum value for grey, maximum of the failed spots
                nonGreyMax = -Infinity;
                greys.map(function (x) {
                    var i, val = greyModel.params[x.length - 1];
                    for (i = 1; i < x.length; i += 1) {
                        val += greyModel.params[i - 1] * x[i];
                    }
                    if (!x[0]) {
                        nonGreyMax = Math.max(nonGreyMax, val);
                    }
                });
                paramObj.grey.minimum = nonGreyMax;

                //distances now
                distances = globModel.map(function (x) {
                    return x.distances.data;
                }).reduce(function (a, b) {
                    return a.concat(b);
                });
                distances6 = [];
                distancesA = [];
                distances.map(function (x) {
                    if (x[0] < 7) {
                        distances6.push(x);
                    } else {
                        distancesA.push(x);
                    }
                });

                distModel6s = LINEARFIT(distances6.map(function (x) {
                    return x.slice(1, x.length - 1); // Cannot use 6 score
                }), distances6.map(function (x) {
                    return x[0];
                }), 1);
                distModelAs = LINEARFIT(distancesA.map(function (x) {
                    return x.slice(1, x.length);
                }), distancesA.map(function (x) {
                    return x[0];
                }), 1);

                //Save dist parameters
                distModel6s.params.map(function (x, i) {
                    var key = globModel[0].distances.columns[i + 1];
                    key = key === "dist_sixScore"
                        ? 'constant'
                        : key;
                    key = key.replace('dist_', '');
                    paramObj.distance[key] = x;
                });
                distModelAs.params.map(function (x, i) {
                    var key = globModel[0].distances.columns[i + 1] || 'constant';
                    key = key.replace('dist_', '');
                    paramObj.distance2[key] = x;
                });

                saveData(JSON.stringify(paramObj), 'hcvgenie_params_' + today + '.json');
            }, 1000);
        });
    }());

    saveData = (function () {
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

}());