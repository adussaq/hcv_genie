/*global $, Jquery, window, console, onscroll*/
// Code to create the affix effect (complements of adussaq)
// Please note: this code is designed to run after the html has loaded
(function () {
    'use strict';

    var appearHeight, setParameters, nestThem, resetParents, table$,
            originalHeader$, currentHash = window.location.hash,
            getHashLocations, addHashToUrl, anchorLocations;

    addHashToUrl = function (hash) {
        //If we can manipulate this
        if (history) {
            if (hash.length === 0) {
                //No hash passed, set it to nothing
                history.pushState(
                    '',
                    document.title,
                    window.location.pathname
                );
            } else {
                //Hash passed, set it to the appropriate value
                history.pushState(
                    '',
                    document.title,
                    window.location.pathname + '#' + hash
                );
            }
        }
    };

    getHashLocations = function () {
        anchorLocations = [{
            location: 0,
            id: ''
        }];
        $('.anchor').each(function () {
            anchorLocations.push({
                location: $(this).offset().top,
                id: $(this).attr('id')
            });
        });
        anchorLocations = anchorLocations.sort(function (a, b) {
            return a.location - b.location;
        });
    };

    setParameters = function (index) {
        var $agendaDay = $(this), navbarHeight = $('.navbar').height(),
                $table = $(table$[index]), tableTop = $table.offset().top,
                tableBottom = tableTop + $table.height();

        //When it is affixed make sure the parent does not lose any height
        $agendaDay.on('affix.bs.affix', function () {
            //Maintian width
            $agendaDay.css("width", $agendaDay.parent().width());
            $agendaDay.parent().css("min-height", $agendaDay.height());
        });

        //Actually set up the affix functions
        $agendaDay.affix({
            offset: {
                top: $agendaDay.offset().top - navbarHeight,
                bottom: $(document).height() - tableBottom
            }
        });
    };

    nestThem = function () {
        var $header = $(this), $temp;
        $temp = $('<div>');
        $header.wrap($temp);

        //return the non jquery element
        return $header.parent()[0];
    };

    resetParents = function (index) {
        var $parent = $(this), $temp;
        //Creates a new div out of the contained html, removing affix
        $temp = $(originalHeader$[index]).clone();

        //Removes old stuff and replaces it with the new
        $parent.empty();
        $parent.append($temp);

        //Set new minimum height for the parent
        $parent.css("min-height", $temp.height());

        //return the non jquery element
        return $temp[0];
    };

    //Set up the onscroll event
    window.onscroll = function () {
        var top = window.pageYOffset, i, found = false,
                newHash = anchorLocations[anchorLocations.length - 1].id;

        //First check to see if 'top button' should be there
        if (top >= appearHeight) {
            $('.top-navigation').fadeIn();
        } else {
            $('.top-navigation').fadeOut();
        }

        //Now check to see if the hash has changed
        for (i = 0; !found && i < anchorLocations.length - 1; i += 1) {
            if (top >= anchorLocations[i].location &&
                    top < anchorLocations[i + 1].location) {
                found = true;
                newHash = anchorLocations[i].id;
            }
        }

        if (newHash !== currentHash) {
            addHashToUrl(newHash);
            currentHash = newHash;
        }
    };

    //Actually sets up all the elements
    $(window).load(function () {
        var header$, parent$;
        //Set the table array
        table$ = $('.agenda-table');

        //Get all of the headers that will be affixed
        header$ = $('.agenda-day');
        originalHeader$ = header$.clone();

        //Now nest them, returning the parents
        parent$ = header$.map(nestThem);

        //Now set all the affix parameters
        header$.each(setParameters);

        //Set up 'to top' button
        $('.top-navigation').click(function () {
            window.scrollTo(0, 0);
        });
        appearHeight = $('.anchor').eq(1).offset().top;

        //Set up the url hash location object
        getHashLocations();

        // Toggle More or Less panel descriptions
        $('.more-less').on("hide.bs.collapse", function () {
            $(this).children().children('a[data-toggle]').text('More');
            getHashLocations();
        }).on("show.bs.collapse", function () {
            $(this).children().children('a[data-toggle]').text('Less');
            getHashLocations();
        });

        // Hover effect turning opacity on
        $('.bubble-md, .bubble-sm').mouseover(function () {
            $(this).children().children('div').css('opacity', '0.5');
        }).mouseout(function () {
            $(this).children().children('div').css('opacity', '1');
        });

        $(window).on('resize', function () {
            //return the headers to the start point as far as HTML goes, this is
            // the only way to reset the affix points...
            header$ = parent$.map(resetParents);

            //set the new parameters
            header$.each(setParameters);

            //Reset height at which the 'top' button appears
            appearHeight = $('.anchor').eq(1).offset().top;

            //Set up the url hash location object
            getHashLocations();
        });
    });
}());