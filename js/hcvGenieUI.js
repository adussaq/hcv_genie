/*global amd_ww, jsPDF, rasterizeHTML, window, FileReader, hcvGenie, PDFJS console, document, checkPromises, jQuery*/
(function () {
    'use strict';
        //functions
    var getAndRunSample, $ = jQuery, displayResults, getBandNumbers,
            updateGenotypeCall, getFile, convertTableToImage, scaleCanvas,
            cropCanvas, makePDF,
            //UI Elements
            textAnswer, /*originalImage,*/ proccessedImg, dropRegion,
            //Proccessing Done
            sampleButtonClicked = false, finished = false,
            //variables
            resultsTable = [];

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
        scaleCanvas({
            canvas: $(hcvG_results.canvas),
            all: true
        });
        resultsTable = [];

        //Update canvas visibility once the region comes back
        // hcvG_results.analysisRegion.then(function (region) {
            //Determine the amount the image has been scaled

            //Set the image results element to a stationary height based on
            //region height adjusted for the amount scaled

            //Set the canvas margin-top to (-) where the top needs to be
        // });

        //Update band locations
        hcvG_results.bandLocationPromise.then(function (results) {
            var lane, table, band, row;
            console.log('here', results.lanes, results.region);
            //Shift the analysis region
            scaleCanvas({
                canvas: $(hcvG_results.canvas),
                all: false,
                region: results.region
            });

            //make table and insert the results
            table = $('<table class="table table-hover" style="width:100%">');
            table.appendTo(textAnswer);
            table.append($('<tr><th style="width:10%">Lane</th>' +
                    '<th style="width:30%">Genotype</th>' +
                    '<th style="width:60%">Banding Pattern</th></tr>'));
            for (lane = 0; lane < results.lanes.length; lane += 1) {
                band = getBandNumbers(results.lanes[lane].bands);
                row = $('<tr>', {
                    html: '<td>' + (lane + 1) + '</td>' +
                            '<td id="' + band.genotype_id + '">' +
                            results.lanes[lane].genotype + '</td>' +
                            '<td>' +
                            band.string + '</td></th>'
                });
                table.append(row);
                resultsTable.push(row);
                $('#' + band.form_id).keyup(updateGenotypeCall(band));
            }
            sampleButtonClicked = false;
            finished = true;
            dropRegion.show();
        });
    };

    cropCanvas = function () {
        var tempCanvas, oldCanvas, ctx;
        oldCanvas = $(proccessedImg.children()[0]);

        tempCanvas = document.createElement('canvas');
        tempCanvas.width = proccessedImg.width();
        tempCanvas.height = proccessedImg.height();
        ctx = tempCanvas.getContext('2d');
        ctx.drawImage(
            oldCanvas[0],
            oldCanvas.css('margin-left').replace(/px/, ""),
            oldCanvas.css('margin-top').replace(/px/, ""),
            oldCanvas.css('width').replace(/px/, ""),
            oldCanvas.css('width').replace(/px/, "") *
                    oldCanvas.height() / oldCanvas.width()
        );

        console.log('here to crop');

        return Promise.resolve({
            imgURL: tempCanvas.toDataURL(),
            width: tempCanvas.width,
            height: tempCanvas.height
        });
    };

    convertTableToImage = function () {
        var htmlString, fakeTable, tableRow, i, fakeDiv, realTable,
                tableWidth = 1000, tempCanvas;
        htmlString = '<style type="text/css"> .tg {border-collapse:collapse;' +
                'border-spacing:0;border-color:#ccc;} .tg td{font-family:' +
                'Arial, sans-serif;font-size:14px;padding:10px 5px;' +
                'border-style:solid;border-width:0px;overflow:hidden;' +
                'word-break:normal;border-color:#ccc;color:#333;' +
                'background-color:#fff;border-top-width:1px;' +
                'border-bottom-width:1px;} .tg th{font-family:Arial, ' +
                'sans-serif;font-size:14px;font-weight:normal;padding:10px ' +
                '5px;border-style:solid;border-width:0px;overflow:hidden;' +
                'word-break:normal;border-color:#ccc;color:#333;' +
                'background-color:#f0f0f0;border-top-width:1px;' +
                'border-bottom-width:1px;} .tg .tg-5xks{font-weight:bold;' +
                'font-family:"Lucida Sans Unicode", "Lucida Grande", ' +
                'sans-serif !important;;text-align:left;vertical-align:top}' +
                ' .tg .tg-ump5{font-family:"Lucida Sans Unicode", "Lucida ' +
                'Grande", sans-serif !important;;vertical-align:top} </style>';
        fakeDiv = $('<div>');
        //A line of 210 pixels will stretch end to end, 20 px buffer on either
        // side looks nice so we have a 170 px wide table...
        fakeTable = $('<table>', {
            class: "tg",
            style: "width:" + tableWidth + "px"
        }).appendTo(fakeDiv);
        //headers: tg-5xks
        //rows: tg-ump5
        //make header
        tableRow = $('<tr>').appendTo(fakeTable);
        tableRow.append($('<th>', {
            class: "tg-5xks",
            text: "Lane",
            style: "width:10%"
        }));
        tableRow.append($('<th>', {
            class: "tg-5xks",
            text: "Genotype",
            style: "width:25%"
        }));
        tableRow.append($('<th>', {
            class: "tg-5xks",
            text: "Banding Pattern",
            style: "width:20%"
        }));
        tableRow.append($('<th>', {
            class: "tg-5xks",
            text: "Notes",
            style: "width:45%"
        }));

        for (i = 0; i < resultsTable.length; i += 1) {
            tableRow = $('<tr>').appendTo(fakeTable);
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[0]).text()
            }));
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[1]).text()
            }));
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[2]).children().val(
                ).split(/\D+/).join(', ')
            }));
            tableRow.append($('<td>', {
                class: "tg-ump5",
                html: '&nbsp;'
            }));
        }

        htmlString += fakeDiv.html().replace(/<\/*tbody>/, '');
        realTable = $(htmlString);
        $(realTable[1]).prop(
            'style',
            "width:" + tableWidth + "px;" +
                    "display:block;visibility:hidden;position:absolute;"
        );
        $('body').prepend(realTable);

        tempCanvas = document.createElement('canvas');
        tempCanvas.width = tableWidth + 15;
        tempCanvas.height = $(realTable[1]).height() + 35;

        return rasterizeHTML.drawHTML(
            htmlString,
            tempCanvas
        ).then(function () {
            return {
                imgURL: tempCanvas.toDataURL(),
                width: tempCanvas.width,
                height: tempCanvas.height
            };
        });
    };

    makePDF = function (filename) {
        var pdf = new jsPDF(), yPos = 20, height, finalRat;

        cropCanvas().then(function (img) {
            height = Math.round(170 * img.height / img.width);
            return pdf.addImage(img.imgURL, 'png', 20, yPos, 170, height);
        }).then(function () {
            yPos += height;
            return convertTableToImage();
        }).then(function (table) {
            return pdf.addImage(table.imgURL, 'png', 20, yPos, 170,
                    Math.round(170 * table.height / table.width));
        }).then(function () {
            pdf.addPage();
            pdf.setPage(2);
            finalRat = Math.min(
                proccessedImg.children().height() /
                        proccessedImg.children().width(),
                11 / 8.5
            );

            return pdf.addImage(proccessedImg.children()[0].toDataURL(), 'png',
                    0, 0, 210, 210 * finalRat);
        }).then(function () {
            pdf.save(filename);
            finished = true;
        });
    };

    getFile = function (file) {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            //this function is called when the input loads an image
            var url, reader = new FileReader();
            reader.onload = function (event) {
                url = event.target.result;
                if (file.name.match(/\.pdf$/)) {
                    hcvGenie.findBands({
                        image: {
                            type: 'pdf',
                            pageNumber: 1,
                            url: url,
                            scale: 2.25
                        }
                    }).then(displayResults);
                } else {
                    hcvGenie.findBands({
                        image: {
                            type: 'png',
                            url: url
                        }
                    }).then(displayResults);
                }
            };

            //when the file is read it triggers the onload event above.
            reader.readAsDataURL(file);
        } else {
            window.alert('The File APIs are not fully supported in this browser.');
        }
    };

    scaleCanvas = function (obj) {
        var resize;
        if (obj.all) {
            resize = function () {
                proccessedImg.empty();
                proccessedImg.css("overflow", "");
                proccessedImg.css("height", "");
                proccessedImg.append(
                    obj.canvas.width(proccessedImg.width())
                );
                console.log('resizing all');
            };
        } else {
            resize = function () {
                var width, widthRat, imgBuff, imgWidth, top, height;
                proccessedImg.empty();
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
                proccessedImg.css("height", height);
                proccessedImg.append(
                    obj.canvas.width(width + 2 * imgBuff * widthRat)
                );
                obj.canvas.css("margin-top", top);
                obj.canvas.css("margin-left", -imgBuff * widthRat);
                console.log('resizing part', width, imgWidth);
            };
        }
        resize();
        $(window).unbind("resize");
        $(window).resize(resize);
    };


   //Add button functionality
    (function () {
        var sampleButton, fromComputerButton, saveButton, hover = false;

        sampleButton = $('.demoFile');
        fromComputerButton = $('.computerFile');
        saveButton = $('.saveFile');

        sampleButton.click(function (evt) {
            evt.preventDefault();
            if (!sampleButtonClicked) {
                textAnswer.empty();
                proccessedImg.empty().text('Grabbing the image from the ' +
                        'server, this may take a few seconds.');
                sampleButtonClicked = true;
                finished = false;
                dropRegion.hide();
                getAndRunSample();
            }
        });
        fromComputerButton.change(function (evt) {
            if (!sampleButtonClicked) {
                textAnswer.empty();
                proccessedImg.empty();
                sampleButtonClicked = true;
                finished = false;
                dropRegion.hide();
                getFile(evt.target.files[0]);
            } else {
                evt.preventDefault();
            }
        });

        saveButton.click(function (evt) {
            evt.preventDefault();
            if (finished) {
                finished = false;
                makePDF('HCV_genie_' +
                        (new Date()).toLocaleString().replace(/[\/\,\s\:]+/g, "_"));
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
                finished = false;
                dropRegion.hide();
                getFile(evt.originalEvent.dataTransfer.files[0]);
            }
        });
    }());
}());