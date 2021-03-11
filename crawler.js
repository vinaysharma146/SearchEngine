const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')
const await = require('await')
const fetch = require('node-fetch');

// *****       Mongo Files **********
const mongoose = require('mongoose');
const { exit } = require('process');
const { log } = require('console');


var mongoDB = 'mongodb://localhost/search_engine';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('error', (err) => {
    console.log("DB Connection Error");
});

mongoose.connection.on('connected', (err) => {
    console.log("DB connected Successfully");
});

var Schema = mongoose.Schema;

var url_schema = Schema({
    level: Number,
    url_list: [String],
    completed: Number
});

var urlDetails = mongoose.model("url_details", url_schema, "url_details");

// *********************************

// *****       Base URL  **********

const baseUrl = ['https://www.chitkara.edu.in/']

// *********************************


exclude = [".ico", ".jpg", ".png", ".css", ".js", ".xml", ".php",'oembed','/feed','?p=']

async function checkLink(url) {
    for (x in exclude) {
        if (url.includes(exclude[x]))
            return false
    }
    if (!url.includes(baseUrl[0]))
        return false

    const query = urlDetails.find({url_list:url})
    const result = await query.exec()
    if(result.length!=0)
        return false
    return true
}

function getNextLink(str, ptr) {
    var link = ""
    for (var i = ptr; i < str.length; i++) {
        if (str[i] == 'h' && str[i + 1] == 'r' && str[i + 2] == 'e' && str[i + 3] == 'f') {

            while (str[i] != '\"') {
                ++i;
            }
            ++i;
            while (str[i] != '\"') {
                link += str[i]
                i++;
            }
            break;
        }
    }
    ptr = i + 1;
    //console.log(link)
    data = {
        ptr: ptr,
        link: link
    }
    return data;
}

async function extractLinks(str, max_url_count) {

    var ptr = 0;
    cnt = 0;
    var ret_list = []
    while (ptr < str.length) {
        data = getNextLink(str, ptr)
        if (await checkLink(data.link)) {
            cnt++
            ret_list.push(data.link)
        }
        ptr = data.ptr
        if (cnt == max_url_count)
            break
    }
    // console.log(ret_list)    
    return ret_list
}

async function saveFirstlevel() {
    var newUrlDetails = new urlDetails({
        level: 1,
        url_list: baseUrl,
        completed: 0
    })
    await newUrlDetails.save()
}

//level = 1;
async function getLevel() {
    query = urlDetails.findOne({ completed: 0 }).sort('level');
    const result = await query.exec()
    if (result == null)
        return 0
    return result.level
}

async function getCurrentLevelLinks(level) {
    query = urlDetails.findOne({ level: level })
    const result = await query.exec()
    return result.url_list
}

async function saveNextLevelLinks(url_list, level, completed) {
    query = urlDetails.findOne({ level: level + 1 })
    result = await query.exec()
    if (result == null) {
        var newUrlDetails = new urlDetails({
            level: level + 1,
            url_list: url_list,
            completed: 0
        })
        await newUrlDetails.save()
    }
    else {
        old_url_list = result.url_list
        for (url of url_list) {
            old_url_list.push(url)
        }
        query = urlDetails.updateOne({ level: level + 1 }, { $set: { url_list: old_url_list } })
        result = await query.exec()
    }
    if (completed == 1) {
        query = urlDetails.updateOne({ level: level }, { $set: { completed: completed } })
        result = await query.exec()
    }
}

//----------------Start-------------------------
async function start() {

    level = await getLevel()
    if(level == 0)
    {
        await saveFirstlevel()
        level++
    }
    else if(level == maxLevel){
        console.log('Crawler Completed')
        exit(0);
    }
    console.log(level)

    currentLevelLinks = await getCurrentLevelLinks(level)
    //console.log(currentLevelLinks)

    var completed = 0
    for(let i =0 ;i<currentLevelLinks.length;i++){

            await fetch(currentLevelLinks[i])
            .then(
                async function(response){
                    if(response.status!=200){
                        console.log('Something Wrong')
                    return ;
                    }
                    await response.text().then(async function(data){
                        var plain_string=data.replace(/\s/g, "")
                        var url_list = await extractLinks(plain_string, maxExtractedUrl)
                        if(currentLevelLinks.length-1 == i){
                                completed = 1
                            }
                        await saveNextLevelLinks(url_list, level, completed)
                    })
                });
    }
    if(completed == 1)
        start();
}

var maxExtractedUrl = 100
var maxLevel = 3;
start();