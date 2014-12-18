(function ($, NGC) {

    $.extend(NGC.viewmodel, {
    });

    $.extend(NGC.view, {
    });

    $.extend(NGC.map, {
        lockHistory: false,
        extentHistory: [],
        extentHistoryPointer: -1,


        initHistoryModule: function () {
            this.bindEvents();
            this.pushCurrentExtent();
        },


        bindEvents: function () {
            var context = this;

            NGC.view.$map.keydown(function (event) {
                if (event.keyCode === 80) { // english letter 'p'
                    context.backwardExtentHistory();
                }
                if (event.keyCode === 78) { // english letter 'n'
                    context.forwardExtentHistory();
                }
            });
        },


        pushCurrentExtent: function () {
            var newExtent = [NGC.viewmodel.map.getCenter(), NGC.viewmodel.map.getZoom()];

            if (this.extentHistoryPointer >= 0 &&
                    this.extentHistory[this.extentHistoryPointer][0].lat === newExtent[0].lat &&
                    this.extentHistory[this.extentHistoryPointer][0].lng === newExtent[0].lng &&
                    this.extentHistory[this.extentHistoryPointer][1] === newExtent[1]) {
                return false;
            }

            while (this.extentHistory.length - 1 > this.extentHistoryPointer) {
                this.extentHistory.pop();
            }

            this.extentHistory.push(newExtent);
            this.extentHistoryPointer++;
        },


        backwardExtentHistory: function () {
            var prevExtent;

            if (this.extentHistoryPointer > 0) {
                this.extentHistoryPointer -= 1;
                prevExtent = this.extentHistory[this.extentHistoryPointer];
                this.lockHistory = true;
                NGC.viewmodel.map.setView(prevExtent[0], prevExtent[1]);
                this.lockHistory = false;
            }
        },


        forwardExtentHistory: function () {
            var nextExtent;

            if (this.extentHistoryPointer + 1 < this.extentHistory.length) {
                this.extentHistoryPointer += 1;
                nextExtent = this.extentHistory[this.extentHistoryPointer];
                this.lockHistory = true;
                NGC.viewmodel.map.setView(nextExtent[0], nextExtent[1]);
                this.lockHistory = false;
            }
        }
    });
})(jQuery, NGC);

