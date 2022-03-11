const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { exit } = require('process');

const [url, file] = process.argv.slice(2);

if (!url) {
    throw 'Please provide a URL as the first argument.';
}

async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('.easy-card-list');

    const boardTitle = await page.$eval('.board-name', (node) => node.innerText.trim());
    let boardTitle2 = boardTitle.split(" ").join("");
    console.log(boardTitle2);

    if (!boardTitle) {
        throw 'Board title does not exist. Please check if provided URL is correct.'
    }

    let parsedText = boardTitle + '\n\n';

    const columns = await page.$$('.easy-card-list');

    const obj = [];

    for (let i = 0; i < columns.length; i++) {
        let columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());
        console.log(columnTitle)
        if(columnTitle == "Start"){
            columnTitle = "Column 1";
        }
        if(columnTitle == "Stop"){
            columnTitle = "Column 2";
        }
        if(columnTitle == "Continue"){
            columnTitle = "Column 3";
        }

        const messages = await columns[i].$$('.easy-board-front');
        if (messages.length) {
            parsedText += columnTitle + '\n';
        }
        for (let i = 0; i < messages.length; i++) {
            const messageText = await messages[i].$eval('.easy-card-main .easy-card-main-content .text', (node) => node.innerText.trim());
            const votes = await messages[i].$eval('.easy-card-votes-container .easy-badge-votes', (node) => node.innerText.trim());

            if(votes >= 1){
                obj.push({
                    "column":  columnTitle,
                    "message": messageText,
                    "vote": votes
                })
            }
            parsedText += `- ${messageText} (${votes})` + '\n';
        }

        if (messages.length) {
            parsedText += '\n';
        }
    }

    console.log("Object: ", obj);
    
    // CSV format
    const result = [Object.keys(obj[0]), ...Object.values(obj).map(i=>Object.values(i))].reduce((string, item)=>{
        string += item.join(",") + "\n"
        return string;
    }, "");
    console.log(result)

    // export "result" as CSV file
    const resolvedPath = path.resolve(`./${boardTitle2}.csv`);
    fs.writeFile(resolvedPath, result, (err)=>{
        if(err) {
            throw err;
        }
        else {
            console.log("CSV File Exported.");
        }
    })

    /*

    Plan is to convert this array of objects into CSV format

    Object:  [
        {
            column: 'Column 1',
            message: 'Mario - Hire our next team member based on an excellent interview and completion of the technical challenge.',
            vote: '2'
        },
        {
            column: 'Column 1',
            message: 'Mario - Telling the engineering manager as soon as you realize a story will not be finished by the end of the sprint.',
            vote: '1'
        },
        {
            column: 'Column 3',
            message: 'Tony - Conducting a survey of the team about each new hire around their 30th day.',
            vote: '1'
        },
        {
            column: 'Column 3',
            message: 'Spyro - Emphasizing to new hires how we use Slack by referring to our very short document in Confluence.',
            vote: '2'
        }
    ]
    */

    return parsedText;
}

function writeToFile(filePath, data) {
    fileName = data.split('\n')[0]
    newFilename = fileName.split(" ").join("")

    const resolvedPath = path.resolve(filePath || `../${newFilename}.txt`);
    fs.writeFile(resolvedPath, data, (error) => {
        if (error) {
            throw error;
        } else {
            console.log(`Successfully written to file at: ${resolvedPath}`);
        }
        process.exit();
    });
}

function handleError(error) {
    console.error(error);
}

run().then((data) => writeToFile(file, data)).catch(handleError);