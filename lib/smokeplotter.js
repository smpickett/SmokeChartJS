/**
 * This library will allow the user to plot a 'SmokeChart' onto a html5 canvas element.
 * See the examples in '\examples' on how to use the object
 */
var SmokeChart = (function () {
    /**
     * Initializes a new SmokeChart object
     */
    function SmokeChart() {
        // Variables-Private
        this._canvas = null;
        this._chartBox = null;
        this._ylabelBox = null;
        this._xlabelBox = null;
    }

    SmokeChart.prototype = {
        // Variables-Public
        XGridLinesEnabled: true,
        YGridLinesEnabled: true,
        YAverageEnabled: true,
        XLabels: new Array(),
        YInterval: -1.0,
        XLegendEnabled: true,
        YLegendEnabled: true,
        YLegendUnit: "",
        Data: new Array(),
        Bounds: null,
        Parent: null,
        Width: 0,
        Height: 0,

        /**
         * Draws the entire smoke chart.
         * This should be called after all settings are configured.
         */
        Draw: function () {
            if (this._canvas != null)
                this.Parent.removeChild(this._canvas);

            this._canvas = document.createElement('canvas');
            this._canvas.width = this.Width;
            this._canvas.height = this.Height;

            // Setup the bounds
            CalculateBoxes.call(this);

            // Plot the YStuff
            DrawY.call(this);

            // Plot the XStuff
            DrawX.call(this);

            // Plot the data
            DrawData.call(this);

            // add the chart
            this.Parent.appendChild(this._canvas);
        }
    }

    /**
     * Calculates the bounding boxes for the chart, before drawing.
     * This should be called before any 'draw' command
     */
    function CalculateBoxes() {
        this._chartBox = new SmokeChartBoundingBox(0, 0, this._canvas.width, this._canvas.height);
        this._ylabelBox = new SmokeChartBoundingBox(0, 0, 0, this._canvas.height);
        this._xlabelBox = new SmokeChartBoundingBox(0, this._canvas.height, this._canvas.width, 0);

        // Define the Ylegend box
        if (this.YLegendEnabled) {
            var maxTextWidth = 0;
            var ylabel = new SmokeChartYLabel(this._canvas, this.Bounds, this._ylabelBox);
            for (var yline = this.Bounds.YMin; yline < this.Bounds.YMax; yline += this.YInterval) {
                var text = yline.toString() + this.YLegendUnit;
                if (ylabel.Width(text) > maxTextWidth)
                    maxTextWidth = ylabel.Width(text);
            }

            this._ylabelBox = new SmokeChartBoundingBox(this._ylabelBox.x, this._ylabelBox.y, maxTextWidth, this._ylabelBox.height);
            this._xlabelBox = new SmokeChartBoundingBox(maxTextWidth, this._xlabelBox.y, this._xlabelBox.width - maxTextWidth, this._xlabelBox.height);
            this._chartBox = new SmokeChartBoundingBox(maxTextWidth, this._chartBox.y, this._chartBox.width - maxTextWidth, this._chartBox.height);
        }

        // Define the Xlegend box
        if (this.XLegendEnabled) {
            var maxTextHeight = 0;
            for (var i = 0; i < this.XLabels.length; i++) {
                var xlabel = new SmokeChartXLabel(this._canvas, this.Bounds, this._xlabelBox);
                if (xlabel.Height(this.XLabels[i].toString()) > maxTextHeight)
                    maxTextHeight = xlabel.Height(this.XLabels[i].toString());
            }

            this._xlabelBox = new SmokeChartBoundingBox(this._xlabelBox.x, this._xlabelBox.y - maxTextHeight, this._xlabelBox.width, maxTextHeight);
            this._ylabelBox = new SmokeChartBoundingBox(this._ylabelBox.x, maxTextHeight, this._ylabelBox.width, this._ylabelBox.height - maxTextHeight);
            this._chartBox = new SmokeChartBoundingBox(this._chartBox.x, maxTextHeight, this._chartBox.width, this._chartBox.height - maxTextHeight);
        }
    }

    /**
     * Will plot the X legend, X labels, and vertical gridlines
     */
    function DrawX() {
        // Plot the text
        if (this.XLegendEnabled) {
            var xlabel = new SmokeChartXLabel(this._canvas, this.Bounds, this._xlabelBox);
            for (var i = 0; i < this.XLabels.length; i++) {
                xlabel.Draw(i + 1, this.XLabels[i].toString());
            }
        }
    }

    /**
     * Will plot the Y legend, Y labels, and horizontal gridlines
     */
    function DrawY() {
        if (this.YInterval < 0) {
            this.YInterval = this.Bounds.YRange / 10.0;
        }

        // Plot the text
        if (this.YLegendEnabled) {
            var ylabel = new SmokeChartYLabel(this._canvas, this.Bounds, this._ylabelBox);
            for (var yline = this.Bounds.YMin; yline < this.Bounds.YMax; yline += this.YInterval) {
                var text = yline.toString() + this.YLegendUnit;
                ylabel.Draw(yline, text);
            }
        }

        // Plot the gridlines
        if (this.YGridLinesEnabled) {
            var gridline = new SmokeChartLineHoriz(this._canvas, this.Bounds, this._chartBox);
            for (var yline = this.Bounds.YMin; yline < this.Bounds.YMax; yline += this.YInterval) {
                gridline.Draw(yline);
            }
        }
    }

    /**
     * Plot the data onto the chart
     */
    function DrawData() {
        var valueAverage = new SmokeChartValueLine(this._canvas, this.Bounds, this._chartBox);
        var valueBox = new SmokeChartValueBox(this._canvas, this.Bounds, this._chartBox);

        for (var i = 1; i < this.Data.length; i++) {
            valueBox.Draw(this.Data[i][1], this.Data[i][2], this.Data[i][0]);

            if (this.YAverageEnabled)
                valueAverage.Draw(this.Data[i][2], this.Data[i][0]);
        }
    }

    return SmokeChart;
})();

var SmokeChartValueLine = (function () {
    /**
     * Initializes a new instance of the SmokeChartValueLine class
     * @param {} canvas - The html5 canvas element to draw on
     * @param {} bounds - The graph bounds (x/y scales)
     * @param {} box - The drawing boundry box, pixel based
     */
    function SmokeChartValueLine(canvas, bounds, box) {
        this._canvas = canvas;
        this._bounds = bounds;
        this._box = box;
    }

    SmokeChartValueLine.prototype = {
        // Public Variables
        style: "rgba(0, 200, 50, 1.0)",
        lineWidth: 1,

        /**
         * Draws a smoke line at the specified X/Y value
         * @param {} yValue - The y-value to draw the line at
         * @param {} xIndex - The x-index to draw the line at
         */
        Draw: function (yValue, xIndex) {
            // calculate the bounds of the line
            var widthPixel = this._box.width / this._bounds.XRange;
            var leftPixel = this._box.left + (xIndex - this._bounds.XMin) * widthPixel;
            var rightPixel = this._box.left + (xIndex - this._bounds.XMin + 1) * widthPixel;
            var heightPixel = this._box.height - (((yValue - this._bounds.YMin) / this._bounds.YRange) * this._box.height);

            // force the heightPixel to be 0.5, to get a crisp line on the canvas
            var heightPixel = Math.round(heightPixel) + 0.5;

            // draw the line
            var content = this._canvas.getContext("2d");
            content.beginPath();
            content.moveTo(leftPixel, heightPixel);
            content.lineTo(rightPixel, heightPixel);
            content.lineWidth = this.lineWidth;
            content.strokeStyle = this.style;
            content.stroke();
        }
    }

    return SmokeChartValueLine;
})();

var SmokeChartBoundingBox = (function() {
    /**
     * Initializes a new instance of the SmokeChartBoundingBox class
     * @param {} x - The x coordinate of the bounding box
     * @param {} y - The y coordinate of the bounding box
     * @param {} width - The width of the bounding box
     * @param {} height - The height of the bounding box
     */
    function SmokeChartBoundingBox(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    SmokeChartBoundingBox.prototype = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,

        get top() { return this.y; },
        get bottom() { return this.y + this.height; },
        get left() { return this.x; },
        get right() { return this.x + this.width; }
    }

    return SmokeChartBoundingBox;
})();

var SmokeChartLineHoriz = (function () {
    /**
     * Initializes a new instance of the SmokeChartLineHoriz class
     * @param {} canvas - The html5 canvas element to draw on
     * @param {} bounds - The graph bounds (x/y scales)
     * @param {} box - The drawing boundry box, pixel based
     */
    function SmokeChartLineHoriz(canvas, bounds, box) {
        this._canvas = canvas;
        this._bounds = bounds;
        this._box = box;
    }

    SmokeChartLineHoriz.prototype = {
        // Public Variables
        style: "rgba(10, 10, 10, 0.15)",
        lineWidth: 1,

        /**
         * Draws a gridline specified Y value
         * @param {} yValue - The y-value to draw the line at
         */
        Draw: function (yvalue) {
            // calculate the bounds of the line
            var heightPixel = this._box.height - (((yvalue - this._bounds.YMin) / this._bounds.YRange) * this._box.height);

            // force the heightPixel to be 0.5, to get a crisp line
            var heightPixel = Math.round(heightPixel) + 0.5;

            // draw the line
            var content = this._canvas.getContext("2d");
            content.beginPath();
            content.moveTo(this._box.x, heightPixel);
            content.lineTo(this._box.x + this._box.width, heightPixel);
            content.lineWidth = this.lineWidth;
            content.strokeStyle = this.style;
            content.stroke();
        }
    }

    return SmokeChartLineHoriz;
})();

var SmokeChartYLabel = (function() {
    /**
     * Initializes a new instance of the SmokeChartLineHoriz class
     * @param {} canvas - The html5 canvas element to draw on
     * @param {} bounds - The graph bounds (x/y scales)
     * @param {} box - The drawing boundry box, pixel based
     */
    function SmokeChartYLabel(canvas, bounds, box) {
        this._canvas = canvas;
        this._bounds = bounds;
        this._box = box;
    }

    SmokeChartYLabel.prototype = {
        font: "12px sans-serif",

        /**
         * Draws a label at the specified Y value
         * @param {} yValue - The y-value to draw the text at
         * @param {} text - The text to draw
         */
        Draw: function (yValue, text) {
            var heightPixel = this._box.height - (((yValue - this._bounds.YMin) / this._bounds.YRange) * this._box.height);

            var content = this._canvas.getContext("2d");
            content.font = this.font;
            content.textBaseline = 'middle';
            content.fillText(text, this._box.left, heightPixel);
        },

        /**
         * Gets the width of the text
         * @param {} text - The text to get the width of
         */
        Width: function (text) {
            var content = this._canvas.getContext("2d");
            content.font = this.font;
            return content.measureText(this.Text).width;
        }
    }

    return SmokeChartYLabel;

})();

var SmokeChartXLabel = (function() {
    /**
     * Initializes a new instance of the class
     * @param {} canvas - The html5 canvas element to draw on
     * @param {} bounds - The graph bounds (x/y scales)
     * @param {} box - The drawing boundry box, pixel based
     */
    function SmokeChartXLabel(canvas, bounds, box) {
        this._canvas = canvas;
        this._bounds = bounds;
        this._box = box;
    }

    SmokeChartXLabel.prototype = {
        font: "12px sans-serif",

        /**
         * Draws a label at the specified X value
         * @param {} xIndex - The x-value to draw the text at
         * @param {} text - The text to draw
         */
        Draw: function (xIndex, text) {
            var widthPixel = this._box.width / this._bounds.XRange;
            var leftPixel = this._box.left + (xIndex - this._bounds.XMin) * widthPixel;
            var rightPixel = this._box.left + (xIndex - this._bounds.XMin + 1) * widthPixel;

            var content = this._canvas.getContext("2d");
            content.font = this.font;
            content.textAlign = 'center';
            content.textBaseline = 'bottom';
            content.fillText(text, (leftPixel + rightPixel) / 2, this._box.bottom);
        },

        Height: function (canvas) {
            return 12 + 2;
        }
    }

    return SmokeChartXLabel;

})();

var SmokeChartValueBox = (function() {
    /**
     * Initializes a new instance of the class
     * @param {} canvas - The html5 canvas element to draw on
     * @param {} bounds - The graph bounds (x/y scales)
     * @param {} box - The drawing boundry box, pixel based
     */
    function SmokeChartValueBox(canvas, bounds, box) {
        this._canvas = canvas;
        this._bounds = bounds;
        this._box = box;
    }

    SmokeChartValueBox.prototype = {
        fillStyle: "rgba(10, 10, 10, 0.1)",

        /**
         * Draws a value box at the coordinates specified
         * @param {} xIndex - The x-value to draw the box at
         * @param {} lower - The lower value to start the box
         * @param {} upper - The upper value to start the box
         */
        Draw: function(lower, upper, xIndex) {
            var widthPixel = this._box.width / this._bounds.XRange;
            var heightPixels = this._box.height / this._bounds.YRange;
            var leftPixel = this._box.left + (xIndex - this._bounds.XMin) * widthPixel;
            var rightPixel = this._box.left + (xIndex - this._bounds.XMin + 1) * widthPixel;
            var upperPixel = this._box.height - (((upper - this._bounds.YMin) / this._bounds.YRange) * this._box.height);
            var lowerPixel = this._box.height - (((lower - this._bounds.YMin) / this._bounds.YRange) * this._box.height);

            var content = this._canvas.getContext("2d");

            var gradFill = content.createLinearGradient(leftPixel, upperPixel, leftPixel, lowerPixel);
            gradFill.addColorStop(0.0, "rgba(40, 40, 40, 0.5)");
            gradFill.addColorStop(0.5, "rgba(40, 40, 40, 0.3)");
            gradFill.addColorStop(1.0, "rgba(40, 40, 40, 0.00)");

            content.fillStyle = gradFill;
            content.fillRect(leftPixel, lowerPixel, rightPixel - leftPixel, upperPixel - lowerPixel);
        }
    }

    return SmokeChartValueBox;
})();

var SmokeChartBounds = (function() {
    /**
     * Initializes a new instance of the class
     * @param {} xmin - the lowest x value 
     * @param {} xmax - the largest x value
     * @param {} ymin - the lowest y value
     * @param {} ymax - the largest y value
     */
    function SmokeChartBounds(xmin, xmax, ymin, ymax) {
        this.XMin = Math.max(xmin, 0);
        this.XMax = Math.max(xmax, 0);
        this.YMin = Math.max(ymin, 0);
        this.YMax = Math.max(ymax, 0);
    }

    SmokeChartBounds.prototype = {
        XMin: 0,
        XMax: 0,
        YMin: 0,
        YMax: 0,

        get YRange() { return Math.abs(this.YMax - this.YMin) + 1; },
        get XRange() { return Math.abs(this.XMax - this.XMin) + 1; }
    }

    return SmokeChartBounds;
})();

