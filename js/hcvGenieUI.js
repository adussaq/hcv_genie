/*global amd_ww, window, FileReader, hcvGenie, PDFJS console, document, checkPromises, jQuery*/
(function () {
    'use strict';
        //functions
    var getAndRunSample, $ = jQuery, displayResults, getBandNumbers,
            updateGenotypeCall, getFile,
            //UI Elements
            textAnswer, /*originalImage,*/ proccessedImg, dropRegion,
            //Proccessing Done
            sampleButtonClicked = false;

    textAnswer = $('#textResults');
    // originalImage = $('#originalImage'); //Not yet showing
    proccessedImg = $('#imageResults');
    dropRegion = $('#drop');

    getAndRunSample = function () {
        var page = Math.round(Math.random() * 19 + 1);
        hcvGenie.findBands({
            image: {
                type: 'pdf',
                pageNumber: 1,
                url: './dataExamples/pages/samples1-20_page' + page + '.pdf',
                scale: 2.25
            }
        }).then(displayResults);
    };

    getBandNumbers = function (bandArr) {
        return (function (bandArr) {
            var str, formid, genoid;
            formid = Math.random().toString(12).replace("0.", "");
            genoid = Math.random().toString(12).replace("0.", "");
            str = '<input id="' + formid +
                    '" type="text" class="form-control" value="' +
                    bandArr.map(function (x) {
                return x.call;
            }).join(', ') + '">';
            return {
                string: str,
                form_id: formid,
                genotype_id: genoid
            };
        }(bandArr));
    };

    updateGenotypeCall = function (bandObj) {
        return function (evt) {
            var banding, bandArr;
            evt.preventDefault();
            banding = $('#' + bandObj.form_id).val();

            //Only do anything if every number is recognized
            if (banding.match(/^[\s,\d]+$/)) {
                bandArr = banding.split(/,/);
                hcvGenie.genotype(bandArr).then(function (res) {
                    console.log(res);
                    $('#' + bandObj.genotype_id).text(res);
                });
            }
        };
    };

    displayResults = function (hcvG_results) {
        //Display original canvas:
        proccessedImg.empty();
        proccessedImg.append(
            $(hcvG_results.canvas).width(proccessedImg.width())
        );

        //Update canvas visibility once the region comes back
        // hcvG_results.analysisRegion.then(function (region) {
            //Determine the amount the image has been scaled

            //Set the image results element to a stationary height based on
            //region height adjusted for the amount scaled

            //Set the canvas margin-top to (-) where the top needs to be
        // });

        //Update band locations
        hcvG_results.bandLocationPromise.then(function (results) {
            var lane, table, band;
            console.log('here', results.lanes);
            //make table and insert the results
            table = $('<table class="table table-hover" style="width:100%">');
            table.appendTo(textAnswer);
            table.append($('<tr><th style="width:10%">Lane Number</th>' +
                    '<th style="width:30%">Genotype</th>' +
                    '<th style="width:60%">Bands</th></tr>'));
            for (lane = 0; lane < results.lanes.length; lane += 1) {
                band = getBandNumbers(results.lanes[lane].bands);
                table.append($('<tr>', {
                    html: '<td>' + (lane + 1) + '</td>' +
                            '<td id="' + band.genotype_id + '">' +
                            results.lanes[lane].genotype + '</td>' +
                            '<td>' +
                            band.string + '</td></th>'
                }));
                $('#' + band.form_id).keyup(updateGenotypeCall(band));
            }
            sampleButtonClicked = false;
        });
    };

    getFile = function (file) {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            //this function is called when the input loads an image
            var url, reader = new FileReader();
            reader.onload = function (event) {
                url = event.target.result;
                hcvGenie.findBands({
                    image: {
                        type: 'pdf',
                        pageNumber: 1,
                        url: url,
                        scale: 2.25
                    }
                }).then(displayResults);
            };

            //when the file is read it triggers the onload event above.
            reader.readAsDataURL(file);
        } else {
            window.alert('The File APIs are not fully supported in this browser.');
        }
    };


   //Add button functionality
    (function () {
        var sampleButton, fromComputerButton, hover = false;

        sampleButton = $('#demoFile');
        fromComputerButton = $('#computerFile');
        sampleButton.click(function (evt) {
            evt.preventDefault();
            if (!sampleButtonClicked) {
                textAnswer.empty();
                proccessedImg.empty().text('Grabbing the image from the ' +
                        'server, this may take a few seconds.');
                sampleButtonClicked = true;
                getAndRunSample();
            }
        });

        fromComputerButton.change(function (evt) {
            if (!sampleButtonClicked) {
                textAnswer.empty();
                proccessedImg.empty();
                sampleButtonClicked = true;
                console.log(evt);
                getFile(evt.target.files[0]);
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
                textAnswer.empty();
                proccessedImg.empty();
                sampleButtonClicked = true;
                getFile(evt.originalEvent.dataTransfer.files[0]);
            }
        });
    }());
}());