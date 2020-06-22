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

    private async getData() {
        return await this.getClient().get("/onlinesInfo").then(r => r.data);
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
            // console.log(`value: ${value}`);
            // console.log(`value less than point 1: ${value<=0.01}`);
            // console.log(`trunc: ${Math.trunc(value)}`);
            // console.log(`minus: ${value-Math.trunc(value)}`);
            // console.log(`greater than 0: ${value-Math.trunc(value)>0}`);
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
        let justNow = new Date();
        let dateStr = justNow.toISOString();
        descriptionElement.textContent = `这份报告生成于${dateStr}．`;
    }
}

let d = new DescriptiveStatistics();
window.addEventListener('load', event => d.syncData());
