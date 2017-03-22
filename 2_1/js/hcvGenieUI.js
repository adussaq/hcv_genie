/*global amd_ww, jsPDF, rasterizeHTML, window, FileReader, hcvGenie, PDFJS console, document, checkPromises, jQuery*/
var glob, global2 = [];
(function () {
    'use strict';
        //functions
    var getAndRunSample, $ = jQuery, displayResults, getBandNumbers,
            updateGenotypeCall, getFile, convertTableToImage, scaleCanvas,
            cropCanvas, makePDF, createTable,
            //UI Elements
            textAnswer, /*originalImage,*/ proccessedImg, dropRegion,
            saveButton, sampleButton, fromComputerButton,
            //Proccessing Done
            sampleButtonClicked = false, finished = false,
            //variables
            resultsTable = [];

    textAnswer = $('#textResults');
    // originalImage = $('#originalImage'); //Not yet showing
    proccessedImg = $('#imageResults');
    var parentOfImg = $('#fixer');
    parentOfImg.on('affix.bs.affix', function () {
        parentOfImg.parent().css("min-height", proccessedImg.height());
        parentOfImg.css("max-width", proccessedImg.width());
    });
    parentOfImg.affix({
        offset: {
            top: parentOfImg.offset().top - 51
        }
    });

    //set on resize?
    window.onresize = function () {
        //essentially to deal with the resize of the page we have to destory
        // the old affix point and create a new one... Here it is.
        var temp = $('<div id="fixer"></div>');
        proccessedImg.detach().appendTo(temp);
        temp.appendTo(parentOfImg.parent());
        parentOfImg.remove();
        parentOfImg = temp;
        parentOfImg.on('affix.bs.affix', function () {
            parentOfImg.parent().css("min-height", proccessedImg.height());
            parentOfImg.css("max-width", proccessedImg.width());
        });
        parentOfImg.affix({
            offset: {
                top: parentOfImg.offset().top - 51
            }
        });
        parentOfImg.parent().css("min-height", proccessedImg.height());
        parentOfImg.css("max-width", proccessedImg.width());
    };

    dropRegion = $('#drop');

    getAndRunSample = function () {
        var page = Math.round(Math.random() * 46 + 1);
        hcvGenie.findBands({
            image: {
                type: 'pdf',
                pageNumber: 1,
                url: '../dataExamples/pages/page' + page + '.pdf',
                scale: 2.25
            },
            onchange: createTable
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
                bandArr = banding.split(/,|\s|;/);
                hcvGenie.genotype(bandArr).then(function (res) {
                    // console.log(res);
                    $('#' + bandObj.genotype_id).text(res);
                });
            }
        };
    };

    displayResults = function (hcvG_results) {
        //Display original canvas:
        var bandingObj;
        // console.log(hcvG_results);
        //empty the old result
        proccessedImg.empty();
        //Now put in the new one
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
        hcvG_results.bandingPromise.then(function (temp) {
            bandingObj = temp;
            return bandingObj.lanePromise;
        }).then(function (results) {
            // console.log('here', results.lanes(), results.region, hcvG_results);

            //temporary until functions are linked together...

            //Shift the analysis region
            scaleCanvas({
                canvas: $(hcvG_results.canvas),
                all: false,
                region: results.region
            });
            glob = bandingObj;
            //make table and insert the results
            createTable(results.lanes());

            sampleButtonClicked = false;
            finished = true;
            saveButton.toggleClass('disabled');
            sampleButton.toggleClass('disabled');
            fromComputerButton.toggleClass('disabled');
            dropRegion.show();
        });
    };

    createTable = function (lanes) {
        var lane, table, band, row, tempTabStr = [];

        table = $('<table class="table table-hover" style="width:100%">');
        textAnswer.empty();
        resultsTable = [];

        textAnswer.append('<div class="alert alert-warning" role="alert">*<em>Do not click on the image once you use the table below. To change band calls begin by interacting with the image. Any changes to the table below will only be indicated in the report. Any changes done to the image will overwrite changes performed on the table in favor of the image state.</em></div>');
        table.appendTo(textAnswer);
        table.append($('<tr><th style="width:10%">Lane</th>' +
                '<th style="width:40%">Genotype</th>' +
                '<th style="width:50%">Banding Pattern</th></tr>'));
        for (lane = 0; lane < lanes.length; lane += 1) {
            band = getBandNumbers(lanes[lane].bands);
            row = $('<tr>', {
                html: '<td>' + (lane + 1) + '</td>' +
                        '<td id="' + band.genotype_id + '"><p style="padding-bottom:14px;">' +
                        lanes[lane].genotype + '</p><p>Patient Name: <input type="text" class="form-control" /></p></td>' +
                        '<td><p>' +
                        band.string + '</p><p>Accession Number: <input type="text" class="form-control" /></p></td></tr>'
            });
            tempTabStr.push((lane + 1) + '\t ' + band.string.replace(/[\S\s]+\"([\d,\s]+)\">?/, '$1') + '\t ' + lanes[lane].genotype);
            table.append(row);
            resultsTable.push(row);
            $('#' + band.form_id).keyup(updateGenotypeCall(band));
        }
        console.log(tempTabStr.join('\n'));
    };

    cropCanvas = function () {
        var tempCanvas, ctx, mainPart = $(proccessedImg.children()[0]),
                oldCanvas = $(proccessedImg.children().children()[0]),
                drawCanvas = $(proccessedImg.children().children()[1]);

        tempCanvas = document.createElement('canvas');
        tempCanvas.width = proccessedImg.width();
        tempCanvas.height = proccessedImg.height();
        ctx = tempCanvas.getContext('2d');
        ctx.drawImage(
            oldCanvas[0],
            mainPart.css('margin-left').replace(/px/, ""),
            mainPart.css('margin-top').replace(/px/, ""),
            mainPart.css('width').replace(/px/, ""),
            mainPart.css('width').replace(/px/, "") *
                    oldCanvas.height() / oldCanvas.width()
        );
        ctx.drawImage(
            drawCanvas[0],
            mainPart.css('margin-left').replace(/px/, ""),
            mainPart.css('margin-top').replace(/px/, ""),
            mainPart.css('width').replace(/px/, ""),
            mainPart.css('width').replace(/px/, "") *
                    oldCanvas.height() / oldCanvas.width()
        );

        // console.log('here to crop');

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

        console.log(resultsTable);
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
            text: "Patient Name",
            style: "width:22%"
        }));
        tableRow.append($('<th>', {
            class: "tg-5xks",
            text: "Accession Number",
            style: "width:23%"
        }));

        for (i = 0; i < resultsTable.length; i += 1) {
            tableRow = $('<tr>').appendTo(fakeTable);
            //samp Number
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[0]).text()
            }));
            //Genotype
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[1].children[0]).text()
            }));
            //Bands
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[2].children[0].children[0]).val(
                ).split(/\D+/).join(', ')
            }));
            // Name
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[1].children[1].children[0]).val()
            }));
            // Acc Number
            tableRow.append($('<td>', {
                class: "tg-ump5",
                text: $(resultsTable[i].children()[2].children[1].children[0]).val()
            }));
        }

        htmlString += fakeDiv.html().replace(/<\/*tbody>/, '');
        realTable = $(htmlString);
        $(realTable[1]).css("width", tableWidth);
        $(realTable[1]).css("visibility", "hidden");
        $(realTable[1]).css("position", "absolute");
        $(realTable[1]).css("display", "block");

        $('body').prepend(realTable);
        // $(realTable[1]).prop(
        //     'style',
        //     "width:" + tableWidth + "px; " +
        //             "visibility:hidden; position:absolute; display:block;"
        // );


        tempCanvas = document.createElement('canvas');
        tempCanvas.setAttribute('crossOrigin', 'anonymous');
        tempCanvas.width = tableWidth + 15;
        tempCanvas.id = 'tempTableCanvas';
        tempCanvas.height = $(realTable[1]).height() + 80; //All this will do
                    //is make extra space at the end of the table which will
                    // just be cut off of the bottom of the page.

        return rasterizeHTML.drawHTML(
            htmlString,
            tempCanvas
        ).then(function () {
            return {
                imgURL: tempCanvas.toDataURL("data:image/svg+xml;utf8"),
                width: tempCanvas.width,
                height: tempCanvas.height
            };
        });
    };

    makePDF = function (filename) {
        var pdf = new jsPDF(), yPos = 20, height, finalRat;

        cropCanvas().then(function (img) {
            var endPos = 170;
            height = Math.round(170 * img.height / img.width);
            if (height > 60) {
                endPos = 20 + 60 / height * 150;
                height = 60;
            }
            return pdf.addImage(img.imgURL, 'png', 20, yPos, endPos, height);
        }).then(function () {
            yPos += height;
            return convertTableToImage();
        }).then(function (table) {
            return pdf.addImage(table.imgURL, 'svg', 20, yPos, 170,
                    Math.round(170 * table.height / table.width));
        }).then(function () {
            pdf.addPage();
            pdf.setPage(2);
            finalRat = Math.min(
                proccessedImg.children().height() /
                        proccessedImg.children().width(),
                11 / 8.5
            );

            return pdf.addImage(proccessedImg.children().children()[0].toDataURL(), 'png',
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
                            scale: 2.2
                        },
                        onchange: createTable
                    }).then(displayResults);
                } else {
                    hcvGenie.findBands({
                        image: {
                            type: 'png',
                            url: url
                        },
                        onchange: createTable
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
                //Resets for a new image coming in...
                // proccessedImg.empty();
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


   //Add button functionality
    (function () {
        var hover = false, checkDrag, fromComputer;

        sampleButton = $('.demoFile');
        fromComputer = $('.computerFile');
        fromComputerButton = $('.computerFileButton');
        saveButton = $('.saveFile');
        saveButton.toggleClass('disabled');

        if (!window.Blob || (navigator.userAgent.match(/safari/i) && !navigator.userAgent.match(/chrome/i))) {
            saveButton.hide();
        }
        checkDrag = document.createElement('span');
        if (
            !'draggable' in checkDrag ||
            !('ondragleave' in checkDrag &&
                    'ondragover' in checkDrag &&
                    'ondrop' in checkDrag)
        ) {
            dropRegion.parent().empty();
        }

        //test for mobile device
        if (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera\ Mini/i.test(navigator.userAgent)
        ) {
            dropRegion.parent().empty();
        }

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
                if (!saveButton.hasClass('disabled')) {
                    saveButton.toggleClass('disabled');
                }
                sampleButton.toggleClass('disabled');
                fromComputerButton.toggleClass('disabled');
            }
        });
        fromComputer.change(function (evt) {
            if (!sampleButtonClicked) {
                textAnswer.empty();
                proccessedImg.empty();
                sampleButtonClicked = true;
                finished = false;
                dropRegion.hide();
                getFile(evt.target.files[0]);
                if (!saveButton.hasClass('disabled')) {
                    saveButton.toggleClass('disabled');
                }
                sampleButton.toggleClass('disabled');
                fromComputerButton.toggleClass('disabled');
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
                if (!saveButton.hasClass('disabled')) {
                    saveButton.toggleClass('disabled');
                }
                sampleButton.toggleClass('disabled');
                fromComputerButton.toggleClass('disabled');
                sampleButtonClicked = true;
                finished = false;
                dropRegion.hide();
                getFile(evt.originalEvent.dataTransfer.files[0]);
            }
        });
    }());

    //Set up tabs
    (function () {
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href"); // activated tab
            if (target !== '#home') {
                window.location.hash = target;
            } else {
                window.location.hash = "";
            }
            window.scrollTo(0, 0);
        });
    }());
    window.onload = function () {
        window.scrollTo(0, 0);
        if (window.location.hash) {
            $('a[href="' + window.location.hash + '"]').click();
        }
    };
}());