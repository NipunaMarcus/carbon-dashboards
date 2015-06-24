var datasource,type, columns,filter,maxUpdateValue;

var REFRESH_INTERVAL = 5000;

//this needs to be loaded from an autogenerated
datasource = gadgetConfig.datasource;
filter = gadgetConfig.filter;
type = gadgetConfig.type;
var counter = 0;
maxUpdateValue = gadgetConfig.maxUpdateValue;

//if gadget type is realtime, treat it different!
if(type === "realtime") {
    columns = gadgetConfig.columns;
    //subscribe to websocket
    subscribe(datasource.split(":")[0], datasource.split(":")[1], '10', 'carbon.super',
        onRealTimeEventSuccessRecieval, onRealTimeEventErrorRecieval, 'localhost', '9443', 'WEBSOCKET', "SECURED");
} else {
    //first, fetch datasource schema
    getColumns(datasource);

    //load data immediately
    fetchData(drawChart);

    // then start periodic polling
    setInterval(function() {
        fetchData(drawChart);
    },REFRESH_INTERVAL);
}

function getColumns(table) {
    console.log("Fetching table schema for table: " + table);
    var url = "/portal/apis/analytics?type=10&tableName=" + table;
    $.getJSON(url, function(data) {
        if (data) {
            columns = parseColumns(JSON.parse(data.message));
        }

    });
};

function parseColumns(data) {
    if (data.columns) {
        var keys = Object.getOwnPropertyNames(data.columns);
        var columns = keys.map(function(key, i) {
            return column = {
                name: key,
                type: data.columns[key].type
            };
        });
        return columns;
    }
};

function fetchData(callback) {
    var timeFrom = new Date("1970-01-01").getTime();
    var timeTo = new Date().getTime();
    var request = {
        type: 8,
        tableName: datasource,
        filter:filter,
        timeFrom: timeFrom,
        timeTo: timeTo,
        start: 0,
        count: 10
    };
    $.ajax({
        url: "/portal/apis/analytics",
        method: "GET",
        data: request,
        contentType: "application/json",
        success: function(data) {
            if (callback != null) {
                callback(makeRows(JSON.parse(data.message)));
            }
        }
    });
};

function makeDataTable(data) {
    var dataTable = new igviz.DataTable();
    if (columns.length > 0) {
        columns.forEach(function(column, i) {
            var type = "N";
            if (column.type == "STRING" || column.type == "string") {
                type = "C";
            }
            dataTable.addColumn(column.name, type);
        });
    }
    data.forEach(function(row, index) {
        for (var i = 0; i < row.length; i++) {
            if (dataTable.metadata.types[i] == "N") {
                data[index][i] = parseInt(data[index][i]);
            }
        }
    });
    dataTable.addRows(data);
    return dataTable;
};

function makeRows(data) {
    var rows = [];
    for (var i = 0; i < data.length; i++) {
        var record = data[i];
        var keys = Object.getOwnPropertyNames(record.values);
        var row = columns.map(function(column, i) {
            return record.values[column.name];
        });
        rows.push(row);
    };
    return rows;
};

function drawChart(data) {
    var dataTable = makeDataTable(data);
    gadgetConfig.chartConfig.width = $("#placeholder").width();
    gadgetConfig.chartConfig.height = $("#placeholder").height() - 65;
    var chartType = gadgetConfig.chartConfig.chartType;
    var xAxis = gadgetConfig.chartConfig.xAxis;

    if (chartType === "bar" && dataTable.metadata.types[xAxis] === "N") {
        dataTable.metadata.types[xAxis] = "C";
    }

    if(gadgetConfig.chartConfig.chartType==="table" || gadgetConfig.chartConfig.chartType==="singleNumber") {
        gadgetConfig.chartConfig.height = $("#placeholder").height();
        var chart = igviz.draw("#placeholder", gadgetConfig.chartConfig, dataTable);
        chart.plot(dataTable.data);

    } else {
        var chart = igviz.setUp("#placeholder", gadgetConfig.chartConfig, dataTable);
        chart.setXAxis({
            "labelAngle": -35,
            "labelAlign": "right",
            "labelDy": 0,
            "labelDx": 0,
            "titleDy": 25
        })
            .setYAxis({
                "titleDy": -30
            })
        chart.plot(dataTable.data);
    }
};


//stuff required for realtime charting
function onRealTimeEventSuccessRecieval(streamId, data) {
    drawRealtimeChart(data);
};

function onRealTimeEventErrorRecieval(dataError) {
    console.log("Error occurred " + dataError);
};

var dataTable;
var chart;

function drawRealtimeChart(data) {
    var chartType = gadgetConfig.chartConfig.chartType;

    if (chartType == "map") {
        gadgetConfig.chartConfig.width = $("#placeholder").width();
        gadgetConfig.chartConfig.height = $("#placeholder").height() + 20;

        if (counter == 0) {
            dataTable = makeDataTable(data);
            chart = igviz.draw("#placeholder", gadgetConfig.chartConfig, dataTable);
            chart.plot(dataTable.data,null,maxUpdateValue);
            counter++;
        } else {
            chart.update(data);
        }

    } else if(gadgetConfig.chartConfig.chartType === "arc") {
        gadgetConfig.chartConfig.height = $("#placeholder").height();
        igviz.draw("#placeHolder",gadgetConfig.chartConfig,createDataTable(data));
    } else {
        dataTable = makeDataTable(data);
        gadgetConfig.chartConfig.width = $("#placeholder").width();
        gadgetConfig.chartConfig.height = $("#placeholder").height() - 65;
        var xAxis = gadgetConfig.chartConfig.xAxis;

        if (chartType === "bar" && dataTable.metadata.types[xAxis] === "N") {
            dataTable.metadata.types[xAxis] = "C";
        }

        if(gadgetConfig.chartConfig.chartType === "table" || gadgetConfig.chartConfig.chartType==="singleNumber") {

            gadgetConfig.chartConfig.height = $("#placeholder").height();
            if (counter == 0) {
                dataTable = makeDataTable(data);
                chart = igviz.draw("#placeholder", gadgetConfig.chartConfig, dataTable);
                chart.plot(dataTable.data,null,maxUpdateValue);
                counter++;
            } else {
                chart.update(data);
            }
        } else {

            if (counter == 0) {
                chart = igviz.setUp("#placeholder", gadgetConfig.chartConfig, dataTable);
                chart.setXAxis({
                    "labelAngle": -35,
                    "labelAlign": "right",
                    "labelDy": 0,
                    "labelDx": 0,
                    "titleDy": 25
                })
                    .setYAxis({
                        "titleDy": -30
                    })
                chart.plot(dataTable.data, null, maxUpdateValue);
                counter++;
            } else {
                chart.update(dataTable.data[0]);
            }
        }
    }


};