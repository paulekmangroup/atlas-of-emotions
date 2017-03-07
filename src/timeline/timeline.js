//work around safari missing children property in svg nodes
function getChildren( element ) {
    var svgChildren = element.children || element.childNodes;
    var children = [];
    for ( var i = 0; i < svgChildren.length; i++ ) {
        if ( svgChildren[ i ].nodeType == Node.TEXT_NODE || svgChildren[ i ].nodeType == Node.COMMENT_NODE ) continue;
        children.push( svgChildren[ i ] );
    }
    return children;
}

function addFonts( svgDoc ) {
    var fontCss = "@import url('https://fonts.googleapis.com/css?family=Raleway');",
        style = document.createElement( 'style' );

    style.type = 'text/css';

    if ( style.styleSheet ) {
        style.styleSheet.cssText = fontCss;
    } else {
        style.appendChild( document.createTextNode( fontCss ) );
    }

    svgDoc.getElementsByTagName( 'defs' )[ 0 ].appendChild( style );
}

function select( selector, parent ) {
    return parent.querySelector( selector );
}

function selectAll( selector, parent ) {
    return parent.querySelectorAll( selector );
}


function extractDocument( svgDoc, object ) {

    var NS = "http://www.w3.org/2000/svg";

    // pull svg element out of the document and make it self center so that
    // illumination can be animated across it
    var svgElement = svgDoc.getElementsByTagName( 'svg' )[ 0 ];

    var originalWidth = svgElement.getAttribute( "width" ),
        originalHeight = svgElement.getAttribute( 'height' ),
        originalViewBox = svgElement.getAttribute( 'viewBox' );
    svgElement.setAttribute( 'overflow', 'visible' );
    svgElement.setAttribute( 'width', '100%' );
    svgElement.setAttribute( 'height', '100%' );
    svgElement.removeAttribute( 'viewBox' );
    svgElement.setAttribute( 'preserveAspectRatio', 'none' );
    var svgChildrenGroup = svgDoc.getElementsByTagName( 'g' )[ 0 ];

    var wrapperSVG = document.createElementNS( NS, 'svg' );
    wrapperSVG.setAttribute( 'x', '50%' );
    wrapperSVG.setAttribute( 'y', '50%' );
    wrapperSVG.setAttribute( 'width', originalWidth );
    wrapperSVG.setAttribute( 'height', originalHeight );
    wrapperSVG.removeAttribute( 'viewBox' );
    wrapperSVG.setAttribute( 'overflow', 'visible' );
    wrapperSVG.appendChild( svgChildrenGroup );

    var wrapperGroup = document.createElementNS( NS, 'g' );
    wrapperGroup.setAttribute( 'transform', 'translate(' + (-0.5 * parseInt( originalWidth )) + ', ' + (-0.5 * parseInt( originalHeight )) + ')' );
    wrapperGroup.appendChild( wrapperSVG );

    svgElement.appendChild( wrapperGroup );

    var newParentDiv = document.createElement( 'div' );
    newParentDiv.classList.add( 'episode-parent' );
    newParentDiv.appendChild( svgElement );
    object.parentNode.appendChild( newParentDiv );
    object.remove();

    return newParentDiv;

}

/**
 *
 * Initialize
 *
 **/



var configsByEmotion = {
    'anger': {
        colorPalette: [
            [ 204, 28, 23 ],
            [ 208, 46, 53 ],
            [ 212, 65, 63 ],
            [ 216, 83, 73 ],
            [ 220, 102, 83 ],
            [ 224, 120, 92 ],
            [ 228, 135, 102 ]
        ]
    },
    'disgust': {
        colorPalette: [
            [ 0, 104, 55 ],
            [ 0, 110, 57 ],
            [ 0, 116, 59 ],
            [ 0, 122, 61 ],
            [ 0, 128, 63 ],
            [ 0, 130, 65 ],
            [ 0, 136, 67 ],
            [ 0, 142, 69 ]
        ]
    },
    'enjoyment': {
        colorPalette: [
            [ 248, 136, 29 ],
            [ 243, 143, 30 ],
            [ 243, 136, 33 ],
            [ 244, 149, 36 ],
            [ 244, 153, 40 ],
            [ 245, 156, 43 ],
            [ 245, 159, 46 ],
            [ 246, 162, 49 ],
            [ 247, 169, 56 ],
            [ 246, 166, 53 ],
            [ 247, 172, 59 ]
        ]
    },
    'fear': {
        colorPalette: [
            [ 143, 39, 139 ],
            [ 156, 41, 153 ],
            [ 196, 49, 194 ],
            [ 209, 51, 207 ],
            [ 223, 53, 221 ],
            [ 235, 56, 234 ],
            [ 248, 58, 248 ]
        ]
    },
    'sadness': {
        colorPalette: [
            [ 65, 74, 161 ],
            [ 54, 104, 178 ],
            [ 49, 124, 189 ],
            [ 44, 139, 200 ],
            [ 51, 158, 211 ],
            [ 85, 172, 217 ],
            [ 146, 198, 229 ],
            [ 174, 209, 234 ],
            [ 195, 218, 238 ]
        ]
    }
};

var episode = null;

var episodeAddAwareness = null;

var resourcesLoaded = 0;
var resourcesCount = 2;
var episodeObject = document.getElementById( 'episode-object' );
var episodeObjectAddAwareness = document.getElementById( 'episode-object--add-awareness' );

var loadInteractions = function () {
    $( '#fullpage' ).fullpage( {
        anchors: [ 'episode-section', 'episode-section--add-awareness' ],
        afterLoad: function ( anchorLink, index ) {
            //console.log( 'loaded ' + anchorLink );
            if ( anchorLink == 'episode-section' && episode == null ) {
                // no awareness version
                setTimeout( function () {
                    episode = new Episode( episodeObject.getSVGDocument(), episodeObject );
                }, 1000 );
            } else if ( anchorLink == 'episode-section--add-awareness' && episodeAddAwareness == null ) {
                // awareness version
                setTimeout( function () {
                    episodeAddAwareness = new EpisodeAddAwareness( episodeObjectAddAwareness.getSVGDocument(), episodeObjectAddAwareness );
                }, 1000 );
            }

        }
    } );
};

var registerResourceLoad = function () {
    resourcesLoaded++;
    //console.log('loaded '+resourcesLoaded);
    if ( resourcesLoaded == resourcesCount ) {
        loadInteractions();
    }
}

if( episodeObject.getSVGDocument() == null){

    episodeObject.addEventListener( 'load', function () {
        //episode = new Episode( episodeObject.getSVGDocument(), episodeObject );
        registerResourceLoad();
    } );

}else{
    registerResourceLoad();
}

if( episodeObjectAddAwareness.getSVGDocument() == null) {

    episodeObjectAddAwareness.addEventListener( 'load', function () {
        //episodeAddAwareness = new EpisodeAddAwareness( episodeObjectAddAwareness.getSVGDocument(), episodeObjectAddAwareness );
        registerResourceLoad();
    } );

}else{
    registerResourceLoad();
}
