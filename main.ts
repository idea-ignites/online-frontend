import * as d3 from "d3";
import axios from "axios";

let mainCache = undefined;

class Data {

    private baseURL = "https://services.beyondstars.xyz";

    private getClient() {
        return axios.create({
            "baseURL": this.baseURL,
            "headers": {
                "Content-Type": "application/json"
            }
        });
    }

    public async getData() {

        if (mainCache === undefined) {
            mainCache = {
                "fetchedAt": Date.now(),
                "data": await this.getClient().get("/onlinesInfo").then(r => r.data)
            };
        }
        else if ((Date.now() - mainCache.fetchedAt) > 30*1000) {
            mainCache = {
                "fetchedAt": Date.now(),
                "data": await this.getClient().get("/onlinesInfo").then(r => r.data)
            };
        }

        return mainCache.data;
    }

}

class DescriptiveStatistics {

    private async getData() {
        let d = new Data();
        return await d.getData();
    }

    private processData(data) {
        let root = data.data.onlinesStats;
        let treeStack = [{"name": "onlineStats", "pointTo": root}];
        let nameList = [];
        let terminalNodeList = [];

        while (treeStack.length > 0) {
            let currentNode = treeStack.pop();
            nameList.push(currentNode.name);
            
            if (typeof(currentNode.pointTo) === "object") {
                let subTree = currentNode.pointTo;
                for (let entry in subTree) {
                    treeStack.push({
                        "name": currentNode.name + "-" + entry,
                        "pointTo": subTree[entry]
                    });
                }
            }
            else {
                terminalNodeList.push({
                    "name": currentNode.name,
                    "value": currentNode.pointTo
                });
            }
        }

        for (let i in terminalNodeList) {
            terminalNodeList[i].name = "stat-value-" + terminalNodeList[i].name;

            let value = terminalNodeList[i].value;
            // 如果值是一个小数，那么为了便于展示，仅取到小数点后两位.
            // 如果值小于0.01，那么置为<=0.01
            if (value === 0) {
                terminalNodeList[i].value = "0";
            }
            else if (value <= 0.01) {
                terminalNodeList[i].value = "<=0.01";
            }
            else {
                let fValue = value.toFixed(2);
                let sValue = String(fValue);
                if ((sValue[sValue.length-2] + sValue[sValue.length-1]) === "00") {
                    sValue = sValue.slice(0, sValue.length-3);
                }

                terminalNodeList[i].value = sValue;
            }
        }

        return terminalNodeList;
    }

    private setData(data) {
        for (let item of data) {
            let domElement = document.getElementById(item.name);
            // console.log(`element: ${domElement}`);
            if (domElement !== null) {
                domElement.textContent = item.value;
            }
        }
    }

    public async syncData() {
        let data = await this.getData().catch(e => console.log(e));
        // console.log(`got: ${data}`);
        let processed = this.processData(data);
        // console.log(`processed: ${JSON.stringify(processed, null, 4)}`);
        this.setData(processed);

        let descriptionElement = document.getElementById("description");
        let computedAt = new Date(data.computedAt);
        let dateStr = computedAt.toISOString();
        descriptionElement.textContent = `这份报告生成于${dateStr}．`;
    }
}

class TimeSeriesAboutThisMonthEveryDay {

    private async getData() {
        let d = new Data();
        return await d.getData();
    }

    private processData(data) {
        return data.data.timeSeriesStats.thisMonthEveryDay;
    }

    private renderData(processed) {
        let data = processed;

        console.log(data);

        let s = document.getElementById("ts-thisMonthEveryDay");
        let margin = ({top: 30, right: 30, bottom: 30, left: 30})
        let width = s["width"].animVal.value;
        let height = s["height"].animVal.value;

        let x = d3.scaleUtc()
        .domain(d3.extent(data, d => new Date(d["from"])))
        .range([margin.left, width - margin.right])

        let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Number(d["counts"]))])
        .range([height - margin.bottom, margin.top])

        let line = d3.line()
        .x(d => x(d["from"]))
        .y(d => y(d["counts"]))
        .curve(d3.curveCatmullRom.alpha(0.8));

        let svgPath = line(data);

        let axisLeft = d3.axisLeft(y).ticks(5);
        let axisBottom = d3.axisBottom(x).ticks(10);

        d3.selectAll("#ts-thisMonthEveryDay")
        .append("path")
        .attr("d", svgPath)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "2.4");

        d3.selectAll("#ts-thisMonthEveryDay")
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .attr("stroke-width", "2px")
        .call(axisLeft);

        d3.selectAll("#ts-thisMonthEveryDay")
        .append("g")
        .attr("transform", `translate(0,${height-margin.bottom})`)
        .attr("stroke-width", "2px")
        .call(axisBottom);

        let xCoords = data.map(d => x(d["from"]));

        d3.select("#ts-thisMonthEveryDay")
        .append("g")
        .selectAll("div")
        .data(xCoords)
        .enter()
        .append("rect")
        .attr("id", (d, i) => `ts-thisMonthEveryDay-prompt-column-${i}`)
        .attr("y", (d, i) => 0)
        .attr("x", (d, i) => {
            return xCoords[i] - (xCoords[1] - xCoords[0]) / 2;
        })
        .attr("height", height)
        .attr("width", (d, i) => {
            return xCoords[1] - xCoords[0];
        })
        .attr("fill-opacity", "0")
        .on("mouseover", (d, i) => {
            d3.select(`#ts-thisMonthEveryDay-prompt-column-${i}`)
            .attr("fill", "lightblue")
            .attr("fill-opacity", "0.5");

            let from = new Date(data[i].from);
            let to = new Date(data[i].to);
            let counts = data[i].counts;

            // d3.select("#ts-thisMonthEveryDay-prompt").text(`从 ${from.getMonth()}月${from.getDay()}日${from.getHours()}点${from.getMinutes()}分 到 ${to.getMonth()}月${to.getDay()}日${to.getHours()}点${to.getMinutes()}分 期间共有 ${counts} 名独立访客曾到访过我站．`);
            d3.select("#ts-thisMonthEveryDay-prompt").text(`从 ${from.toISOString()} 到 ${to.toISOString()} 期间共有 ${counts} 名独立访客曾经到访过我站．`);
        })
        .on("mouseout", (d, i) => {
            d3.select(`#ts-thisMonthEveryDay-prompt-column-${i}`)
            .attr("fill", "lightblue")
            .attr("fill-opacity", "0");
        });
    }

    public async syncData() {
        let d = await this.getData().catch(console.error);
        let p = this.processData(d);
        this.renderData(p);
    }

}

async function main() {

    let d = new DescriptiveStatistics();
    let t = new TimeSeriesAboutThisMonthEveryDay();

    await d.syncData();
    await t.syncData();

}

window.addEventListener('load', event => main());