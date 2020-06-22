import * as d3 from "d3";
import axios from "axios";

class DescriptiveStatistics {

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
        return await this.getClient().get("/onlinesInfo").then(res => res.data);
    }

    public processData(data) {
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
            let sValue = String(value);

            // 如果值是一个小数，那么为了便于展示，仅取到小数点后两位.
            if (value - Math.floor(value) > 0) {
                let integerPart = sValue.slice(0, sValue.indexOf("."));
                let mantissaPart = sValue.slice(sValue.indexOf(".")+1, sValue.length-1);

                if (mantissaPart.length == 1) {
                    mantissaPart = mantissaPart[0] + "0";
                }

                mantissaPart = mantissaPart[0] + mantissaPart[1];

                terminalNodeList[i].value = integerPart + "." + mantissaPart;

                // 如果值是一个小数而且还小于或等于0.01，那么还要在前面加上「小于等于号」
                if (value <= 0.01) {
                    terminalNodeList[i].value = "<=0.01"
                }
            }
            else {
                terminalNodeList[i].value = sValue;
            }
        }

        return terminalNodeList;
    }

    public setData(data) {
        for (let item of data) {
            let domElement = document.getElementById(item);
            if (domElement !== null) {
                domElement.textContent = item.value;
            }
        }
    }

    public async syncData() {
        let data = await this.getData().catch(e => console.log(e));
        let processed = this.processData(data);
        this.setData(processed);

        let descriptionElement = document.getElementById("description");
        let justNow = new Date();
        let dateStr = justNow.toDateString();
        descriptionElement.textContent = `这份报告生成于${dateStr}．`;
    }
}

async function test() {
    let d = new DescriptiveStatistics();
    let data = await d.getData();
    let processedData = d.processData(data);
    console.log(processedData);
}

test();