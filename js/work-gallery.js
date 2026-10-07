/* js/work-gallery.js
   Modular bracket/border class assignment for the work gallery.

   The gallery uses a CSS variable system where:
     .is-last-in-row  → adds right border (last column in any row)
     .is-last-row     → adds bottom border (cards in the final row)

   When the final row is partial, JS creates phantom divs to fill the
   empty slots. All phantoms share the section background and always have
   top + left + bottom borders. Only the rightmost phantom gets
   .is-last-in-row (adding the right border to close the row).

   To add a card: insert a new .work-card--small article anywhere
   before the closing .work-gallery tag. JS handles everything else.

   Multiple galleries per page: every element with class="work-gallery" is
   updated independently. A gallery with a .work-card--focus child uses the
   homepage's asymmetric focus-card layout; a gallery with only
   .work-card--small children (e.g. a "related work" gallery) uses a plain
   uniform grid — same phantom/border logic, just focusSpan 0.
*/

(function () {

    /* Breakpoint → column count and focus card column span.
       hasFocus=false uses a simpler 3 → 2 → 1 progression (same 768/400
       breakpoints as the focus-card layout, capped at 3 cols instead of 4
       since there's no focus card to fill the extra column at 1280+). */
    function getLayout(hasFocus) {
        var w = window.innerWidth;
        if (hasFocus) {
            if (w >= 1280) return { cols: 4, focusSpan: 2 };
            if (w >= 960)  return { cols: 3, focusSpan: 2 };
            if (w >= 768)  return { cols: 3, focusSpan: 3 };
            if (w >= 400)  return { cols: 2, focusSpan: 2 };
            return              { cols: 1, focusSpan: 1 };
        }
        if (w >= 768) return { cols: 3, focusSpan: 0 };
        if (w >= 400) return { cols: 2, focusSpan: 0 };
        return              { cols: 1, focusSpan: 0 };
    }

    /* Create a single phantom element */
    function makePhantom(col, row, isLast) {
        var el = document.createElement('div');
        el.className = 'work-card--phantom';
        el.setAttribute('aria-hidden', 'true');
        el.style.gridColumn = String(col);
        el.style.gridRow    = String(row);
        if (isLast) el.classList.add('is-last-in-row');
        return el;
    }

    function updateGallery(gallery) {
        var focusCard  = gallery.querySelector('.work-card--focus');
        var smallCards = Array.prototype.slice.call(
            gallery.querySelectorAll('.work-card--small')
        );

        var layout    = getLayout(!!focusCard);
        var cols      = layout.cols;
        var focusSpan = layout.focusSpan;

        /* --- Reset: clear state classes, remove all phantoms --- */
        var allCards = focusCard ? [focusCard].concat(smallCards) : smallCards;
        allCards.forEach(function (card) {
            card.classList.remove('is-last-in-row', 'is-last-row');
        });
        Array.prototype.slice.call(
            gallery.querySelectorAll('.work-card--phantom')
        ).forEach(function (p) { p.remove(); });

        var n = smallCards.length;

        /* Focus card: last-in-row when it spans the full grid width */
        if (focusCard && focusSpan >= cols) focusCard.classList.add('is-last-in-row');

        if (n === 0) {
            /* Focus is the only card — it is also the last row */
            if (focusCard) focusCard.classList.add('is-last-row');
            return;
        }

        /*
          Calculate [row, col] for each small card.
          Row 1 has (cols − focusSpan) slots after the focus card.
          Rows 2+ each have (cols) slots. With no focus card, focusSpan is 0,
          so row 1 simply starts filling from column 1 like any other row.
        */
        var row1Slots = cols - focusSpan;

        var positions = smallCards.map(function (_, i) {
            if (i < row1Slots) {
                return [1, focusSpan + 1 + i];
            }
            var j = i - row1Slots;
            return [2 + Math.floor(j / cols), 1 + (j % cols)];
        });

        var lastPos     = positions[n - 1];
        var lastRow     = lastPos[0];
        var lastCol     = lastPos[1];
        var numPhantoms = cols - lastCol; /* 0 = row is full, no phantoms needed */

        /* --- Assign state classes to small cards --- */
        smallCards.forEach(function (card, i) {
            var row = positions[i][0];
            var col = positions[i][1];
            if (row === lastRow) card.classList.add('is-last-row');
            if (col === cols)    card.classList.add('is-last-in-row');
        });

        /* --- Create phantoms to fill partial last row --- */
        for (var p = 0; p < numPhantoms; p++) {
            var col     = lastCol + 1 + p;
            var isLast  = (p === numPhantoms - 1);
            gallery.appendChild(makePhantom(col, lastRow, isLast));
        }
    }

    function update() {
        Array.prototype.slice.call(
            document.querySelectorAll('.work-gallery')
        ).forEach(updateGallery);
    }

    /* Debounced resize handler */
    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(update, 50);
    });

    /* Run on DOM ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }

}());
